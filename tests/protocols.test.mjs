import test from 'node:test';
import assert from 'node:assert/strict';
import { fromOpenAI, toOpenAI, fromAnthropic, toAnthropic, fromGemini, toGemini } from '../src/protocols.mjs';
const result = { responseId: 'resp-1', text: 'ok', model: 'gpt-test', toolCalls: [{ id: 'call-1', name: 'lookup', arguments: '{"x":1}' }], usage: { input_tokens: 4, output_tokens: 2, total_tokens: 6 } };
test('OpenAI adapter maps instructions, tools, schema and tool result history', () => {
  const req = fromOpenAI({ model: 'gpt-test', response_format: { type: 'json_object' }, messages: [{ role: 'system', content: 'rules' }, { role: 'user', content: 'question' }, { role: 'assistant', tool_calls: [{ id: 'c1', function: { name: 'find', arguments: '{"q":"x"}' } }] }, { role: 'tool', tool_call_id: 'c1', content: 'found' }], tools: [{ type: 'function', function: { name: 'find', parameters: { type: 'object' } } }] });
  assert.equal(req.instructions, 'rules'); assert.deepEqual(req.text, { format: { type: 'json_object' } }); assert.equal(req.tools[0].name, 'find'); assert.equal(req.history[1].type, 'function_call'); assert.equal(req.history[2].type, 'function_call_output');
  const out = toOpenAI(result, 'id'); assert.equal(out.choices[0].finish_reason, 'tool_calls'); assert.equal(out.choices[0].message.tool_calls[0].id, 'call-1');
  assert.match(toOpenAI(result, 'id', true), /data: \[DONE\]/);
});
test('OpenAI and Anthropic content adapters translate images and hosted search', () => {
  const o = fromOpenAI({ messages: [{ role: 'user', content: [{ type: 'image_url', image_url: { url: 'data:image/png;base64,AA==', detail: 'high' } }] }], tools: [{ type: 'web_search_preview' }] });
  assert.equal(o.history[0].content[0].type, 'input_image'); assert.equal(o.history[0].content[0].detail, 'high'); assert.equal(o.webSearch, true);
  const a = fromAnthropic({ messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: 'AA==' } }] }], tools: [{ type: 'web_search_20250305' }] });
  assert.equal(a.history[0].content[0].type, 'input_image'); assert.equal(a.history[0].role, 'user'); assert.equal(a.webSearch, true);
});
test('Anthropic adapter maps tool use and result through a stable call id', () => {
  const req = fromAnthropic({ system: 'rules', model: 'gpt-test', messages: [{ role: 'assistant', content: [{ type: 'tool_use', id: 't1', name: 'lookup', input: { x: 1 } }] }, { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't1', content: 'found' }] }], tools: [{ name: 'lookup', input_schema: { type: 'object' } }] });
  assert.equal(req.instructions, 'rules'); assert.equal(req.history[0].type, 'function_call'); assert.equal(req.history[1].call_id, 't1');
  const out = toAnthropic(result, 'msg-1'); assert.equal(out.stop_reason, 'tool_use'); assert.equal(out.content[1].input.x, 1);
});
test('Gemini adapter maps image and function call/result contents', () => {
  const req = fromGemini({ model: 'gpt-test', systemInstruction: { parts: [{ text: 'rules' }] }, contents: [{ role: 'user', parts: [{ text: 'look' }, { inlineData: { mimeType: 'image/png', data: 'YWJj' } }] }, { role: 'model', parts: [{ functionCall: { name: 'lookup', args: { x: 1 }, id: 'g1' } }] }, { role: 'user', parts: [{ functionResponse: { name: 'lookup', id: 'g1', response: { ok: true } } }] }], tools: [{ functionDeclarations: [{ name: 'lookup', parameters: { type: 'object' } }] }] });
  assert.equal(req.instructions, 'rules'); assert.equal(req.history[0].content[1].type, 'input_image'); assert.equal(req.history[1].content[0].type, 'function_call'); assert.equal(req.history[2].content[0].call_id, 'g1');
  const out = toGemini(result); assert.equal(out.candidates[0].content.parts[1].functionCall.name, 'lookup');
});
