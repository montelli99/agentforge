export const messageClient = String.raw`
function appendMessageContent(target, content) {
  const lines=String(content||'').split('\n');let code=null,fence='',list=null,paragraph=null;
  const inline=(parent,text)=>{
    // Construct nodes rather than interpreting HTML supplied by models or users.
    const pattern=/(\*\*([^*\n]+)\*\*|\x60([^\x60\n]+)\x60|\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\))/g;let offset=0;
    for(const match of text.matchAll(pattern)){parent.append(document.createTextNode(text.slice(offset,match.index)));let node;if(match[2]){node=document.createElement('strong');node.textContent=match[2];}else if(match[3]){node=document.createElement('code');node.textContent=match[3];}else{node=document.createElement('a');node.textContent=match[4];node.href=match[5];node.target='_blank';node.rel='noopener noreferrer';}parent.append(node);offset=match.index+match[0].length;}parent.append(document.createTextNode(text.slice(offset)));
  };
  const cells=line=>line.trim().replace(/^\|/,'').replace(/\|$/,'').split(/(?<!\\)\|/).map(cell=>cell.trim().replace(/\\\|/g,'|'));
  for(let lineIndex=0;lineIndex<lines.length;lineIndex++){
    const line=lines[lineIndex];
    const marker=line.match(/^\s{0,3}([\x60]{3,}|~{3,})(.*)$/);
    if(code){if(marker&&marker[1][0]===fence[0]&&marker[1].length>=fence.length&&!marker[2].trim()){code=null;fence='';}else code.textContent+=line+'\n';continue;}
    if(marker){paragraph=null;list=null;fence=marker[1];const block=document.createElement('section');block.className='message-code-block';const toolbar=document.createElement('div');toolbar.className='message-code-toolbar';const language=document.createElement('span');language.textContent=marker[2].trim()||'Code';const copy=document.createElement('button');copy.textContent='Copy code';copy.type='button';const pre=document.createElement('pre');code=document.createElement('code');const value=code;copy.onclick=async()=>{try{await navigator.clipboard.writeText(value.textContent);copy.textContent='Copied';}catch{copy.textContent='Copy unavailable';}};toolbar.append(language,copy);pre.append(code);block.append(toolbar,pre);target.append(block);continue;}
    if(!line.trim()){paragraph=null;list=null;continue;}
    if(line.includes('|')&&lineIndex+1<lines.length){const headers=cells(line),separators=cells(lines[lineIndex+1]);if(headers.length===separators.length&&separators.every(cell=>/^:?-{3,}:?$/.test(cell))){paragraph=null;list=null;const wrap=document.createElement('div');wrap.className='message-table-wrap';const table=document.createElement('table');const head=document.createElement('thead');const row=document.createElement('tr');headers.forEach((text,index)=>{const cell=document.createElement('th');cell.scope='col';cell.style.textAlign=separators[index].endsWith(':')?(separators[index].startsWith(':')?'center':'right'):'left';inline(cell,text);row.append(cell);});head.append(row);table.append(head);const body=document.createElement('tbody');lineIndex++;while(lineIndex+1<lines.length&&lines[lineIndex+1].includes('|')&&lines[lineIndex+1].trim()){const values=cells(lines[++lineIndex]);const row=document.createElement('tr');headers.forEach((_,index)=>{const cell=document.createElement('td');cell.style.textAlign=head.firstChild.children[index].style.textAlign;inline(cell,values[index]||'');row.append(cell);});body.append(row);}table.append(body);wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label','Response table; scroll horizontally for more columns');wrap.append(table);const tableBlock=document.createElement('section');tableBlock.className='message-table-block';const toolbar=document.createElement('div');toolbar.className='message-table-toolbar';const label=document.createElement('span');label.textContent=headers.length+' columns · '+body.children.length+' rows';const copy=document.createElement('button');copy.type='button';copy.textContent='Copy table';copy.onclick=async()=>{const plain=Array.from(table.rows,row=>Array.from(row.cells,cell=>cell.textContent.replace(/\t|\r?\n/g,' ')).join('\t')).join('\n');try{await navigator.clipboard.writeText(plain);copy.textContent='Copied';}catch{copy.textContent='Copy unavailable';}};toolbar.append(label,copy);tableBlock.append(toolbar,wrap);target.append(tableBlock);continue;}}
    if(/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)){paragraph=null;list=null;target.append(document.createElement('hr'));continue;}
    const heading=line.match(/^(#{1,6})\s+(.*)$/),item=line.match(/^\s*(?:([-*+])|\d+[.)])\s+(.*)$/),quote=line.match(/^>\s?(.*)$/);
    if(heading){paragraph=null;list=null;const element=document.createElement('h'+Math.min(heading[1].length+1,6));inline(element,heading[2]);target.append(element);}
    else if(item){paragraph=null;const tag=item[1]?'ul':'ol';if(!list||list.tagName.toLowerCase()!==tag){list=document.createElement(tag);if(tag==='ol')list.start=Number(line.trim().match(/^\d+/)[0]);target.append(list);}const element=document.createElement('li');inline(element,item[2]);list.append(element);}
    else if(quote){paragraph=null;list=null;const element=document.createElement('blockquote');inline(element,quote[1]);target.append(element);}
    else{list=null;if(!paragraph){paragraph=document.createElement('p');target.append(paragraph);}else paragraph.append(document.createElement('br'));inline(paragraph,line);}
  }
}
function renderConversationMessage(message, messages, onReply, onEdit, onBranch, onRegenerate, agentName) {
  const article=document.createElement('article');article.className='conversation-message';
  article.dataset.author=message.authorType;
  const meta=document.createElement('header');
  const identity=document.createElement('div');identity.className='message-identity';
  const avatar=document.createElement('span');avatar.className='message-avatar';avatar.setAttribute('aria-hidden','true');
  const authorLabel=message.authorType==='user'?'You':message.authorType==='agent'?(agentName||'Agent'):message.authorType==='assistant'?'Assistant':message.authorType;
  avatar.textContent=message.authorType==='user'?'Y':authorLabel.split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0].toLocaleUpperCase()).join('')||'✳';
  const name=document.createElement('strong');name.textContent=authorLabel;
  const time=document.createElement('time');time.dateTime=message.createdAt;time.textContent=new Date(message.createdAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});time.title=new Date(message.createdAt).toLocaleString();
  identity.append(avatar,name,time);meta.append(identity);
  const actions=document.createElement('span');const copy=document.createElement('button');copy.textContent='Copy';copy.onclick=async()=>{try{await navigator.clipboard.writeText(message.content);copy.textContent='Copied';}catch{copy.textContent='Copy unavailable';}};
  const reply=document.createElement('button');reply.textContent='Reply';reply.onclick=()=>onReply(message);actions.append(reply,copy);meta.appendChild(actions);article.appendChild(meta);
  if(message.replyToMessageId){const original=messages.find(m=>m.id===message.replyToMessageId);const quote=document.createElement('button');quote.type='button';quote.className='message-reply-link';quote.textContent='↳ '+(original?.content?.slice(0,220)||'Attached file');quote.title='Jump to original message';quote.disabled=!original;quote.onclick=()=>{const target=Array.from(article.parentElement.querySelectorAll('[data-message-id]')).find(node=>node.dataset.messageId===message.replyToMessageId);if(target){target.scrollIntoView({block:'center'});target.tabIndex=-1;target.focus({preventScroll:true});}};article.appendChild(quote);}
  const body=document.createElement('div');appendMessageContent(body,message.content);article.appendChild(body);
  if(message.generation){const status=document.createElement('p');status.className='response-status';status.textContent=message.generation.model+' · '+(message.generation.status==='complete'?'Completed response':message.generation.status==='stopped'?'Stopped · partial response':'Failed · partial response');article.appendChild(status);}
  if(message.generation?.contextMemories?.length){const sources=document.createElement('details');sources.className='message-revisions';const summary=document.createElement('summary');summary.textContent='Project memory supplied · '+message.generation.contextMemories.length+' records';sources.append(summary);for(const memory of message.generation.contextMemories){const source=document.createElement('p');source.textContent=memory.title+' · version '+memory.version+' · '+memory.id;sources.append(source);}article.append(sources);}
  if(message.generation&&onRegenerate){const retry=document.createElement('button');retry.textContent=message.generation.status==='complete'?'Try another response':'Retry response';retry.title='Generate in a branch and keep this response';retry.onclick=()=>onRegenerate(message);actions.append(retry);}
  if(onEdit && message.authorType==='user'){const edit=document.createElement('button');edit.textContent='Edit';edit.onclick=()=>onEdit(message);actions.appendChild(edit);}
  if(onBranch){const branch=document.createElement('button');branch.textContent='Branch';branch.title='Continue in a new conversation from here';branch.onclick=()=>onBranch(message);actions.appendChild(branch);}
  if(message.revisions?.length){const history=document.createElement('details');history.className='message-revisions';const summary=document.createElement('summary');summary.textContent='Edited · '+message.revisions.length+' previous version'+(message.revisions.length===1?'':'s');history.appendChild(summary);for(const revision of message.revisions){const item=document.createElement('section');const time=document.createElement('small');time.textContent='Replaced '+new Date(revision.editedAt).toLocaleString();item.appendChild(time);appendMessageContent(item,revision.content);history.appendChild(item);}article.appendChild(history);}
  for(const attachment of message.attachments||[]){
    // Only locally stored, validated attachments; never auto-fetch a remote URL.
    if(!/^data:(image\/(png|jpeg|webp)|application\/pdf|text\/plain);base64,/.test(attachment.url))continue;
    const link=document.createElement('a');link.className='message-attachment';link.href=attachment.url;link.download=attachment.filename;link.textContent=attachment.filename+' · '+Math.ceil(attachment.sizeBytes/1024)+' KB';
    if(/^image\//.test(attachment.mimeType)){const image=document.createElement('img');image.src=attachment.url;image.alt=attachment.filename;image.loading='lazy';link.prepend(image);}
    const preview=document.createElement('button');preview.type='button';preview.className='btn btn-sm btn-secondary';preview.textContent='Preview '+attachment.filename;preview.onclick=()=>openAttachmentPreview(attachment);article.append(link,preview);
  }
  return article;
}
function openAttachmentPreview(attachment){
  const trigger=document.activeElement;const dialog=document.createElement('dialog');dialog.className='conversation-dialog attachment-preview-dialog';dialog.setAttribute('aria-label','Attachment preview: '+attachment.filename);
  const heading=document.createElement('h2');heading.textContent=attachment.filename;const info=document.createElement('p');info.textContent=attachment.mimeType+' · '+Math.ceil(attachment.sizeBytes/1024)+' KB';
  const body=document.createElement('div');body.className='attachment-preview-body';
  const footer=document.createElement('footer'),download=document.createElement('a'),close=document.createElement('button');download.href=attachment.url;download.download=attachment.filename;download.textContent='Download';download.className='btn btn-secondary';close.textContent='Close';close.className='btn';close.onclick=()=>dialog.close();footer.append(download,close);
  let objectUrl,previewObserver;
  try{if(attachment.mimeType.startsWith('image/')){const image=document.createElement('img');image.src=attachment.url;image.alt=attachment.filename;
    const toolbar=document.createElement('div');toolbar.className='image-preview-tools';toolbar.setAttribute('role','group');toolbar.setAttribute('aria-label','Image zoom');
    const viewport=document.createElement('div');viewport.className='image-preview-viewport';viewport.tabIndex=0;viewport.setAttribute('aria-label','Image viewing area; scroll to inspect zoomed details');viewport.append(image);body.append(toolbar,viewport);
    let scale=1,fitMode=true;const status=document.createElement('output');status.setAttribute('aria-live','polite');const controls=[];
    const apply=(value,fromFit=false)=>{if(!image.naturalWidth)return;fitMode=fromFit;scale=Math.max(.001,Math.min(4,value));image.style.width=Math.round(image.naturalWidth*scale)+'px';image.style.maxWidth='none';status.textContent=Math.round(scale*100)+'%';controls[0].disabled=scale<=.001;controls[1].disabled=scale>=4;};
    const fit=()=>apply(Math.min(1,Math.max(1,viewport.clientWidth-24)/image.naturalWidth,Math.max(1,viewport.clientHeight-24)/image.naturalHeight),true);
    previewObserver=new ResizeObserver(()=>{if(fitMode&&image.naturalWidth)fit();});previewObserver.observe(viewport);
    for(const [label,action] of [['Zoom out',()=>apply(scale/1.25)],['Zoom in',()=>apply(scale*1.25)],['Fit image',fit],['Actual size',()=>apply(1)]]){const button=document.createElement('button');button.type='button';button.className='btn btn-secondary';button.textContent=label;button.onclick=action;controls.push(button);toolbar.append(button);}toolbar.append(status);image.onload=fit;image.onerror=()=>{viewport.textContent='Image preview could not be decoded. Download the original to inspect it.';controls.forEach(button=>button.disabled=true);};
    viewport.onkeydown=event=>{if(event.key==='+'||event.key==='='){event.preventDefault();apply(scale*1.25);}else if(event.key==='-'){event.preventDefault();apply(scale/1.25);}else if(event.key==='0'){event.preventDefault();fit();}};}else{const raw=atob(attachment.url.split(',')[1]);const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));if(attachment.mimeType==='text/plain'){const pre=document.createElement('pre');pre.textContent=new TextDecoder().decode(bytes);body.append(pre);}else{objectUrl=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));const frame=document.createElement('iframe');frame.title='PDF preview: '+attachment.filename;frame.src=objectUrl;frame.setAttribute('sandbox','');body.append(frame);const note=document.createElement('p');note.textContent='If your browser cannot display this PDF, download it to view.';body.append(note);}}}catch{body.textContent='Preview unavailable. You can still download the original file.';}
  dialog.append(heading,info,body,footer);dialog.onclose=()=>{previewObserver?.disconnect();if(objectUrl)URL.revokeObjectURL(objectUrl);dialog.remove();if(trigger?.isConnected)trigger.focus();};document.body.append(dialog);dialog.showModal();close.focus();
}
function openMessageEditor(message, onSave) {
  const dialog=document.createElement('dialog');dialog.className='conversation-dialog';
  dialog.innerHTML='<form><h2>Edit message</h2><p>The previous version stays in this conversation’s history.</p><label>Message<textarea class="form-control" maxlength="40000" rows="8"></textarea></label><p class="conversation-feedback" aria-live="polite"></p><footer><button type="button" class="btn btn-secondary">Cancel</button><button type="submit" class="btn">Save changes</button></footer></form>';
  dialog.querySelector('textarea').value=message.content;
  dialog.querySelector('button[type=button]').onclick=()=>dialog.close();dialog.onclose=()=>dialog.remove();
  dialog.querySelector('form').onsubmit=async event=>{event.preventDefault();const save=dialog.querySelector('button[type=submit]');save.disabled=true;try{await onSave(dialog.querySelector('textarea').value);dialog.close();}catch(error){dialog.querySelector('.conversation-feedback').textContent=error.message;save.disabled=false;}};
  document.body.appendChild(dialog);dialog.showModal();dialog.querySelector('textarea').focus();
}
function setupConversationAttachments(form, attachments, onChange=()=>{}) {
  const picker=form.querySelector('input[type=file]');const list=form.querySelector('.composer-attachments');
  const render=()=>{list.replaceChildren();for(const file of attachments){const chip=document.createElement('button');chip.type='button';chip.className='attachment-chip';chip.textContent=file.filename+' ×';chip.title='Remove '+file.filename;chip.onclick=()=>{if(form.querySelector('textarea').disabled)return;attachments.splice(attachments.indexOf(file),1);render();onChange();};list.appendChild(chip);}};
  const readFiles=async files=>{
    if(form.querySelector('textarea').disabled||form.dataset.readingFiles==='true')return;
    form.dataset.readingFiles='true';form.dispatchEvent(new Event('composer-state-change'));
    const feedback=form.querySelector('.conversation-feedback');feedback.textContent='';
    try{for(const file of files){if(attachments.length>=4)throw Error('Attach up to four files.');if(file.size>2*1024*1024)throw Error('Each attachment must be under 2 MiB.');if(attachments.reduce((n,a)=>n+a.size,0)+file.size>4*1024*1024)throw Error('Attachments must total less than 4 MiB.');
      const mime=file.type||(/\.(txt|md|csv|json)$/i.test(file.name)?'text/plain':'');
      if(!['image/png','image/jpeg','image/webp','application/pdf','text/plain'].includes(mime))throw Error('Use PNG, JPEG, WebP, PDF, or plain text.');
      const url=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(Error('Could not read file'));reader.readAsDataURL(file);});
      if(!form.isConnected)return;
      attachments.push({filename:file.name,mimeType:mime,base64:url.split(',')[1],size:file.size});
    }}catch(error){feedback.textContent=error.message;}finally{delete form.dataset.readingFiles;}render();onChange();picker.value='';
  };
  picker.onchange=()=>readFiles(Array.from(picker.files||[]));
  form.querySelector('textarea').addEventListener('paste',event=>{
    const files=Array.from(event.clipboardData?.files||[]);
    if(!files.length)return;
    // Reuse the same size/type limits and draft storage as picking or dropping files.
    event.preventDefault();void readFiles(files);
  });
  form.querySelector('[data-attach]').onclick=()=>picker.click();
  form.ondragover=event=>{event.preventDefault();form.classList.add('drag-over');};
  form.ondragleave=()=>form.classList.remove('drag-over');
  form.ondrop=event=>{event.preventDefault();form.classList.remove('drag-over');readFiles(Array.from(event.dataTransfer.files));};
  render();
}
`;
