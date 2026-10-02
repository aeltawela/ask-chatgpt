# Pi

Add `skills/ask-chatgpt` to Pi's skill search path. For a native Pi tool, install the adapter with `pi -e /path/to/chatgpt-as-provider/integrations/pi/ask-chatgpt.ts`. It calls the shared CLI through argument-safe process spawning and leaves Pi in charge of all other tools. Sign in with `chatgpt-as-provider login`.

For provider mode, Pi's OpenAI-compatible model configuration can target `http://127.0.0.1:8765/v1` while `chatgpt-as-provider serve --protocol openai` is running. Supply the local gateway token in Pi's private environment/credential mechanism; never put it in a checked-in `models.json`. Add a model id returned by `chatgpt-as-provider models` and explicitly select it. Restore the saved Pi configuration to uninstall.
