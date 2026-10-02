# Qwen Code

## Consultation

Install the repo as a Qwen extension or add the `ask-chatgpt` skill directory to your trusted skills. Configure a stdio MCP server with command `chatgpt-as-provider` and args `["mcp"]`. Sign in once with `chatgpt-as-provider login`.

## Provider

Qwen's custom OpenAI-compatible route can use the OpenAI gateway:

```sh
CHATGPT_PROVIDER_GATEWAY_TOKEN='<local-token>' chatgpt-as-provider serve --protocol openai
```

Add a `modelProviders.openai` model using `baseUrl: "http://127.0.0.1:8765/v1"`, `envKey: "CHATGPT_PROVIDER_GATEWAY_TOKEN"`, and the model id from `chatgpt-as-provider models`. Select the route explicitly with `/model`. Save the prior `settings.json` first; restore that copy to uninstall. Qwen model/provider config is distinct from its OAuth login.

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
