import {describe,it,expect,vi} from 'vitest';
import path from 'node:path';
import os from 'node:os';
import {BoundedChildFailure,runBoundedChild} from './boundedCliProcess.js';
import {WindowsDirectCredentialBackend} from './windowsDirectCredentialBackend.js';
import type {DirectCredentials} from './chatgptDirectOAuth.js';
vi.mock('./boundedCliProcess.js',async importOriginal=>({...await importOriginal<typeof import('./boundedCliProcess.js')>(),runBoundedChild:vi.fn()}));
const credentials={accessToken:'synthetic-secret'} as DirectCredentials;
const key='AgentForge/chatgpt-direct/'+'a'.repeat(64);
describe.skipIf(process.platform!=='win32')('Windows protection error privacy',()=>{
  it('reports the last fixed stage on timeout without exposing child output',async()=>{
    vi.mocked(runBoundedChild).mockRejectedValueOnce(new BoundedChildFailure('secret diagnostic','timeout',{
      pid:1,code:null,stdout:'synthetic-secret',stderr:'AF_STAGE:started\nAF_STAGE:assembly\nprivate data',
    }));
    const backend=new WindowsDirectCredentialBackend(path.join(os.tmpdir(),'af-error-only'));
    await expect(backend.replace(key,credentials)).rejects.toThrow(/^Windows credential protection failed \(timeout; stage=assembly\)$/);
  });
  it('does not propagate arbitrary errors or arbitrary stage labels',async()=>{
    vi.mocked(runBoundedChild).mockRejectedValueOnce(Error('synthetic-secret'));
    const backend=new WindowsDirectCredentialBackend(path.join(os.tmpdir(),'af-error-only'));
    await expect(backend.replace(key,credentials)).rejects.toThrow(/^Windows credential protection failed \(operation-error; stage=launch\)$/);
  });
});
