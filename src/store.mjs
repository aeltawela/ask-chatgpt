import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { chmod, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

export const dataDir = process.env.CHATGPT_PROVIDER_HOME || join(process.env.XDG_CONFIG_HOME || join(homedir(), '.config'), 'chatgpt-as-provider');
const credentialFile = join(dataDir, 'accounts.enc');
const keyFile = join(dataDir, 'key');
const sessionFile = join(dataDir, 'sessions.enc');

async function secretKey() {
  await mkdir(dataDir, { recursive: true, mode: 0o700 });
  await chmod(dataDir, 0o700);
  try { return await readFile(keyFile); }
  catch {
    const key = randomBytes(32);
    try { await writeFile(keyFile, key, { mode: 0o600, flag: 'wx' }); }
    catch (error) { if (error.code !== 'EEXIST') throw error; return readFile(keyFile); }
    await chmod(keyFile, 0o600);
    return key;
  }
}
function seal(value, key, aad) {
  const salt = randomBytes(16), nonce = randomBytes(12), derived = scryptSync(key, salt, 32);
  const cipher = createCipheriv('aes-256-gcm', derived, nonce); cipher.setAAD(Buffer.from(aad));
  const body = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
  return JSON.stringify({ v: 1, salt: salt.toString('base64url'), nonce: nonce.toString('base64url'), tag: cipher.getAuthTag().toString('base64url'), body: body.toString('base64url') });
}
function unseal(blob, key, aad) {
  const e = JSON.parse(blob); if (e.v !== 1) throw new Error('Unsupported encrypted file version.');
  const decipher = createDecipheriv('aes-256-gcm', scryptSync(key, Buffer.from(e.salt, 'base64url'), 32), Buffer.from(e.nonce, 'base64url'));
  decipher.setAAD(Buffer.from(aad)); decipher.setAuthTag(Buffer.from(e.tag, 'base64url'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(e.body, 'base64url')), decipher.final()]).toString());
}
async function atomic(file, body) {
  const temp = `${file}.${process.pid}.${randomBytes(5).toString('hex')}.tmp`;
  await writeFile(temp, body, { mode: 0o600, flag: 'wx' }); await chmod(temp, 0o600); await rename(temp, file);
}
async function readEncrypted(file, aad, fallback) {
  try { return unseal(await readFile(file, 'utf8'), await secretKey(), aad); }
  catch (e) { if (e.code === 'ENOENT') return fallback; throw e; }
}
async function writeEncrypted(file, aad, value) { await atomic(file, seal(value, await secretKey(), aad)); }
export async function accounts() { return readEncrypted(credentialFile, 'accounts', []); }
export async function saveAccount(account) {
  const all = await accounts(); const i = all.findIndex(x => x.subject === account.subject && x.client_id === account.client_id);
  if (i < 0) all.push(account); else all[i] = account;
  await writeEncrypted(credentialFile, 'accounts', all);
}
export async function removeAccount(subject) {
  await writeEncrypted(credentialFile, 'accounts', (await accounts()).filter(x => x.subject !== subject));
}
export async function saveSessions(rows) { return writeEncrypted(sessionFile, 'sessions', rows); }
export async function loadSessions() { return readEncrypted(sessionFile, 'sessions', []); }
export async function deleteSessionFile() { const { rm } = await import('node:fs/promises'); await rm(sessionFile, { force: true }); }
export async function modeIsPrivate(file = keyFile) {
  const { stat } = await import('node:fs/promises'); return (stat(file)).then(s => (s.mode & 0o077) === 0).catch(() => false);
}
export { credentialFile, sessionFile, keyFile };
