import { ask } from './core.mjs';
function fromOpenAI(body) {
  const history = (body.messages || []).filter(m => m.role !== 'system' && m.role !== 'developer').flatMap(m => {
    if (m.role === 'tool') return [{ type: 'function_call_output', call_id: m.tool_call_id, output: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }];
    if (m.role === 'assistant' && m.tool_calls) return [...(typeof m.content === 'string' && m.content ? [{ role: 'assistant', content: [{ type: 'output_text', text: m.content }] }] : []), ...m.tool_calls.map(t => ({ type: 'function_call', call_id: t.id, name: t.function.name, arguments: t.function.arguments }))];
    const content = typeof m.content === 'string' ? [{ type: m.role === 'assistant' ? 'output_text' : 'input_text', text: m.content }] : (m.content || []).map(c => {
      if (c.type === 'text') return { type: m.role === 'assistant' ? 'output_text' : 'input_text', text: c.text };
      if (c.type === 'image_url') return { type: 'input_image', image_url: typeof c.image_url === 'string' ? c.image_url : c.image_url?.url, detail: c.image_url?.detail };
      if (c.type === 'file') return { type: 'input_file', file_id: c.file?.file_id, file_data: c.file?.file_data, filename: c.file?.filename };
      return c;
    });
    return [{ role: m.role, content }];
  });
  const instructions = (body.messages || []).filter(m => m.role === 'system' || m.role === 'developer').map(m => typeof m.content === 'string' ? m.content : '').join('\n');
  const tools = (body.tools || []).filter(t => t.type === 'function').map(t => ({ type: 'function', name: t.function.name, description: t.function.description || '', parameters: t.function.parameters || { type: 'object', properties: {} } }));
  const webSearch = (body.tools || []).some(t => t.type === 'web_search' || t.type === 'web_search_preview');
  return { history, instructions, tools, webSearch, model: body.model, reasoning: body.reasoning_effort || 'auto', text: body.response_format?.type === 'json_schema' ? { format: { type: 'json_schema', ...body.response_format.json_schema } } : body.response_format?.type === 'json_object' ? { format: { type: 'json_object' } } : undefined };
}
function toOpenAI(result, id, stream = false) {
  const message = { role: 'assistant', content: result.text || null };
  if (result.toolCalls.length) message.tool_calls = result.toolCalls.map(t => ({ id: t.id, type: 'function', function: { name: t.name, arguments: typeof t.arguments === 'string' ? t.arguments : JSON.stringify(t.arguments) } }));
  const base = { id, object: 'chat.completion', created: Math.floor(Date.now() / 1000), model: result.model, choices: [{ index: 0, message, finish_reason: result.toolCalls.length ? 'tool_calls' : 'stop' }], usage: result.usage ? { prompt_tokens: result.usage.input_tokens || 0, completion_tokens: result.usage.output_tokens || 0, total_tokens: result.usage.total_tokens || 0 } : undefined };
  if (!stream) return base;
  return `data: ${JSON.stringify({ id, object: 'chat.completion.chunk', created: base.created, model: result.model, choices: [{ index: 0, delta: { role: 'assistant', ...message, tool_calls: message.tool_calls }, finish_reason: null }] })}\n\ndata: ${JSON.stringify({ id, object: 'chat.completion.chunk', choices: [{ index: 0, delta: {}, finish_reason: result.toolCalls.length ? 'tool_calls' : 'stop' }] })}\n\ndata: [DONE]\n\n`;
}
function fromAnthropic(body) {
  const history = (body.messages || []).flatMap(m => { const role = m.role === 'assistant' ? 'assistant' : 'user'; const blocks = Array.isArray(m.content) ? m.content : [{ type: 'text', text: String(m.content) }]; return blocks.flatMap(c => { if (c.type === 'tool_result') return [{ type: 'function_call_output', call_id: c.tool_use_id, output: typeof c.content === 'string' ? c.content : JSON.stringify(c.content) }]; if (c.type === 'tool_use') return [{ type: 'function_call', call_id: c.id, name: c.name, arguments: JSON.stringify(c.input || {}) }]; if (c.type === 'image' && c.source?.type === 'base64') return [{ role: 'user', content: [{ type: 'input_image', image_url: `data:${c.source.media_type};base64,${c.source.data}` }] }]; if (c.type === 'document' && c.source?.type === 'base64') return [{ role: 'user', content: [{ type: 'input_file', file_data: `data:${c.source.media_type};base64,${c.source.data}`, filename: c.title || 'attachment' }] }]; return c.type === 'text' ? [{ role, content: [{ type: role === 'assistant' ? 'output_text' : 'input_text', text: c.text }] }] : []; }); });
  const webSearch = (body.tools || []).some(t => String(t.type || '').startsWith('web_search'));
  const tools = (body.tools || []).filter(t => !String(t.type || '').startsWith('web_search')).map(t => ({ type: 'function', name: t.name, description: t.description || '', parameters: t.input_schema || { type: 'object', properties: {} } }));
  return { history, instructions: body.system, tools, webSearch, model: body.model, reasoning: body.thinking?.budget_tokens > 12000 ? 'high' : body.thinking?.budget_tokens > 4000 ? 'medium' : 'auto' };
}
function toAnthropic(result, id) {
  const content = []; if (result.text) content.push({ type: 'text', text: result.text });
  for (const t of result.toolCalls) { let input = {}; try { input = typeof t.arguments === 'string' ? JSON.parse(t.arguments) : t.arguments; } catch {} content.push({ type: 'tool_use', id: t.id, name: t.name, input }); }
  return { id, type: 'message', role: 'assistant', model: result.model, content, stop_reason: result.toolCalls.length ? 'tool_use' : 'end_turn', stop_sequence: null, usage: { input_tokens: result.usage?.input_tokens || 0, output_tokens: result.usage?.output_tokens || 0 } };
}
function fromGemini(body) {
  const history = (body.contents || []).flatMap(c => ({ role: c.role === 'model' ? 'assistant' : 'user', content: (c.parts || []).flatMap(p => p.text !== undefined ? [{ type: c.role === 'model' ? 'output_text' : 'input_text', text: p.text }] : p.inlineData ? [{ type: 'input_image', image_url: `data:${p.inlineData.mimeType};base64,${p.inlineData.data}` }] : p.fileData ? (() => { throw new Error('Gemini Files API references are not supported by the ChatGPT OAuth route. Attach the file through ask-chatgpt or the shared CLI.'); })() : p.functionCall ? [{ type: 'function_call', call_id: p.functionCall.id || `${p.functionCall.name}-${Date.now()}`, name: p.functionCall.name, arguments: JSON.stringify(p.functionCall.args || {}) }] : p.functionResponse ? [{ type: 'function_call_output', call_id: p.functionResponse.id || `${p.functionResponse.name}-${Date.now()}`, output: JSON.stringify(p.functionResponse.response || {}) }] : [p]) }));
  const declarations = body.tools?.flatMap(t => t.functionDeclarations || []) || [];
  const tools = declarations.map(t => ({ type: 'function', name: t.name, description: t.description || '', parameters: t.parameters || { type: 'object', properties: {} } }));
  const webSearch = (body.tools || []).some(t => t.googleSearch || t.googleSearchRetrieval);
  const budget = body.generationConfig?.thinkingConfig?.thinkingBudget;
  return { history, instructions: body.systemInstruction?.parts?.map(p => p.text).join('\n'), tools, webSearch, model: body.model, reasoning: budget > 12000 ? 'high' : budget > 4000 ? 'medium' : budget > 0 ? 'low' : 'auto' };
}
function toGemini(result) {
  const parts = []; if (result.text) parts.push({ text: result.text });
  for (const t of result.toolCalls) { let args = {}; try { args = typeof t.arguments === 'string' ? JSON.parse(t.arguments) : t.arguments; } catch {} parts.push({ functionCall: { name: t.name, args } }); }
  return { candidates: [{ content: { role: 'model', parts }, finishReason: result.toolCalls.length ? 'TOOL_CALL' : 'STOP' }], usageMetadata: result.usage ? { promptTokenCount: result.usage.input_tokens, candidatesTokenCount: result.usage.output_tokens, totalTokenCount: result.usage.total_tokens } : undefined, modelVersion: result.model };
}
export async function adaptRequest(protocol, body, options = {}) {
  if (protocol === 'openai') return { result: await ask({ ...fromOpenAI(body), ...options }), formatter: result => toOpenAI(result, `chatcmpl-${result.responseId || Date.now()}`, Boolean(body.stream)) };
  if (protocol === 'anthropic') return { result: await ask({ ...fromAnthropic(body), ...options }), formatter: toAnthropic };
  if (protocol === 'gemini') return { result: await ask({ ...fromGemini(body), ...options }), formatter: toGemini };
  throw new Error(`Unknown provider protocol: ${protocol}`);
}
export { fromOpenAI, toOpenAI, fromAnthropic, toAnthropic, fromGemini, toGemini };
