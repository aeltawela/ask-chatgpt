#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { signIn, signInWithManualToken, signOut } from './oauth.mjs';
import { ask, listModels, getSavedSessions, deleteSavedSession, exportSavedSession, availableAccounts, limits } from './core.mjs';
import { serveMcp } from './mcp.mjs';
import { startGateway } from './gateway.mjs';

function parse(argv) {
  const [command = 'help', ...args] = argv; const flags = {};
  for (let i = 0; i < args.length; i++) { const a = args[i]; if (!a.startsWith('--')) { (flags._ ||= []).push(a); continue; } const k = a.slice(2); if (['persist', 'json', 'no-browser', 'new-account', 'manual-token', 'web-search'].includes(k)) flags[k] = true; else if (i + 1 < args.length) flags[k] = args[++i]; else throw new Error(`Missing value for --${k}`); }
  return { command, flags };
}
async function inputQuestion(flags) {
  if (flags.question) return flags.question;
  if (process.stdin.isTTY) { const rl = createInterface({ input: process.stdin, output: process.stdout }); try { return (await rl.question('Question (temporary unless --persist is set): ')).trim(); } finally { rl.close(); } }
  const chunks = []; for await (const chunk of process.stdin) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString('utf8').trim(); if (!text) throw new Error('Supply --question or pipe a question to stdin.'); return text;
}
function print(value) { process.stdout.write(`${typeof value === 'string' ? value : JSON.stringify(value, null, 2)}\n`); }
async function readSecret(prompt) {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') throw new Error('Manual token entry requires an interactive terminal. Start `node <plugin-directory>/src/cli.mjs login --manual-token` in your terminal; never pass a token as an argument or environment variable.');
  process.stderr.write(prompt);
  return new Promise((resolve, reject) => {
    let value = '';
    const wasRaw = process.stdin.isRaw;
    const finish = (error) => { process.stdin.off('data', onData); process.stdin.setRawMode(Boolean(wasRaw)); process.stdin.pause(); process.stderr.write('\n'); error ? reject(error) : resolve(value); };
    const onData = chunk => {
      for (const byte of chunk) {
        if (byte === 3) return finish(new Error('Manual token entry cancelled.'));
        if (byte === 13 || byte === 10) return finish();
        if (byte === 8 || byte === 127) value = value.slice(0, -1);
        else if (byte >= 32) value += String.fromCharCode(byte);
      }
    };
    process.stdin.setRawMode(true); process.stdin.resume(); process.stdin.on('data', onData);
  });
}
async function main() {
  const { command, flags } = parse(process.argv.slice(2));
  if (command === 'login') {
    const account = flags['manual-token']
      ? await signInWithManualToken(await readSecret('Paste access token (hidden input): '), { label: flags.label || null })
      : await signIn({ launchBrowser: !flags['no-browser'], newAccount: Boolean(flags['new-account']), accountSubject: flags.account });
    print({ signed_in: true, ...account }); return;
  }
  if (command === 'logout') { await signOut(flags.account); print('Signed out. Local credentials removed.'); return; }
  if (command === 'accounts') { print(await availableAccounts()); return; }
  if (command === 'models') { print(await listModels({ subject: flags.account })); return; }
  if (command === 'ask') {
    const question = await inputQuestion(flags); const attachments = [];
    for (const file of String(flags.file || '').split(',').filter(Boolean)) { const bytes = await readFile(file); const ext = file.split('.').pop().toLowerCase(); if (['png','jpg','jpeg','webp','gif'].includes(ext)) attachments.push({ type: 'input_image', image_url: `data:${ext === 'jpg' ? 'image/jpeg' : `image/${ext}`};base64,${bytes.toString('base64')}` }); else attachments.push({ type: 'input_file', filename: file.split('/').pop(), file_data: `data:application/octet-stream;base64,${bytes.toString('base64')}` }); }
    const result = await ask({ question: attachments.length ? [{ type: 'input_text', text: question }, ...attachments] : question, subject: flags.account, model: flags.model, reasoning: flags.reasoning || 'auto', callerEffort: flags['caller-effort'], taskDifficulty: flags['task-difficulty'], webSearch: Boolean(flags['web-search']), persist: Boolean(flags.persist), sessionId: flags.session }); print(flags.json ? result : result.text); return;
  }
  if (command === 'saved') { print(await getSavedSessions({ subject: flags.account })); return; }
  if (command === 'delete') { print({ deleted: await deleteSavedSession(flags.session || flags._?.[0], { subject: flags.account }) }); return; }
  if (command === 'export') { print(await exportSavedSession(flags.session || flags._?.[0], { subject: flags.account })); return; }
  if (command === 'mcp') return serveMcp();
  if (command === 'serve') return startGateway({ protocol: flags.protocol || 'openai', port: flags.port ? Number(flags.port) : undefined });
  if (command === 'capabilities') { print(limits); return; }
  print(`ask-chatgpt <login|logout|accounts|models|ask|saved|delete|export|mcp|serve|capabilities>\n\nlogin: [--account SUBJECT] [--new-account] [--no-browser] [--manual-token] [--label NAME]\nask: [--question TEXT] [--model ID] [--reasoning auto|low|medium|high] [--web-search] [--persist] [--session ID] [--file PATH[,PATH...]] [--json]\nserve: --protocol openai|anthropic|gemini [--port PORT]\nData directory: ${process.env.ASK_CHATGPT_HOME || process.env.CHATGPT_PROVIDER_HOME || '~/.config/ask-chatgpt'}`);
}
main().catch(error => { process.stderr.write(`ask-chatgpt: ${error.message}\n`); process.exitCode = 1; });
