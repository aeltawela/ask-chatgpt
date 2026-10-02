import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dispatchMcp } from '../src/mcp.mjs';
import { startGateway, makeGatewayToken } from '../src/gateway.mjs';
import { limits, validateCapabilities } from '../src/core.mjs';
import { toOpenAI, toAnthropic, toGemini } from '../src/protocols.mjs';
test('MCP publishes each consultation and session tool', async () => {
  const init=await dispatchMcp({jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-03-26'}}); assert.equal(init.result.serverInfo.name,'chatgpt-as-provider');
  const list=await dispatchMcp({jsonrpc:'2.0',id:2,method:'tools/list'}); assert.deepEqual(list.result.tools.map(t=>t.name),['ask_chatgpt','chatgpt_models','chatgpt_saved_sessions','chatgpt_delete_session','chatgpt_export_session']);
});
test('OAuth capability registry is explicit and rejects unsupported features', () => { assert.ok(limits.supported.includes('web_search')); assert.ok(limits.unsupported.includes('code_interpreter')); assert.throws(()=>validateCapabilities({features:['audio']}),/Unsupported/); });
test('provider gateway is loopback-only and protects inference routes with a token', async t => {
  const token=makeGatewayToken(), {server,port}=await startGateway({protocol:'openai',port:0,token}); t.after(()=>new Promise(r=>server.close(r)));
  const base=`http://127.0.0.1:${port}`; assert.deepEqual(await (await fetch(base+'/health')).json(),{ok:true});
  const rejected=await fetch(base+'/v1/chat/completions',{method:'POST',body:'{}'}); assert.equal(rejected.status,401);
  const accepted=await fetch(base+'/v1/chat/completions',{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:'{}'}); assert.equal(accepted.status,502); assert.match((await accepted.json()).error.message,/No ChatGPT account/);
  await assert.rejects(startGateway({protocol:'openai',port:0,token,host:'0.0.0.0'}),/loopback/);
});
test('provider gateways stream text deltas for each client protocol', async t => {
  for (const [protocol, request, path, formatter] of [
    ['openai', { model: 'gpt-test', messages: [{ role: 'user', content: 'hi' }], stream: true }, '/v1/chat/completions', toOpenAI],
    ['anthropic', { model: 'gpt-test', messages: [{ role: 'user', content: 'hi' }], stream: true }, '/v1/messages', toAnthropic],
    ['gemini', { contents: [{ role: 'user', parts: [{ text: 'hi' }] }] }, '/v1beta/models/gpt-test:streamGenerateContent', toGemini]
  ]) {
    const token=makeGatewayToken();
    const handleRequest=async(_protocol,_body,opts)=>{ opts.onEvent({type:'metadata',model:'gpt-test'}); opts.onEvent({type:'text_delta',text:'hello '}); opts.onEvent({type:'text_delta',text:'world'}); const result={responseId:'r1',text:'hello world',model:'gpt-test',toolCalls:[],usage:{input_tokens:1,output_tokens:2,total_tokens:3}}; return {result,formatter}; };
    const {server,port}=await startGateway({protocol,port:0,token,handleRequest}); t.after(()=>new Promise(r=>server.close(r)));
    const response=await fetch(`http://127.0.0.1:${port}${path}`,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify(request)}); const data=await response.text(); assert.equal(response.status,200); assert.match(data,/hello /); assert.match(data,/world/);
  }
});
test('all five integration guides reference both consultation and provider paths', async () => {
  for (const client of ['qwen','opencode','pi','gemini','claude']) { const guide=await readFile(new URL(`../integrations/${client}/README.md`,import.meta.url),'utf8'); assert.match(guide,/Consultation|ask-chatgpt|MCP|skill/); assert.match(guide,/Provider|provider mode/); }
});
