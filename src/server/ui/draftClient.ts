/** Local draft extras use IndexedDB rather than synchronous multi-megabyte storage. */
export const draftClient = String.raw`
let draftDatabase;
const draftWrites=new Map();
function openDraftDatabase(){
 if(!draftDatabase)draftDatabase=new Promise((resolve,reject)=>{const request=indexedDB.open('agentforge-conversation-drafts',1);request.onupgradeneeded=()=>request.result.createObjectStore('extras');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error||Error('Draft storage unavailable.'));request.onblocked=()=>reject(Error('Draft storage is blocked by another window.'));});
 return draftDatabase;
}
async function loadDraftExtras(id){
 await draftWrites.get(id);
 const db=await openDraftDatabase();return new Promise((resolve,reject)=>{const request=db.transaction('extras','readonly').objectStore('extras').get(id);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
}
function saveDraftExtras(id,clear=false){
 const record=clear?null:{attachments:structuredClone(conversationDraftMedia.get(id)||[]),replyTo:conversationDraftReplies.get(id)||null,updatedAt:Date.now()};
 const work=(draftWrites.get(id)||Promise.resolve()).catch(()=>{}).then(async()=>{const db=await openDraftDatabase();await new Promise((resolve,reject)=>{const tx=db.transaction('extras','readwrite'),store=tx.objectStore('extras');if(!record||(!record.attachments.length&&!record.replyTo))store.delete(id);else store.put(record,id);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Draft save interrupted.'));});});
 draftWrites.set(id,work);work.catch(()=>{if(currentView==='messages'&&conversationState.selected===id){const feedback=document.querySelector('.conversation-composer .conversation-feedback');if(feedback)feedback.textContent='Draft files could not be saved to this browser. Keep this tab open until you send or remove them.';}});return work;
}
`;
