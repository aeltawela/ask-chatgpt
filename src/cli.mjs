#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { signIn, signOut } from './oauth.mjs';
import { ask, listModels, getSavedSessions, deleteSavedSession, exportSavedSession, availableAccounts, limits } from './core.mjs';
import { serveMcp } from './mcp.mjs';
import { startGateway } from './gateway.mjs';

function parse(argv) {
  const [command = 'help', ...args] = argv; const flags = {};
  for (let i = 0; i < args.length; i++) { const a = args[i]; if (!a.startsWith('--')) { (flags._ ||= []).push(a); continue; } const k = a.slice(2); if (['persist', 'json', 'no-browser', 'new-account', 'web-search'].includes(k)) flags[k] = true; else if (i + 1 < args.length) flags[k] = args[++i]; else throw new Error(`Missing value for --${k}`); }
  return { command, flags };
}
async function inputQuestion(flags) {
  if (flags.question) return flags.question;
  if (process.stdin.isTTY) { const rl = createInterface({ input: process.stdin, output: process.stdout }); try { return (await rl.question('Question (temporary unless --persist is set): ')).trim(); } finally { rl.close(); } }
  const chunks = []; for await (const chunk of process.stdin) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString('utf8').trim(); if (!text) throw new Error('Supply --question or pipe a question to stdin.'); return text;
}
function print(value) { process.stdout.write(`${typeof value === 'string' ? value : JSON.stringify(value, null, 2)}\n`); }
async function main() {
  const { command, flags } = parse(process.argv.slice(2));
  if (command === 'login') { const account = await signIn({ launchBrowser: !flags['no-browser'], newAccount: Boolean(flags['new-account']) }); print({ signed_in: true, ...account }); return; }
  if (command === 'logout') { await signOut(flags.account); print('Signed out. Local credentials removed.'); return; }
  if (command === 'accounts') { print(await availableAccounts()); return; }
  if (command === 'models') { print(await listModels({ subject: flags.account })); return; }
  if (command === 'ask') {
    const question = await inputQuestion(flags); const attachments = [];
    for (const file of String(flags.file || '').split(',').filter(Boolean)) { const bytes = await readFile(file); const ext = file.split('.').pop().toLowerCase(); if (['png','jpg','jpeg','webp','gif'].includes(ext)) attachments.push({ type: 'input_image', image_url: `data:${ext === 'jpg' ? 'image/jpeg' : `image/${ext}`};base64,${bytes.toString('base64')}` }); else attachments.push({ type: 'input_file', filename: file.split('/').pop(), file_data: `data:application/octet-stream;base64,${bytes.toString('base64')}` }); }
    const result = await ask({ question: attachments.length ? [{ type: 'input_text', text: question }, ...attachments] : question, subject: flags.account, model: flags.model, reasoning: flags.reasoning || 'auto', callerEffort: flags['caller-effort'], webSearch: Boolean(flags['web-search']), persist: Boolean(flags.persist), sessionId: flags.session }); print(flags.json ? result : result.text); return;
  }
  if (command === 'saved') { print(await getSavedSessions({ subject: flags.account })); return; }
  if (command === 'delete') { print({ deleted: await deleteSavedSession(flags.session || flags._?.[0], { subject: flags.account }) }); return; }
  if (command === 'export') { print(await exportSavedSession(flags.session || flags._?.[0], { subject: flags.account })); return; }
  if (command === 'mcp') return serveMcp();
  if (command === 'serve') return startGateway({ protocol: flags.protocol || 'openai', port: flags.port ? Number(flags.port) : undefined });
  if (command === 'capabilities') { print(limits); return; }
  print(`chatgpt-as-provider <login|logout|accounts|models|ask|saved|delete|export|mcp|serve|capabilities>\n\nlogin: --new-account\nask: [--question TEXT] [--model ID] [--reasoning auto|low|medium|high] [--web-search] [--persist] [--session ID] [--file PATH[,PATH...]] [--json]\nserve: --protocol openai|anthropic|gemini [--port PORT]\nData directory: ${process.env.CHATGPT_PROVIDER_HOME || '~/.config/chatgpt-as-provider'}`);
}
main().catch(error => { process.stderr.write(`chatgpt-as-provider: ${error.message}\n`); process.exitCode = 1; });
