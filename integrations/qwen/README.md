# Qwen Code

Install the encapsulated extension with Qwen's extension manager; the package includes the shared core, both skills, and its MCP server, so no global npm install or hand-edited MCP setting is needed:

```sh
qwen extensions install https://github.com/aeltawela/chatgpt-as-provider
```

Restart Qwen and call the plugin's `chatgpt_login` tool once. It opens the official ChatGPT sign-in page and completes the localhost callback. Do not use Qwen's MCP-server OAuth action for this local server; that action is for remote MCP servers that publish OAuth discovery metadata. Update with `qwen extensions update chatgpt-as-provider`; uninstall with `qwen extensions uninstall chatgpt-as-provider`.

If the browser callback is unavailable, use the local hidden-input fallback from the installed extension directory: `node <extension-directory>/src/cli.mjs login --manual-token`. Never put a token in chat, shell history, command arguments, settings, or a tool call.

## Provider

Qwen's custom OpenAI-compatible route can use the OpenAI gateway:

```sh
CHATGPT_PROVIDER_GATEWAY_TOKEN='<local-token>' node <extension-directory>/src/cli.mjs serve --protocol openai
```

Add a `modelProviders.openai` model using `baseUrl: "http://127.0.0.1:8765/v1"`, `envKey: "CHATGPT_PROVIDER_GATEWAY_TOKEN"`, and the model id from the `chatgpt_models` tool. Select the route explicitly with `/model`. Save the prior `settings.json` first; restore that copy to uninstall. Qwen model/provider config is distinct from its OAuth login.

Example model entry (merge it into your existing `settings.json` rather than replacing unrelated fields):

```json
{
  "modelProviders": {
    "openai": [{
      "id": "<model-id-from-chatgpt-as-provider-models>",
      "name": "ChatGPT OAuth",
      "baseUrl": "http://127.0.0.1:8765/v1",
      "envKey": "CHATGPT_PROVIDER_GATEWAY_TOKEN",
      "wireApi": "chat-completions"
    }]
  }
}
```
