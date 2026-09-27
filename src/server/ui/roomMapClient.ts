/** A saved-record team map. Live execution cues require a process-backed task run. */
export const roomMapClient = String.raw`
function renderWorkspaceRoomMap(canvas,agents,runtime,tasks){
  const pending=canvas.parentElement?.querySelector('.team-room-map-pending');
  if(!agents.length&&!tasks.length){
    const empty=document.createElement('section');empty.className='room-map-empty';empty.setAttribute('aria-label','Team Room setup');
    const art=document.createElement('div');art.className='room-map-empty-art';art.setAttribute('aria-hidden','true');art.innerHTML='<i></i><i></i><i></i><span>✳</span>';
    const copy=document.createElement('div');const kicker=document.createElement('span');kicker.className='goal-kicker';kicker.textContent='Your workspace is ready';const title=document.createElement('h3');title.textContent='Build your team deliberately.';const detail=document.createElement('p');detail.textContent='Add a teammate with a clear role and boundaries. Their relationships and assigned work will appear here once saved.';const action=document.createElement('button');action.type='button';action.className='btn';action.textContent='Create first agent';action.onclick=()=>switchView('agents');copy.append(kicker,title,detail,action);empty.append(art,copy);canvas.replaceWith(empty);pending?.remove();return;
  }

  const map=document.createElement('div');map.className='room-map';map.setAttribute('role','group');map.setAttribute('aria-label','AgentForge team and saved work');
  const reactor=document.createElement('div');reactor.className='room-map-reactor';reactor.setAttribute('aria-hidden','true');reactor.innerHTML='<i></i><i></i><i></i><i></i><b></b><span></span>';map.append(reactor);
  const scene=document.createElementNS('http://www.w3.org/2000/svg','svg');scene.classList.add('room-map-architecture');scene.setAttribute('aria-hidden','true');
  const orbitSpecs=[['orbit-violet',.39,.28,-22],['orbit-mint',.34,.40,34],['orbit-amber',.25,.46,70]];
  for(const [className,rxRatio,ryRatio,angle] of orbitSpecs){
    const orbit=document.createElementNS(scene.namespaceURI,'g');orbit.classList.add('room-map-orbit',className);orbit.dataset.angle=String(angle);
    const plane=document.createElementNS(scene.namespaceURI,'g');plane.classList.add('room-map-orbit-plane');
    const ellipse=document.createElementNS(scene.namespaceURI,'ellipse');ellipse.setAttribute('cx','0');ellipse.setAttribute('cy','0');ellipse.dataset.rx=String(rxRatio);ellipse.dataset.ry=String(ryRatio);plane.append(ellipse);
    const satellite=document.createElementNS(scene.namespaceURI,'circle');satellite.classList.add('room-map-satellite');satellite.setAttribute('r',className==='orbit-amber'?'4':'4.8');satellite.dataset.rx=String(rxRatio);satellite.setAttribute('cy','0');plane.append(satellite);orbit.append(plane);scene.append(orbit);
  }
  const stars=document.createElementNS(scene.namespaceURI,'g');stars.classList.add('room-map-stars');
  for(const [x,y,r] of [[.12,.2,1.4],[.2,.72,1.8],[.82,.18,1.5],[.9,.65,1.7],[.73,.83,1.2],[.3,.12,1.1],[.08,.54,1.2],[.91,.39,1.1],[.63,.12,1.3],[.43,.88,1.5]]){const star=document.createElementNS(scene.namespaceURI,'circle');star.setAttribute('cx',String(x));star.setAttribute('cy',String(y));star.setAttribute('r',String(r));stars.append(star);}
  scene.append(stars);map.append(scene);
  const links=document.createElementNS('http://www.w3.org/2000/svg','svg');links.classList.add('room-map-links');links.setAttribute('aria-hidden','true');map.append(links);
  const visible=agents.slice(0,8),nodes=[];let width=0,height=420;

  function addNode(agent,slot=0){
    const activeTaskIds=new Set(runtime.activeTaskIds||[]),core=!agent,assigned=(core?tasks:tasks.filter(task=>task.assignedAgentId===agent.id)).filter(task=>!['completed','failed','cancelled'].includes(task.status)),savedRunningTasks=assigned.filter(task=>['in_progress','verification_running'].includes(task.status)),liveTasks=assigned.filter(task=>activeTaskIds.has(task.id)&&['in_progress','verification_running'].includes(task.status)),waiting=assigned.some(task=>task.status==='waiting_approval'),offline=core&&!runtime.canExecuteTasks&&!liveTasks.length,agentWaiting=!core&&waiting;
    const button=document.createElement('button');button.type='button';button.className='room-map-node'+(core?' room-map-core':'')+(liveTasks.length?' is-executing':'')+(agentWaiting?' is-waiting':'')+(offline?' is-offline':'');
    button.style.setProperty('--agent-tint',liveTasks.length?'#7cd4af':agentWaiting?'#e9bc77':'#c4b5fd');
    button.dataset.agentSlot=String(slot);
    const focusTask=liveTasks[0]||assigned.find(task=>task.status==='waiting_approval')||assigned[0];
    const avatar=document.createElement('span');avatar.className='room-map-avatar';avatar.setAttribute('aria-hidden','true');const orb=document.createElement('i');orb.className='room-map-avatar-orb';const orbit=document.createElement('i');orbit.className='room-map-avatar-orbit';const glint=document.createElement('i');glint.className='room-map-avatar-glint';const initials=document.createElement('span');initials.textContent=core?'✳':agent.name.split(' ').map(word=>word[0]).slice(0,2).join('').toUpperCase();avatar.append(orb,orbit,glint,initials);
    const name=document.createElement('strong');name.textContent=core?'Workspace':agent.name;
    const detail=document.createElement('small');detail.textContent=focusTask?.title||(core?(runtime.canExecuteTasks?'Execution is ready':'Execution is offline'):(agent.role||'Configured teammate'));
    const top=document.createElement('span');top.className='room-map-node-topline';top.append(avatar,name);
    const unverifiedSavedRun=savedRunningTasks.some(task=>!activeTaskIds.has(task.id));const state=document.createElement('span');state.className='room-map-state'+(liveTasks.length?' is-live':agentWaiting||unverifiedSavedRun?' is-review':'');const stateDot=document.createElement('i');stateDot.setAttribute('aria-hidden','true');const stateText=document.createElement('span');
    stateText.textContent=liveTasks.length?(liveTasks[0].status==='verification_running'?'Verifying':'Active'):core?(runtime.canExecuteTasks?'Ready':'Offline'):waiting?'Review needed':unverifiedSavedRun?'Saved · not running':assigned.length?'Assigned':agent.status==='error'?'Needs attention':agent.status==='paused'?'Paused':'Ready';state.append(stateDot,stateText);
    const count=document.createElement('span');count.className='room-map-count';count.textContent=assigned.length+' open';
    const footer=document.createElement('span');footer.className='room-map-node-footer';footer.append(detail,count);
    button.append(top,state,footer);button.setAttribute('aria-label',core?'Open workspace execution setup':'Select '+agent.name+'; '+stateText.textContent+'; '+count.textContent);
    const node={button,agent,x:0,y:0,link:null,packet:null};nodes.push(node);map.append(button);

    if(!core&&assigned.length){
      node.link=document.createElementNS('http://www.w3.org/2000/svg','path');node.link.classList.add('room-map-link');
      if(liveTasks.length||waiting){const review=waiting&&!liveTasks.length;node.link.classList.add(review?'is-review':'is-executing');node.packet=document.createElementNS(scene.namespaceURI,'circle');node.packet.classList.add('room-map-packet');if(review)node.packet.classList.add('is-review');node.packet.setAttribute('r',review?'3.5':'4');const motion=document.createElementNS(scene.namespaceURI,'animateMotion');motion.setAttribute('dur',review?'2.7s':'1.8s');motion.setAttribute('repeatCount','indefinite');node.packet.append(motion);}
      links.append(node.link);if(node.packet)links.append(node.packet);
    }

    let drag=null,suppressClick=false;
    button.onpointerdown=event=>{if(map.classList.contains('is-compact-layout')||event.button!==0)return;drag={x:event.clientX,y:event.clientY,startX:node.x,startY:node.y,moved:false};button.setPointerCapture(event.pointerId);};
    button.onpointermove=event=>{if(!drag)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;if(Math.hypot(dx,dy)>6)drag.moved=true;if(!drag.moved)return;node.x=Math.max(78,Math.min(width-78,drag.startX+dx));node.y=Math.max(64,Math.min(height-64,drag.startY+dy));button.classList.add('is-dragging');paint();};
    const end=event=>{suppressClick=Boolean(drag?.moved);drag=null;button.classList.remove('is-dragging');if(button.hasPointerCapture(event.pointerId))button.releasePointerCapture(event.pointerId);setTimeout(()=>{suppressClick=false;},0);};
    button.onpointerup=end;button.onpointercancel=end;
    button.onclick=()=>{if(suppressClick)return;if(core){switchView('harnesses');return;}map.querySelector('.room-map-selected-agent')?.remove();map.querySelectorAll('.room-map-node[aria-current=true]').forEach(item=>item.removeAttribute('aria-current'));button.setAttribute('aria-current','true');renderSelectedAgent(agent,assigned,button);};
    button.onfocus=()=>node.link?.classList.add('selected');button.onblur=()=>node.link?.classList.remove('selected');
  }

  function renderSelectedAgent(agent,assigned,trigger){
    const card=document.createElement('aside');card.className='room-map-selected-agent';card.setAttribute('aria-label','Selected teammate details');
    const heading=document.createElement('div');heading.className='room-map-selected-head';const avatar=document.createElement('span');avatar.className='room-map-selected-avatar';avatar.textContent=agent.name.split(' ').map(word=>word[0]).slice(0,2).join('').toUpperCase();const identity=document.createElement('div');const name=document.createElement('strong');name.textContent=agent.name;const role=document.createElement('small');role.textContent=agent.role||'Configured teammate';identity.append(name,role);const close=document.createElement('button');close.type='button';close.className='room-map-selected-close';close.setAttribute('aria-label','Close teammate details');close.textContent='×';close.onclick=()=>{card.remove();trigger.removeAttribute('aria-current');trigger.focus();};heading.append(avatar,identity,close);
    const activeTaskIds=new Set(runtime.activeTaskIds||[]);const hasPendingReview=assigned.some(task=>task.status==='waiting_approval');const hasSavedRun=assigned.some(task=>['in_progress','verification_running'].includes(task.status));const isVerifiedRunning=assigned.some(task=>activeTaskIds.has(task.id)&&['in_progress','verification_running'].includes(task.status));const state=document.createElement('span');state.className='room-map-selected-state'+(hasPendingReview||hasSavedRun&&!isVerifiedRunning?' is-review':'');state.textContent=hasPendingReview?'Review needed':isVerifiedRunning?'Active run verified':hasSavedRun?'Saved active state · no live run':assigned.length?'Assigned work':'No open work';
    const work=document.createElement('div');work.className='room-map-selected-work';const workLabel=document.createElement('span');workLabel.textContent='CURRENT ASSIGNMENT';const workTitle=document.createElement('strong');workTitle.textContent=assigned[0]?.title||'No open task is assigned to this teammate.';work.append(workLabel,workTitle);
    const actions=document.createElement('div');actions.className='room-map-selected-actions';const profile=document.createElement('button');profile.type='button';profile.className='btn btn-sm btn-secondary';profile.textContent='Full profile';profile.onclick=()=>void openWorkspaceAgent(agent,profile);const conversation=document.createElement('button');conversation.type='button';conversation.className='btn btn-sm';conversation.textContent='Start conversation';const feedback=document.createElement('span');feedback.className='room-map-selected-feedback';feedback.setAttribute('role','status');conversation.onclick=()=>void startAgentConversation(agent,conversation,feedback);actions.append(profile,conversation);if(assigned.length){const viewWork=document.createElement('button');viewWork.type='button';viewWork.className='room-map-selected-work-link';viewWork.textContent='View assigned work →';viewWork.onclick=()=>{workboardState.agent=agent.id;switchView('tasks');};actions.append(viewWork);}card.append(heading,state,work,actions,feedback);const detailHost=map.closest('.team-room-layout')?.querySelector('.team-room-side')||map;detailHost.prepend(card);trigger.focus({preventScroll:true});
  }

  addNode(null);visible.forEach((agent,index)=>addNode(agent,index));
  const activeTaskIds=new Set(runtime.activeTaskIds||[]),hasLive=tasks.some(task=>activeTaskIds.has(task.id)&&['in_progress','verification_running'].includes(task.status)),hasSavedActive=tasks.some(task=>!activeTaskIds.has(task.id)&&['in_progress','verification_running'].includes(task.status)),hasReview=tasks.some(task=>task.status==='waiting_approval');
  const legend=document.createElement('p');legend.className='room-map-legend';const cues=[];if(hasLive)cues.push('Green shows a task running now');if(hasSavedActive)cues.push('Saved active status is not a live run');if(hasReview)cues.push('Amber shows a decision waiting for review');if(!cues.length)cues.push(runtime.canExecuteTasks?'No active run or review is waiting':'Execution is offline');cues.push('Lines show assigned work');legend.textContent=(agents.length>8?'Showing 8 of '+agents.length+' teammates · ':'')+cues.join(' · ')+'.';map.append(legend);

  function paint(){
    for(const node of nodes){
      node.button.style.left=node.x+'px';node.button.style.top=node.y+'px';
      if(!node.link)continue;
      const core=nodes[0],mapRect=map.getBoundingClientRect(),coreRect=core.button.getBoundingClientRect(),nodeRect=node.button.getBoundingClientRect();
      const center=(rect)=>({x:rect.left-mapRect.left+rect.width/2,y:rect.top-mapRect.top+rect.height/2});
      const edge=(rect,origin,target)=>{const dx=target.x-origin.x,dy=target.y-origin.y;const xScale=Math.abs(dx)>0?(rect.width/2)/Math.abs(dx):Infinity,yScale=Math.abs(dy)>0?(rect.height/2)/Math.abs(dy):Infinity,scale=Math.min(xScale,yScale);return{x:origin.x+dx*scale,y:origin.y+dy*scale};};
      const coreCenter=center(coreRect),nodeCenter=center(nodeRect),start=edge(coreRect,coreCenter,nodeCenter),end=edge(nodeRect,nodeCenter,coreCenter),dy=end.y-start.y;
      const d='M '+start.x+' '+start.y+' C '+start.x+' '+(start.y+dy*.45)+', '+end.x+' '+(end.y-dy*.45)+', '+end.x+' '+end.y;
      node.link.setAttribute('d',d);node.packet?.querySelector('animateMotion')?.setAttribute('path',d);
    }
  }
  function layout(){
    const next=map.clientWidth;if(!next)return;width=next;
    const narrow=width<820,compactViewport=narrow&&width>=580&&visible.length<=2,columns=width<340?1:2,rows=Math.ceil(visible.length/columns),orbitLayout=!narrow&&visible.length>0;
    // Give short displays a compact hub-and-spoke layout with room for the cards.
    map.classList.toggle('is-compact-layout',compactViewport);map.classList.toggle('has-one-agent',visible.length===1);
    height=narrow?(compactViewport?220:Math.max(430,370+Math.max(0,rows-1)*180)):Math.max(470,visible.length>2?520:470);
    map.style.height=height+'px';links.setAttribute('viewBox','0 0 '+width+' '+height);scene.setAttribute('viewBox','0 0 '+width+' '+height);scene.style.setProperty('--room-map-center-x',width/2+'px');scene.style.setProperty('--room-map-center-y',height/2+'px');
    for(const orbit of scene.querySelectorAll('.room-map-orbit')){const angle=Number(orbit.dataset.angle||0),plane=orbit.querySelector('.room-map-orbit-plane'),ellipse=orbit.querySelector('ellipse'),satellite=orbit.querySelector('.room-map-satellite'),rxRatio=Number(ellipse.dataset.rx),ryRatio=Number(ellipse.dataset.ry),rx=Math.min(width*rxRatio,300),ry=Math.min(height*ryRatio,150);plane.setAttribute('transform','rotate('+angle+' '+width/2+' '+height/2+')');ellipse.setAttribute('cx',String(width/2));ellipse.setAttribute('cy',String(height/2));ellipse.setAttribute('rx',String(rx));ellipse.setAttribute('ry',String(ry));satellite.setAttribute('cx',String(width/2+rx));satellite.setAttribute('cy',String(height/2));}
    nodes[0].x=width/2;nodes[0].y=narrow?(compactViewport?66:92):height/2;
    visible.forEach((_,index)=>{const node=nodes[index+1];if(narrow){node.x=compactViewport?(visible.length===1?width/2:width*(index===0?.25:.75)):columns===1?width/2:width*(index%2===0?.25:.75);node.y=compactViewport?160:278+Math.floor(index/columns)*180;return;}if(orbitLayout){const angle=visible.length===1?Math.PI:visible.length===2?(index===0?Math.PI*.83:Math.PI*1.83):Math.PI+(Math.PI*2*index/visible.length);node.x=width/2+Math.cos(angle)*Math.min(width*(visible.length===2?.38:.34),visible.length===2?280:250);node.y=height/2+Math.sin(angle)*Math.min(height*(visible.length===2?.28:.32),visible.length===2?108:145);}});paint();
  }

  canvas.replaceWith(map);pending?.remove();
  floorResizeObserver?.disconnect();floorResizeObserver=new ResizeObserver(layout);floorResizeObserver.observe(map);layout();
}
`;
