import { Type } from 'typebox';
import { StringEnum } from '@earendil-works/pi-ai';
import { ask, availableAccounts, listModels } from '../../src/core.mjs';
import { signIn, signOut } from '../../src/oauth.mjs';
export default function (pi) {
  pi.registerTool({
    name: 'chatgpt_login', label: 'Sign in to ChatGPT', description: 'Open the official ChatGPT browser login and validate the local callback.',
    parameters: Type.Object({ new_account: Type.Optional(Type.Boolean()), account_subject: Type.Optional(Type.String()) }),
    async execute(_id, params) {
      try { const result = { signed_in: true, ...await signIn({ launchBrowser: true, newAccount: params.new_account === true, accountSubject: params.account_subject }) }; return { content: [{ type: 'text', text: JSON.stringify(result) }], details: result }; }
      catch (error) { return { content: [{ type: 'text', text: error.message }], details: {}, isError: true }; }
    }
  });
  pi.registerTool({
    name: 'chatgpt_logout', label: 'Sign out of ChatGPT', description: 'Remove local ChatGPT credentials. Select an account or leave empty to sign out all accounts.',
    parameters: Type.Object({ account_subject: Type.Optional(Type.String()) }),
    async execute(_id, params) {
      try { await signOut(params.account_subject); const result = { signed_out: true, local_credentials_removed: true }; return { content: [{ type: 'text', text: JSON.stringify(result) }], details: result }; }
      catch (error) { return { content: [{ type: 'text', text: error.message }], details: {}, isError: true }; }
    }
  });
  pi.registerTool({
    name: 'chatgpt_accounts', label: 'List ChatGPT accounts', description: 'List signed-in accounts for account selection.',
    parameters: Type.Object({}),
    async execute() {
      try { const result = await availableAccounts(); return { content: [{ type: 'text', text: JSON.stringify(result) }], details: { accounts: result } }; }
      catch (error) { return { content: [{ type: 'text', text: error.message }], details: {}, isError: true }; }
    }
  });
  pi.registerTool({
    name: 'ask_chatgpt',
    label: 'Ask ChatGPT',
    description: 'Ask ChatGPT for a focused second opinion. Temporary unless persist is explicitly true.',
    parameters: Type.Object({
      question: Type.String({ description: 'Question to ask ChatGPT.' }),
      account_subject: Type.Optional(Type.String()),
      conversation_id: Type.Optional(Type.String()),
      persist: Type.Optional(Type.Boolean({ description: 'Save this conversation locally for later resume.' })),
      model: Type.Optional(Type.String()),
      reasoning: Type.Optional(StringEnum(['auto', 'low', 'medium', 'high'])),
      caller_effort: Type.Optional(Type.Union([Type.Literal('low'), Type.Literal('medium'), Type.Literal('high')])),
      web_search: Type.Optional(Type.Boolean()),
      tools: Type.Optional(Type.Array(Type.Record(Type.String(), Type.Unknown()))),
      features: Type.Optional(Type.Array(Type.String())),
      instructions: Type.Optional(Type.String()),
      text: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
      history: Type.Optional(Type.Array(Type.Object({ role: Type.String(), content: Type.Unknown() }))),
      attachments: Type.Optional(Type.Array(Type.Object({
        type: StringEnum(['input_image', 'input_file']),
        image_url: Type.Optional(Type.String()), file_id: Type.Optional(Type.String()), file_data: Type.Optional(Type.String()), filename: Type.Optional(Type.String())
      })))
    }),
    async execute(_id, params, signal, onUpdate) {
      try {
        const question = params.attachments?.length ? [{ type: 'input_text', text: params.question }, ...params.attachments] : params.question;
        const result = await ask({ question, history: params.history, subject: params.account_subject, sessionId: params.conversation_id, persist: params.persist === true, model: params.model, reasoning: params.reasoning || 'auto', callerEffort: params.caller_effort, webSearch: params.web_search === true, tools: params.tools || [], instructions: params.instructions, text: params.text, features: params.features || [], signal, onEvent: event => { if (event.type === 'text_delta') onUpdate?.({ content: [{ type: 'text', text: event.text }], details: { partial: true } }); } });
        return { content: [{ type: 'text', text: JSON.stringify(result) }], details: { conversationId: result.conversationId, model: result.model, reasoning: result.reasoning, usage: result.usage, citations: result.citations, toolCalls: result.toolCalls } };
      }
      catch (error) { return { content: [{ type: 'text', text: `ChatGPT consultation failed: ${error.message}` }], details: {}, isError: true }; }
    }
  });
  pi.registerTool({
    name: 'chatgpt_models', label: 'List ChatGPT models', description: 'List models visible to the signed-in ChatGPT account.',
    parameters: Type.Object({ account_subject: Type.Optional(Type.String()) }),
    async execute(_id, params) {
      try { const result = await listModels({ subject: params.account_subject }); return { content: [{ type: 'text', text: JSON.stringify(result) }], details: { models: result } }; }
      catch (error) { return { content: [{ type: 'text', text: error.message }], details: {}, isError: true }; }
    }
  });
}
