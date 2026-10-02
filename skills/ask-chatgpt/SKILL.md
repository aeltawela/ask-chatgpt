---
name: ask-chatgpt
description: Ask ChatGPT for a second opinion while keeping the current agent in control. Use when the user asks for another model's view or an independent check.
---

# Ask ChatGPT

Use the `ask_chatgpt` MCP tool or `chatgpt-as-provider ask` for a focused second opinion. Include only the context needed to answer; keep the local conversation temporary unless the user requests saving it. State the selected model and reasoning effort when reporting the answer. Preserve citations and label uncertainty. ChatGPT may return tool requests; ask the host to approve and run them, then return results through the same conversation ID. Never claim a temporary session is available after its process exits.

The OAuth flow does not expose ChatGPT history and supports fewer features than the ChatGPT app. Check `chatgpt-as-provider capabilities` when a requested feature may be unsupported. The calling client may retain its own transcript independently.
