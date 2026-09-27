export const responseClient = String.raw`
const liveResponses=new Map();
function observeSavedResponse(thread,form){
  let failures=0;
  const visible=()=>form.isConnected&&currentView==='messages'&&conversationState.selected===thread.id;
  const check=async()=>{
    if(!visible()||liveResponses.has(thread.id))return;
    try{
      const status=await conversationRequest('/api/chat/status');
      if(!visible()||liveResponses.has(thread.id))return;
      failures=0;
      if(!status.activeThreads.includes(thread.id)){
        // Do not replace the composer while its asynchronous file read is active.
        if(form.dataset.readingFiles==='true'){setTimeout(check,1000);return;}
        await selectConversation(thread.id);return;
      }
      form.querySelector('.conversation-feedback').textContent='A response is running. Saved output will appear here when it finishes.';
    }catch{
      if(!visible())return;
      failures++;
      form.querySelector('.conversation-feedback').textContent='Connection unavailable. Checking again for your saved response…';
    }
    if(visible())setTimeout(check,Math.min(30000,2000*Math.pow(2,failures)));
  };
  setTimeout(check,2000);
}
function paintLiveResponse(id){
  if(currentView!=='messages'||conversationState.selected!==id)return;
  const feed=document.getElementById('conversation-feed');if(!feed)return;
  const follow=conversationReadingPositions.get(id)?.follow!==false;
  let card=feed.querySelector('.live-response');const run=liveResponses.get(id);
  if(!run){card?.remove();return;}
  if(!card){card=document.createElement('article');card.className='conversation-message live-response';const header=document.createElement('header');header.textContent='AgentForge · '+run.model;const content=document.createElement('div');content.className='live-response-text';const status=document.createElement('p');status.className='response-status';status.setAttribute('role','status');card.append(header,content,status);feed.appendChild(card);}
  card.querySelector('.live-response-text').textContent=run.text;
  card.querySelector('.response-status').textContent=run.status;
  if(follow)feed.scrollTop=feed.scrollHeight;
  const latest=feed.parentElement.querySelector('.conversation-jump-latest');if(latest)latest.hidden=follow;
}
async function generateConversationResponse(id,messageId,model){
  if(liveResponses.has(id))return;
  const run={text:'',model,status:'Connecting to model…'};liveResponses.set(id,run);paintLiveResponse(id);
  const stage=document.getElementById('conversation-stage');const form=currentView==='messages'&&conversationState.selected===id?stage?.querySelector('form'):null;if(form){form.dataset.responseBusy='true';form.dispatchEvent(new Event('composer-state-change'));const retry=form.querySelector('[data-response-retry]');if(retry)retry.disabled=true;const stop=form.querySelector('[data-response-stop]');if(stop)stop.hidden=false;}
  try{
    const response=await fetch('/api/threads/'+id+'/respond',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messageId,model})});
    if(!response.ok){const problem=await response.json();throw Error(problem.error||'Could not start response.');}
    if(!response.body)throw Error('Streaming is unavailable.');
    const reader=response.body.getReader();const decoder=new TextDecoder();let pending='';let finished=false;
    try{while(true){const result=await reader.read();pending+=result.done?decoder.decode():decoder.decode(result.value,{stream:true});const lines=pending.split('\n');pending=lines.pop()||'';if(result.done&&pending.trim()){lines.push(pending);pending='';}for(const line of lines){if(!line.trim())continue;const event=JSON.parse(line);if(event.type==='delta'){run.text+=event.text;run.status='Writing…';}if(event.type==='started')run.status='Waiting for response…';if(event.type==='finished'){finished=true;run.status=event.status==='complete'?'Complete':event.status==='stopped'?'Stopped':event.error;}
      paintLiveResponse(id);
    }if(result.done)break;}if(!finished)throw Error('Connection interrupted. Checking saved output.');}finally{reader.releaseLock();}
    const finalStatus=run.status;liveResponses.delete(id);
    if(currentView==='messages'&&conversationState.selected===id){await selectConversation(id);const feedback=document.querySelector('.conversation-feedback');if(feedback&&finalStatus!=='Complete')feedback.textContent=finalStatus;}
  }catch(error){liveResponses.delete(id);if(currentView==='messages'&&conversationState.selected===id){await selectConversation(id);const feedback=document.querySelector('.conversation-feedback');if(feedback)feedback.textContent=error.message;}}
}
async function setupResponseControls(thread,messages,form){
  const row=document.createElement('div');row.className='response-controls';
  const select=document.createElement('select');select.className='form-control';select.setAttribute('aria-label','Response model');select.innerHTML='<option value="">Save only</option>';select.title='Save this message without generating an AI reply.';row.appendChild(select);
  const stop=document.createElement('button');stop.type='button';stop.className='btn btn-sm btn-secondary';stop.textContent='Stop response';stop.hidden=true;stop.onclick=async()=>{stop.disabled=true;try{const result=await conversationRequest('/api/threads/'+thread.id+'/stop','POST',{});form.querySelector('.conversation-feedback').textContent=result.stopped?'Stopping response…':'No response is running.';}catch(error){form.querySelector('.conversation-feedback').textContent=error.message;}finally{stop.disabled=false;}};row.appendChild(stop);
  const actions=form.querySelector('.conversation-send-actions');if(actions)actions.prepend(row);else form.prepend(row);
  stop.dataset.responseStop='true';
  select.onchange=()=>{try{localStorage.setItem('agentforge-chat-model',select.value);}catch{}};
  try{const status=await conversationRequest('/api/chat/status');if(!form.isConnected)return;for(const model of status.models){const option=document.createElement('option');option.value=model;option.textContent=model;select.appendChild(option);}try{const saved=localStorage.getItem('agentforge-chat-model');if(status.models.includes(saved))select.value=saved;}catch{}
    const active=status.activeThreads.includes(thread.id)||liveResponses.has(thread.id);stop.hidden=!active;form.dataset.responseBusy=String(active||pendingConversationSends.has(thread.id));form.dispatchEvent(new Event('composer-state-change'));
    const hint=form.querySelector('.conversation-composer-status');const updateHint=()=>{if(hint){hint.textContent=select.value?'AI response · text only · no tools'+(status.projectMemoryEnabled?' · project instructions enabled':''):'';}};updateHint();select.addEventListener('change',updateHint);
    if(active&&!liveResponses.has(thread.id)){const note=form.querySelector('.conversation-feedback');note.textContent='A response is running. Saved output will appear here when it finishes.';observeSavedResponse(thread,form);}
    const latest=messages.at(-1);if(status.configured&&latest?.authorType==='user'&&!active&&!thread.archived){const retry=document.createElement('button');retry.dataset.responseRetry='true';retry.type='button';retry.className='btn btn-sm btn-secondary';retry.textContent='Respond to last message';retry.onclick=()=>{if(!select.value){form.querySelector('.conversation-feedback').textContent='Choose a model first.';return;}stop.hidden=false;retry.disabled=true;generateConversationResponse(thread.id,latest.id,select.value);};row.appendChild(retry);}
  }catch{form.querySelector('.conversation-feedback').textContent='Model status unavailable. Messages can still be saved locally.';}
  paintLiveResponse(thread.id);
  return select;
}
async function openResponseAlternative(thread,message){
 const dialog=document.createElement('dialog');dialog.className='conversation-dialog';dialog.innerHTML='<h2>Try another response</h2><p>This creates a branch ending at your original prompt. Your current conversation and this response stay unchanged.</p><label>Model<select class="form-control" aria-label="Alternative response model"></select></label><p class="conversation-feedback" role="status">Checking available models…</p><footer><button class="btn btn-secondary" data-cancel>Cancel</button><button class="btn" data-generate disabled>Generate alternative</button></footer>';
 let cancelled=false;dialog.addEventListener('cancel',()=>{cancelled=true;});dialog.querySelector('[data-cancel]').onclick=()=>{cancelled=true;dialog.close();};dialog.onclose=()=>{cancelled=true;dialog.remove();};document.body.append(dialog);dialog.showModal();const feedback=dialog.querySelector('.conversation-feedback'),generate=dialog.querySelector('[data-generate]'),select=dialog.querySelector('select');
 try{const status=await conversationRequest('/api/chat/status');if(!dialog.isConnected)return;if(!status.configured||!status.models.length){feedback.textContent='Connect a chat model before generating an alternative.';return;}for(const model of status.models)select.append(new Option(model,model));if(status.models.includes(message.generation.model))select.value=message.generation.model;feedback.textContent='The new response will be saved in its own conversation.';generate.disabled=false;
 let created=null;generate.onclick=async()=>{if(generate.disabled)return;generate.disabled=true;try{created=created||await conversationRequest('/api/threads/'+thread.id+'/branch','POST',{throughMessageId:message.generation.promptMessageId});if(cancelled||!dialog.open)return;const history=await conversationRequest('/api/threads/'+created.id+'/messages');if(cancelled||!dialog.open)return;const prompt=history.at(-1);if(!prompt||prompt.authorType!=='user')throw Error('The source prompt is unavailable. Your original response was preserved.');const model=select.value;conversationState.selected=created.id;conversationState.archived=false;conversationState.query='';conversationSearchResults=null;await showConversations();if(cancelled||!dialog.open)return;dialog.close();await generateConversationResponse(created.id,prompt.id,model);}catch(error){if(dialog.isConnected){feedback.textContent=error.message;generate.disabled=false;}}};
 }catch(error){feedback.textContent=error.message;}
}
`;
