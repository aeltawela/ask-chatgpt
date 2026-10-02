import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { pkceChallenge, validateIdToken } from '../src/oauth.mjs';
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const jwk = publicKey.export({ format: 'jwk' }); Object.assign(jwk, { kid: 'unit-key', alg: 'RS256', use: 'sig' });
function token({ nonce='nonce-1', aud='client-1', exp=Math.floor(Date.now()/1000)+300, iss='https://auth.openai.com' }={}) { const a=encode({alg:'RS256',typ:'JWT',kid:'unit-key'}), b=encode({iss,aud,sub:'subject',iat:Math.floor(Date.now()/1000),exp,nonce}); const sig=sign('RSA-SHA256',Buffer.from(`${a}.${b}`),privateKey).toString('base64url'); return `${a}.${b}.${sig}`; }
test('PKCE challenge is SHA-256 base64url', () => { assert.equal(pkceChallenge('abc'), 'ungWv48Bz-pBQUDeXa4iI7ADYaOWF3qctBD_YfIAFa0'); });
test('identity token verifies signature, issuer, audience, expiry and nonce', async () => { const claims = await validateIdToken(token(), { clientId:'client-1', nonce:'nonce-1', fetcher:async()=>new Response(JSON.stringify({keys:[jwk]}),{status:200}) }); assert.equal(claims.sub,'subject'); });
test('identity validation fails closed for wrong nonce, audience, expiry or signature', async () => {
  const fetcher=async()=>new Response(JSON.stringify({keys:[jwk]}),{status:200});
  for (const [jwt, opts] of [[token({nonce:'wrong'}),{clientId:'client-1',nonce:'nonce-1'}],[token({aud:'other'}),{clientId:'client-1',nonce:'nonce-1'}],[token({exp:1}),{clientId:'client-1',nonce:'nonce-1'}],[token(),{clientId:'client-1',nonce:'wrong'}]]) await assert.rejects(validateIdToken(jwt,{...opts,fetcher}));
});
