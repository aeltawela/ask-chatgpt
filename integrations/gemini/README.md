# Gemini CLI

Install the extension directly from the public GitHub repository:

```sh
gemini extensions install https://github.com/aeltawela/chatgpt-as-provider
```

Restart Gemini CLI and use `chatgpt_login` once to open the official browser login. The extension bundles its MCP server, skills and shared core. Update with `gemini extensions update chatgpt-as-provider`; remove with `gemini extensions uninstall chatgpt-as-provider`.

If the browser callback is unavailable, use the hidden-input fallback from the installed extension directory: `node <extension-directory>/src/cli.mjs login --manual-token`. Never put a token in chat, shell history, command arguments, settings, or a tool call.

For provider mode, start `node <extension-directory>/src/cli.mjs serve --protocol gemini` and set `GOOGLE_GEMINI_BASE_URL=http://127.0.0.1:8765` plus `GEMINI_API_KEY` to the gateway token in the local launch environment. Select a model returned by `chatgpt_models`. Save the previous Gemini environment/settings before setup and restore it to uninstall. The Gemini protocol adapter maps text, image input, function calls, reasoning hints and Google Search requests. Google-hosted Files API URIs and Gemini structured-output settings are not currently translated; attach local files through the shared MCP/CLI path or use a harness with an accepted file form.
