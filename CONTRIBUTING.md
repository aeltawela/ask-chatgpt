# Contributing

Use Node.js 22 or newer. Run `npm test` and `npm run check`. Tests must use mocked OAuth credentials and mocked Responses events; never consume an account's ChatGPT plan as part of CI. Keep credentials, personal transcripts, and raw private prompts out of fixtures and commits. Document provider/client compatibility changes in `docs/compatibility.md` and update the relevant integration guide. New clients should use the shared core and add a conformance test rather than reimplementing OAuth or session handling.
