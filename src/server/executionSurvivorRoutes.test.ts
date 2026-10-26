import {describe, it, expect, vi} from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {WorkspaceStore} from '../core/store/workspaceStore.js';
import {TaskWorkerRuntime} from '../core/runtime/taskWorkerRuntime.js';
import {AgentForgeWebServer} from './webServer.js';

describe('survivor discovery HTTP boundary', () => {
  it('requires task-read access, stays read-only, and sanitizes discovery failures', async () => {
    const directory = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'af-survivor-route-')));
    const store = new WorkspaceStore();
    for (const [username, permissions] of [['reader', ['tasks:read']], ['restricted', []], ['reviewer', ['tasks:read', 'tasks:execute', 'approvals:decide']]] as const) {
      store.createUser({username, displayName: username, role: 'viewer', permissions: [...permissions], password: 'synthetic acceptance password'});
    }
    store.createTask({id: 'synthetic-task', title: 'Synthetic survivor lookup', status: 'paused', priority: 'medium'});
    const runtime = new TaskWorkerRuntime(store, undefined, {autoStart: false});
    const discovery = vi.spyOn(runtime, 'inspectExecutionSurvivors').mockResolvedValue({operationId: 'synthetic-operation', containers: [{id: 'a'.repeat(64), state: 'running'}], replayed: false, reconciled: false});
    const server = new AgentForgeWebServer(store, 0, undefined, runtime, {settingsFilePath: path.join(directory, 'settings.json')});
    try {
      await server.start();
      const base = server.getBaseUrl();
      const login = async (username: string) => {
        const response = await fetch(base + '/api/auth/login', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({username, password: 'synthetic acceptance password'})});
        expect(response.status).toBe(200);
        return (await response.json()).token as string;
      };
      const reader = await login('reader'), restricted = await login('restricted');
      const request = (token?: string, method = 'GET') => fetch(base + '/api/tasks/synthetic-task/survivors', {method, headers: token ? {Authorization: 'Bearer ' + token} : {}});
      expect((await request()).status).toBe(401);
      expect((await request(restricted)).status).toBe(403);
      expect((await request(reader, 'POST')).status).toBe(405);
      expect(discovery).not.toHaveBeenCalled();
      store.updateTask('synthetic-task',{planningAudits:[
        {id:'refused',taskId:'synthetic-task',model:'fixture',requestDigest:'synthetic',status:'rejected',rejectionStatus:401},
        {id:'uncertain',taskId:'synthetic-task',model:'fixture',requestDigest:'synthetic',status:'unknown'}
      ]});
      const receiptResponse=await fetch(base+'/api/tasks/synthetic-task/receipt',{headers:{Authorization:'Bearer '+reader}});
      expect(receiptResponse.status).toBe(200);
      expect(await receiptResponse.json()).toMatchObject({unknownPlanningCount:1,rejectedPlanningCount:1});
      store.updateTask('synthetic-task',{planningAudits:[]});
      const before = structuredClone(store.getTask('synthetic-task'));
      const response = await request(reader);
      expect(response.status).toBe(200);
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(await response.json()).toEqual({operationId: 'synthetic-operation', containers: [{id: 'a'.repeat(64), state: 'running'}], replayed: false, reconciled: false});
      expect(store.getTask('synthetic-task')).toEqual(before);
      discovery.mockRejectedValueOnce(Error('synthetic-private-daemon-error-with-path'));
      const failed = await request(reader);
      expect(failed.status).toBe(409);
      expect(failed.headers.get('cache-control')).toBe('no-store');
      const message = await failed.text();
      expect(message).not.toContain('synthetic-private');
      expect(message).toContain('No work was replayed or reconciled');
      expect(store.getTask('synthetic-task')).toEqual(before);
      expect(discovery).toHaveBeenCalledTimes(2);
      const reviewer = await login('reviewer');
      const restore = vi.spyOn(runtime, 'reconcileObservedExecution').mockImplementation(() => {throw Error('Recovery failed: api_key=synthetic-secret-value-12345678');});
      const resolution = await fetch(base + '/api/tasks/synthetic-task/resolve-receipt', {
        method: 'POST', headers: {Authorization: 'Bearer ' + reviewer, 'Content-Type': 'application/json'},
        body: JSON.stringify({expectedUpdatedAt: before!.updatedAt, operationId: null, receiptDigest: null, decision: 'restore-observed'}),
      });
      expect(resolution.status).toBe(409);
      expect(resolution.headers.get('cache-control')).toBe('no-store');
      const detail = await resolution.text();
      expect(detail).not.toContain('synthetic-secret-value');
      expect(detail).toContain('[REDACTED_SECRET]');
      expect(restore).toHaveBeenCalledTimes(1);
      const recover=vi.spyOn(runtime,'recoverJournaledExecution').mockResolvedValue(before!);
      const recoverRequest=(token:string|undefined,stamp=before!.updatedAt)=>fetch(base+'/api/tasks/synthetic-task/resolve-receipt',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify({expectedUpdatedAt:stamp,operationId:null,receiptDigest:null,decision:'recover-journal'})});
      expect((await recoverRequest(undefined)).status).toBe(401);
      expect((await recoverRequest(reader)).status).toBe(403);
      expect((await recoverRequest(reviewer,'stale')).status).toBe(409);
      expect(recover).not.toHaveBeenCalled();
      const expired=await login('reviewer');store.validateSession(expired)!.expiresAt='2000-01-01T00:00:00.000Z';
      expect((await recoverRequest(expired)).status).toBe(401);expect(recover).not.toHaveBeenCalled();
      expect((await recoverRequest(reviewer)).status).toBe(200);expect(recover).toHaveBeenCalledTimes(1);
      recover.mockRejectedValueOnce(Error('Recovery failed: api_key=synthetic-secret-value-12345678'));
      const denied=await recoverRequest(reviewer);expect(denied.status).toBe(409);expect(await denied.text()).not.toContain('synthetic-secret-value');
      expect(store.getTask('synthetic-task')).toEqual(before);
    } finally {
      await server.stop();
      if (path.dirname(directory) !== await fs.realpath(os.tmpdir()) || !path.basename(directory).startsWith('af-survivor-route-')) throw Error('Invalid fixture cleanup');
      await fs.rm(directory, {recursive: true, force: true});
    }
  });
});

