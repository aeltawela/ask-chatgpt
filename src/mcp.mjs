import { createInterface } from 'node:readline';
import { ask, listModels, getSavedSessions, deleteSavedSession, exportSavedSession } from './core.mjs';
import { availableAccounts } from './core.mjs';

const tools = [
  { name: 'ask_chatgpt', description: 'Ask ChatGPT a question. Conversations are temporary unless persist=true.', inputSchema: { type: 'object', properties: { question: { type: 'string' }, attachments: { type: 'array', items: { type: 'object', properties: { type: { type: 'string', enum: ['input_image', 'input_file'] }, image_url: { type: 'string' }, file_id: { type: 'string' }, file_data: { type: 'string' }, filename: { type: 'string' } }, required: ['type'] } }, conversation_id: { type: 'string' }, persist: { type: 'boolean' }, model: { type: 'string' }, reasoning: { type: 'string', enum: ['auto', 'low', 'medium', 'high'] }, caller_effort: { type: 'string', enum: ['low', 'medium', 'high'] }, web_search: { type: 'boolean' }, tools: { type: 'array', items: { type: 'object' } }, features: { type: 'array', items: { type: 'string' } } }, required: ['question'] } },
  { name: 'chatgpt_models', description: 'List models visible to the signed-in ChatGPT account.', inputSchema: { type: 'object', properties: {} } },
  { name: 'chatgpt_saved_sessions', description: 'List explicitly saved ChatGPT sessions.', inputSchema: { type: 'object', properties: {} } },
  { name: 'chatgpt_delete_session', description: 'Delete an explicitly saved ChatGPT session.', inputSchema: { type: 'object', properties: { session_id: { type: 'string' } }, required: ['session_id'] } },
  { name: 'chatgpt_export_session', description: 'Export an explicitly saved ChatGPT session as JSON.', inputSchema: { type: 'object', properties: { session_id: { type: 'string' } }, required: ['session_id'] } }
];
function result(id, value) { return { jsonrpc: '2.0', id, result: value }; }
function failure(id, message) { return { jsonrpc: '2.0', id, error: { code: -32000, message } }; }
export async function dispatchMcp(message) {
  const { id, method, params = {} } = message;
  if (method === 'initialize') return result(id, { protocolVersion: params.protocolVersion || '2025-03-26', capabilities: { tools: {} }, serverInfo: { name: 'chatgpt-as-provider', version: '0.1.0' } });
  if (method === 'notifications/initialized' || method?.startsWith('notifications/')) return null;
  if (method === 'ping') return result(id, {});
  if (method === 'tools/list') return result(id, { tools });
  if (method !== 'tools/call') return failure(id, `Unsupported MCP method: ${method}`);
  const a = params.arguments || {};
  try {
    let value;
    switch (params.name) {
      case 'ask_chatgpt': value = await ask({ question: a.attachments?.length ? [{ type: 'input_text', text: a.question }, ...a.attachments] : a.question, sessionId: a.conversation_id, persist: a.persist === true, model: a.model, reasoning: a.reasoning || 'auto', callerEffort: a.caller_effort, webSearch: a.web_search === true, tools: a.tools || [], features: a.features || [] }); break;
      case 'chatgpt_models': value = await listModels(); break;
      case 'chatgpt_saved_sessions': value = await getSavedSessions(); break;
      case 'chatgpt_delete_session': value = { deleted: await deleteSavedSession(a.session_id) }; break;
      case 'chatgpt_export_session': value = JSON.parse(await exportSavedSession(a.session_id)); break;
      default: return failure(id, `Unknown tool: ${params.name}`);
    }
    const text = JSON.stringify(value);
    return result(id, { content: [{ type: 'text', text }], structuredContent: value, isError: false });
  } catch (error) { return result(id, { content: [{ type: 'text', text: error.message }], isError: true }); }
}
export async function serveMcp({ input = process.stdin, output = process.stdout } = {}) {
  const rl = createInterface({ input, crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    try { const response = await dispatchMcp(JSON.parse(line)); if (response) output.write(`${JSON.stringify(response)}\n`); }
    catch (error) { process.stderr.write(`Invalid MCP request: ${error.message}\n`); }
  }
}
