# Gemini CLI

Install the Gemini extension containing the `ask-chatgpt` skill and configure stdio MCP as `chatgpt-as-provider mcp`. Sign in using the CLI.

For provider mode, start `chatgpt-as-provider serve --protocol gemini` and set `GOOGLE_GEMINI_BASE_URL=http://127.0.0.1:8765` plus `GEMINI_API_KEY` to the gateway token in the local launch environment. Select a model returned by `chatgpt-as-provider models`. Save the previous Gemini environment/settings before setup and restore it to uninstall. The Gemini protocol adapter maps text, image input, function calls, reasoning hints and Google Search requests. Google-hosted Files API URIs and Gemini structured-output settings are not currently translated; attach local files through the shared MCP/CLI path or use a harness with an accepted file form.
