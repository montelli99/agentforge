import {describe,it,expect,vi} from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {generateKeyPairSync,sign} from 'node:crypto';
import {once} from 'node:events';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {DirectTokenStore} from './chatgptDirectTokenStore.js';
import {WindowsDirectCredentialBackend} from './windowsDirectCredentialBackend.js';
import {renewDirectSession} from './chatgptDirectSession.js';
import {signOutDirectSession} from './chatgptDirectSignOut.js';
import {renewStoredChatGPTSession} from './chatgptDirectSignInRuntime.js';
import type {DirectCredentials} from './chatgptDirectOAuth.js';
const credentials=():DirectCredentials=>({clientId:'synthetic-client',subject:'synthetic-subject',issuer:'https://auth.openai.com',resource:'https://api.openai.com/v1',accessToken:'synthetic-access',refreshToken:'synthetic-refresh',idToken:'synthetic-id',tokenType:'Bearer',scopes:['resource.invoke','chatgpt.tokens.use.direct'],expiresAt:Date.now()+10000});
const verifier={verifySignature:async()=>({iss:'https://auth.openai.com',sub:'synthetic-subject',aud:'synthetic-client',exp:Math.floor(Date.now()/1000)+3600,nonce:'synthetic-nonce'})};
async function temporary(operation:(directory:string)=>Promise<void>){const directory=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'af-session-')));try{await operation(directory);}finally{if(!path.basename(directory).startsWith('af-session-'))throw Error('Invalid test directory');await fs.rm(directory,{recursive:true,force:true});}}
describe.skipIf(process.platform!=='win32')('protected session renewal',()=>{
  it('runs protected storage, fixed endpoints and pinned signature verification together',async()=>temporary(async directory=>{
    const store=new DirectTokenStore(new WindowsDirectCredentialBackend(directory));
    const original={...credentials(),authenticationNonce:'n'.repeat(43)};await store.replace(original);
    const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
    const jwk={...publicKey.export({format:'jwk'}),kid:'synthetic-key',alg:'RS256'};
    const input=Buffer.from(JSON.stringify({alg:'RS256',kid:jwk.kid})).toString('base64url')+'.'+Buffer.from(JSON.stringify({iss:original.issuer,sub:original.subject,aud:original.clientId,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url');
    const idToken=input+'.'+sign('RSA-SHA256',Buffer.from(input),privateKey).toString('base64url');
    const request=vi.fn<typeof fetch>(async url=>{
      if(String(url)==='https://auth.openai.com/api/accounts/oauth/token')return Response.json({access_token:'renewed-synthetic-access',refresh_token:'renewed-synthetic-refresh',id_token:idToken,token_type:'Bearer',expires_in:3600});
      if(String(url)==='https://auth.openai.com/.well-known/jwks.json')return Response.json({keys:[jwk]});
      throw Error('Unexpected endpoint');
    });
    const result=await renewStoredChatGPTSession(store,original.clientId,original.subject,fileURLToPath(new URL('./assets',import.meta.url)),undefined,request);
    expect(result.authenticationNonce).toBe(original.authenticationNonce);expect(result.renewalPending).toBeUndefined();
    expect(result.accessToken).toBe('renewed-synthetic-access');expect(request).toHaveBeenCalledTimes(2);
    expect(await store.read(original.clientId,original.subject)).toEqual(result);
    // This independent sign-out fixture must not reuse the near-expiry renewal
    // grant after slow OS credential operations have consumed its lifetime.
    const other={...original,subject:'other-synthetic-account',expiresAt:Date.now()+3600000};await store.replace(other);
    const hostile=vi.fn<typeof fetch>(async()=>Response.json({issuer:original.issuer,revocation_endpoint:'https://example.invalid/revoke'}));
    expect(await signOutDirectSession(store,original.clientId,original.subject,hostile))
      .toEqual({localCleared:true,remoteRevocation:'unconfirmed'});
    expect(hostile).toHaveBeenCalledTimes(1);
    expect(await store.read(original.clientId,original.subject)).toBeUndefined();
    expect(await store.read(other.clientId,other.subject)).toEqual(other);
    const revoke=vi.fn<typeof fetch>(async(url,init)=>{
      if(String(url).endsWith('/.well-known/openid-configuration'))return Response.json({issuer:other.issuer,revocation_endpoint:other.issuer+'/oauth/revoke'});
      expect(String(url)).toBe(other.issuer+'/oauth/revoke');expect(init?.redirect).toBe('error');
      expect(init?.body).toBeInstanceOf(URLSearchParams);
      expect((init!.body as URLSearchParams).get('token')).toBe(other.refreshToken);
      return new Response(null,{status:200});
    });
    expect(await signOutDirectSession(store,other.clientId,other.subject,revoke))
      .toEqual({localCleared:true,remoteRevocation:'confirmed'});
    expect(revoke).toHaveBeenCalledTimes(2);
    expect(await store.read(other.clientId,other.subject)).toBeUndefined();
  }),30000);
  it('persists validated replacement and does not renew a fresh session',async()=>temporary(async directory=>{
    const store=new DirectTokenStore(new WindowsDirectCredentialBackend(directory));const original=credentials();await store.replace(original);
    const refresh=vi.fn(async()=>({access_token:'new-synthetic-access',refresh_token:'new-synthetic-refresh',token_type:'Bearer',expires_in:3600}));
    const result=await renewDirectSession(store,original.clientId,original.subject,{refresh,verifier});
    expect(result.refreshToken).toBe('new-synthetic-refresh');expect(result.renewalPending).toBeUndefined();
    const reopened=new DirectTokenStore(new WindowsDirectCredentialBackend(directory));
    expect(await reopened.read(original.clientId,original.subject)).toEqual(result);
    await renewDirectSession(reopened,original.clientId,original.subject,{refresh,verifier});expect(refresh).toHaveBeenCalledTimes(1);
    await renewDirectSession(reopened,original.clientId,original.subject,{refresh,verifier,force:true});expect(refresh).toHaveBeenCalledTimes(2);

  }),30000);
  it('keeps uncertain renewal durable across reopen and refuses replay',async()=>temporary(async directory=>{
    const store=new DirectTokenStore(new WindowsDirectCredentialBackend(directory));const original=credentials();await store.replace(original);
    const refresh=vi.fn(async()=>{throw Error('synthetic-secret-provider-body');});
    await expect(renewDirectSession(store,original.clientId,original.subject,{refresh,verifier})).rejects.toThrow(/^Subscription renewal was not confirmed; sign in again$/);
    const reopened=new DirectTokenStore(new WindowsDirectCredentialBackend(directory));
    expect((await reopened.read(original.clientId,original.subject))?.renewalPending).toBe(true);
    await expect(renewDirectSession(reopened,original.clientId,original.subject,{refresh,verifier})).rejects.toThrow('sign-in required');expect(refresh).toHaveBeenCalledTimes(1);
    await reopened.replace({...original,expiresAt:Date.now()+3600000});
    await renewDirectSession(reopened,original.clientId,original.subject,{refresh,verifier});expect(refresh).toHaveBeenCalledTimes(1);
    // Sign-out must still remove an unreadable local grant; no token can be
    // sent remotely when decryption fails. Only this disposable fixture changes.
    const files=(await fs.readdir(directory)).filter(name=>name.endsWith('.dpapi'));
    expect(files).toHaveLength(1);
    await fs.writeFile(path.join(directory,files[0]!),Buffer.from('synthetic-corrupt-record'));
    const request=vi.fn<typeof fetch>();
    expect(await signOutDirectSession(reopened,original.clientId,original.subject,request))
      .toEqual({localCleared:true,remoteRevocation:'unconfirmed'});
    expect(request).not.toHaveBeenCalled();
    expect(await reopened.read(original.clientId,original.subject)).toBeUndefined();
  }),30000);
  it('excludes another process and releases the OS lock when its owner exits',async()=>temporary(async directory=>{
    const moduleUrl=pathToFileURL(fileURLToPath(new URL('./windowsDirectCredentialBackend.ts',import.meta.url))).href;
    const script=`import {WindowsDirectCredentialBackend} from ${JSON.stringify(moduleUrl)}; const backend=new WindowsDirectCredentialBackend(process.argv[1]); await backend.transaction('AgentForge/chatgpt-direct/'+ 'a'.repeat(64),async()=>{console.log('locked');await new Promise(()=>{});});`;
    const child=spawn(process.execPath,['--import','tsx','--input-type=module','-e',script,directory],{windowsHide:true,stdio:['ignore','pipe','pipe']});
    const exited=once(child,'exit');
    try{
      await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Child lock deadline')),10000);child.stdout!.once('data',data=>{clearTimeout(timer);String(data).includes('locked')?resolve():reject(Error('No lock'));});child.once('error',error=>{clearTimeout(timer);reject(error);});});
      const backend=new WindowsDirectCredentialBackend(directory),key='AgentForge/chatgpt-direct/'+'a'.repeat(64);
      await expect(backend.transaction(key,async()=>true)).rejects.toThrow('busy');
      child.kill();await exited;
      await expect(backend.transaction(key,async()=>true)).resolves.toBe(true);
    }finally{if(child.exitCode===null&&child.signalCode===null){child.kill();await exited;}}
  }),20000);
});
