---
description: Ask ChatGPT directly through the bundled MCP tool.
---

Consult ChatGPT for this user request: {{args}}

Call the bundled MCP `ask_chatgpt` tool directly. Do not invoke the Skill tool or delegate to another skill. If sign-in is needed, use `chatgpt_login` and its browser login workflow. Keep `persist: false` unless the user explicitly requests a saved session.

Choose the minimum useful `caller_effort`: low for simple questions, medium for ordinary coding or analysis, high for demanding reasoning. Leave `model` unset to use Luna. Set `task_difficulty: highly_difficult` only for exceptional research, complex proofs, or deeply coupled problems requiring Astra; high effort by itself must not select Astra. Honor an explicitly requested model.

Return the answer, citations, model and reasoning effort. Keep tool execution and approvals with this agent. Report failures clearly without automatically replaying uncertain requests. Never ask ChatGPT to call this consultation tool recursively.
