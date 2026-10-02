import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { ask, availableAccounts, listModels } from '../../src/core.mjs';
import { signIn, signOut } from '../../src/oauth.mjs';

const pluginRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const skillDefinitions = [
  { id: 'ask-chatgpt', name: 'Ask ChatGPT', description: 'Consult ChatGPT for an independent second opinion while the current agent keeps control.', file: 'skills/ask-chatgpt/SKILL.md' },
  { id: 'chatgpt-as-provider', name: 'ChatGPT as Provider', description: 'Configure and start the local ChatGPT OAuth provider gateway when explicitly requested.', file: 'skills/chatgpt-as-provider/SKILL.md' }
];

const signInTool = {
  description: 'Sign in by opening the official ChatGPT browser login. The access token is never returned to the model.',
  input: { type: 'object', properties: { new_account: { type: 'boolean' }, account_subject: { type: 'string' } }, additionalProperties: false },
  async run(args = {}) {
    return JSON.stringify({ signed_in: true, ...await signIn({ launchBrowser: true, newAccount: args.new_account === true, accountSubject: args.account_subject }) });
  }
};
const accountsTool = { description: 'List signed-in accounts so the user can choose which account to use.', input: { type: 'object', properties: {}, additionalProperties: false }, async run() { return JSON.stringify(await availableAccounts()); } };
const logoutTool = { description: 'Remove local ChatGPT credentials. Choose an account subject or leave empty to sign out all accounts.', input: { type: 'object', properties: { account_subject: { type: 'string' } }, additionalProperties: false }, async run(args = {}) { await signOut(args.account_subject); return JSON.stringify({ signed_out: true, local_credentials_removed: true }); } };
const modelsTool = { description: 'List models visible to a signed-in ChatGPT account.', input: { type: 'object', properties: { account_subject: { type: 'string' } }, additionalProperties: false }, async run(args = {}) { return JSON.stringify(await listModels({ subject: args.account_subject })); } };
const askTool = {
  description: 'Ask ChatGPT for a focused second opinion. Conversation is temporary unless persist is true.',
  input: { type: 'object', properties: {
    question: { type: 'string' }, account_subject: { type: 'string' }, conversation_id: { type: 'string' }, persist: { type: 'boolean' },
    model: { type: 'string' }, reasoning: { type: 'string', enum: ['auto', 'low', 'medium', 'high'] }, caller_effort: { type: 'string', enum: ['low', 'medium', 'high'] },
    web_search: { type: 'boolean' }, tools: { type: 'array', items: { type: 'object' } }, features: { type: 'array', items: { type: 'string' } },
    instructions: { type: 'string' }, text: { type: 'object' }, history: { type: 'array', items: { type: 'object', properties: { role: { type: 'string' }, content: {} }, required: ['role', 'content'] } },
    attachments: { type: 'array', items: { type: 'object', properties: { type: { type: 'string', enum: ['input_image', 'input_file'] }, image_url: { type: 'string' }, file_id: { type: 'string' }, file_data: { type: 'string' }, filename: { type: 'string' } }, required: ['type'] } }
  }, required: ['question'], additionalProperties: false },
  async run(args = {}, options = {}) {
    const question = args.attachments?.length ? [{ type: 'input_text', text: args.question }, ...args.attachments] : args.question;
    return JSON.stringify(await ask({ question, history: args.history, subject: args.account_subject, sessionId: args.conversation_id, persist: args.persist === true, model: args.model, reasoning: args.reasoning || 'auto', callerEffort: args.caller_effort, webSearch: args.web_search === true, tools: args.tools || [], instructions: args.instructions, text: args.text, features: args.features || [], signal: options.signal, onEvent: options.onEvent }));
  }
};

const V2Plugin = {
  id: 'chatgpt-as-provider',
  async setup(ctx) {
    const skills = await Promise.all(skillDefinitions.map(async skill => ({ ...skill, path: resolve(pluginRoot, skill.file), content: await readFile(resolve(pluginRoot, skill.file), 'utf8') })));
    await ctx.skill.transform(editor => { for (const skill of skills) editor.add(skill); });
    await ctx.tool.transform(editor => {
      for (const definition of [
        { name: 'chatgpt_login', ...signInTool },
        { name: 'chatgpt_logout', ...logoutTool },
        { name: 'chatgpt_accounts', ...accountsTool },
        { name: 'chatgpt_models', ...modelsTool },
        { name: 'ask_chatgpt', ...askTool }
      ]) editor.add({ name: definition.name, description: definition.description, input: definition.input, async execute(input, context) {
        return { content: await definition.run(input, definition === askTool ? { signal: context.signal, onEvent: event => {
          if (event.type === 'text_delta') { const pending = context.progress?.({ status: event.text }); pending?.catch?.(() => {}); }
        } } : {}) };
      } });
    });
  }
};

export const ChatGPTPlugin = async () => ({
  tool: {
    chatgpt_login: { description: signInTool.description, args: z.object({ new_account: z.boolean().optional(), account_subject: z.string().optional() }), async execute(args) { return signInTool.run(args); } },
    chatgpt_logout: { description: logoutTool.description, args: z.object({ account_subject: z.string().optional() }), async execute(args) { return logoutTool.run(args); } },
    chatgpt_accounts: { description: accountsTool.description, args: z.object({}), async execute() { return accountsTool.run(); } },
    chatgpt_models: { description: modelsTool.description, args: z.object({ account_subject: z.string().optional() }), async execute(args) { return modelsTool.run(args); } },
    ask_chatgpt: { description: askTool.description, args: z.object({ question: z.string(), account_subject: z.string().optional(), conversation_id: z.string().optional(), persist: z.boolean().optional(), model: z.string().optional(), reasoning: z.enum(['auto', 'low', 'medium', 'high']).optional(), caller_effort: z.enum(['low', 'medium', 'high']).optional(), web_search: z.boolean().optional(), tools: z.array(z.record(z.string(), z.unknown())).optional(), features: z.array(z.string()).optional(), instructions: z.string().optional(), text: z.record(z.string(), z.unknown()).optional(), history: z.array(z.object({ role: z.string(), content: z.unknown() })).optional(), attachments: z.array(z.object({ type: z.enum(['input_image', 'input_file']), image_url: z.string().optional(), file_id: z.string().optional(), file_data: z.string().optional(), filename: z.string().optional() })).optional() }), async execute(args) { return askTool.run(args); } }
  }
});

export default { ...V2Plugin, async server() { return ChatGPTPlugin(); } };
