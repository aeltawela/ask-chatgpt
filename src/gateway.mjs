import { createServer } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { adaptRequest, toAnthropic, toGemini } from './protocols.mjs';
import { listModels } from './core.mjs';

export function makeGatewayToken() { return randomBytes(32).toString('base64url'); }
function authorized(req, token) { const got = (req.headers.authorization || req.headers['x-api-key'] || req.headers['x-goog-api-key'] || '').replace(/^Bearer\s+/i, ''); const a = Buffer.from(got), b = Buffer.from(token); return a.length === b.length && timingSafeEqual(a, b); }
const openaiFrame = (id, model, delta, finish_reason = null) => `data: ${JSON.stringify({ id, object: 'chat.completion.chunk', created: Math.floor(Date.now()/1000), model, choices: [{ index: 0, delta, finish_reason }] })}\n\n`;
function sseHeaders(res) { res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' }); }
function geminiFrame(text, model, finishReason) { const candidate = { content: { role: 'model', parts: text ? [{ text }] : [] } }; if (finishReason) candidate.finishReason = finishReason; return `data: ${JSON.stringify({ candidates: [candidate], modelVersion: model })}\n\n`; }
export async function startGateway({ protocol = 'openai', port = Number(process.env.CHATGPT_PROVIDER_PORT || 8765), token = process.env.CHATGPT_PROVIDER_GATEWAY_TOKEN, host = '127.0.0.1', handleRequest = adaptRequest } = {}) {
  if (!['openai', 'anthropic', 'gemini'].includes(protocol)) throw new Error('Protocol must be openai, anthropic, or gemini.');
  if (host !== '127.0.0.1' && host !== '::1') throw new Error('Provider gateway must bind to loopback.');
  if (!token || token.length < 32) throw new Error('Set CHATGPT_PROVIDER_GATEWAY_TOKEN to a private random value of at least 32 characters.');
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://${host}`);
    if (req.method === 'GET' && url.pathname === '/health') { res.writeHead(200, { 'content-type': 'application/json' }).end('{"ok":true}'); return; }
    if (!authorized(req, token)) { res.writeHead(401, { 'content-type': 'application/json' }).end('{"error":{"message":"Unauthorized"}}'); return; }
    if (req.method === 'GET' && (url.pathname === '/v1/models' || url.pathname === '/models' || url.pathname === '/v1beta/models')) {
      try {
        const models = await listModels();
        const result = protocol === 'gemini' ? { models: models.map(m => ({ name: `models/${m.id}`, displayName: m.name, supportedGenerationMethods: ['generateContent', 'streamGenerateContent'] })) } : { data: models.map(m => ({ id: m.id, object: 'model', owned_by: 'openai' })), object: 'list' };
        res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(result));
      } catch (error) { res.writeHead(502, { 'content-type': 'application/json' }).end(JSON.stringify({ error: { message: error.message } })); }
      return;
    }
    const geminiMatch = protocol === 'gemini' && url.pathname.match(/^\/(?:v1beta\/)?models\/([^:]+):(generateContent|streamGenerateContent)$/);
    const pathMatches = protocol === 'gemini' ? geminiMatch : protocol === 'anthropic' ? url.pathname === '/v1/messages' : url.pathname === '/v1/chat/completions';
    if (req.method !== 'POST' || !pathMatches) { res.writeHead(404).end('Not found'); return; }
    let raw = ''; for await (const chunk of req) { raw += chunk; if (raw.length > 20_000_000) { res.writeHead(413).end('Request too large'); return; } }
    const streaming = protocol === 'gemini' ? geminiMatch[2] === 'streamGenerateContent' || url.searchParams.get('alt') === 'sse' : bodyStreaming(protocol, raw);
    const id = `chatcmpl-${Date.now()}`; let model = 'selected-model'; let anthropicTextStarted = false; const controller = new AbortController();
    res.on('close', () => { if (!res.writableEnded) controller.abort(); });
    try {
      const body = JSON.parse(raw); if (protocol === 'gemini') body.model = decodeURIComponent(geminiMatch[1]);
      if (streaming) {
        if (protocol === 'openai') sseHeaders(res);
        else if (protocol === 'anthropic') { model = body.model || model; sseHeaders(res); res.write(`event: message_start\ndata: ${JSON.stringify({ type: 'message_start', message: { id, type: 'message', role: 'assistant', content: [], model, stop_reason: null, stop_sequence: null, usage: { input_tokens: 0, output_tokens: 0 } } })}\n\n`); }
        else sseHeaders(res);
      }
      const onEvent = event => {
        if (event.type === 'metadata') { model = event.model; if (protocol === 'openai') res.write(openaiFrame(id, model, { role: 'assistant' })); }
        if (event.type === 'text_delta') {
          if (protocol === 'openai') res.write(openaiFrame(id, model, { content: event.text }));
          else if (protocol === 'anthropic') { if (!anthropicTextStarted) { res.write(`event: content_block_start\ndata: ${JSON.stringify({ type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } })}\n\n`); anthropicTextStarted = true; } res.write(`event: content_block_delta\ndata: ${JSON.stringify({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: event.text } })}\n\n`); }
          else res.write(geminiFrame(event.text, model));
        }
      };
      const { result, formatter } = await handleRequest(protocol, body, { onEvent, signal: controller.signal }); model = result.model;
      if (streaming) {
        if (protocol === 'openai') {
          let index = 0; for (const t of result.toolCalls) res.write(openaiFrame(id, model, { tool_calls: [{ index: index++, id: t.id, type: 'function', function: { name: t.name, arguments: typeof t.arguments === 'string' ? t.arguments : JSON.stringify(t.arguments) } }] }));
          res.write(openaiFrame(id, model, {}, result.toolCalls.length ? 'tool_calls' : 'stop')); res.end('data: [DONE]\n\n');
        } else if (protocol === 'anthropic') {
          let index = 0; if (anthropicTextStarted) { res.write(`event: content_block_stop\ndata: ${JSON.stringify({ type: 'content_block_stop', index: 0 })}\n\n`); index = 1; }
          for (const t of result.toolCalls) { const out = toAnthropic({ ...result, text: '', toolCalls: [t] }, id); const block = out.content.find(x => x.type === 'tool_use'); res.write(`event: content_block_start\ndata: ${JSON.stringify({ type: 'content_block_start', index, content_block: block })}\n\n`); res.write(`event: content_block_stop\ndata: ${JSON.stringify({ type: 'content_block_stop', index: index++ })}\n\n`); }
          const final = toAnthropic(result, id); res.write(`event: message_delta\ndata: ${JSON.stringify({ type: 'message_delta', delta: { stop_reason: final.stop_reason, stop_sequence: null }, usage: final.usage })}\n\n`); res.write(`event: message_stop\ndata: ${JSON.stringify({ type: 'message_stop' })}\n\n`); res.end();
        } else { for (const t of result.toolCalls) { const g = toGemini({ ...result, text: '', toolCalls: [t] }); res.write(`data: ${JSON.stringify(g)}\n\n`); } res.write(geminiFrame('', model, result.toolCalls.length ? 'TOOL_CALL' : 'STOP')); res.end(); }
        return;
      }
      res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(formatter(result, id)));
    } catch (error) {
      if (res.headersSent) {
        if (protocol === 'openai') { res.write(`data: ${JSON.stringify({ error: { message: error.message, type: 'upstream_error' } })}\n\n`); res.end('data: [DONE]\n\n'); }
        else if (protocol === 'anthropic') { res.write(`event: error\ndata: ${JSON.stringify({ type: 'error', error: { type: 'upstream_error', message: error.message } })}\n\n`); res.end(); }
        else { res.write(`data: ${JSON.stringify({ error: { message: error.message, status: 'UNAVAILABLE' } })}\n\n`); res.end(); }
        failed = true;
      } else res.writeHead(502, { 'content-type': 'application/json' }).end(JSON.stringify({ error: { message: error.message, type: 'upstream_error' } }));
    }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, host, resolve); });
  const addr = server.address(); console.log(`chatgpt-as-provider ${protocol} gateway listening on 127.0.0.1:${addr.port}`);
  return { server, port: addr.port };
}
function bodyStreaming(protocol, raw) { try { return JSON.parse(raw).stream === true; } catch { return false; } }
