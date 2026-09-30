import fs from 'node:fs';
import path from 'node:path';
import { features } from '../website/guide-content.mjs';

const root = path.resolve(import.meta.dirname, '..');
const site = path.join(root, 'website');
// Keep the public build generic. A release workflow may provide the actual
// repository URL without baking a maintainer's personal account into source.
const repo = process.env.AGENTFORGE_PUBLIC_REPO_URL || 'https://github.com/agentforge/agentforge';
const esc = s => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const guides = [
  ['install','Install AgentForge','From a clean checkout to your first working conversation.','website/content/install.md'],
  ['telegram','Connect Telegram','Create a BotFather bot, configure its token and verify the connection.','website/content/telegram.md'],
  ['discord','Connect Discord','Configure a bot and validate messages in a test server.','docs/DISCORD_SETUP.md'],
  ['slack','Connect Slack','Set up Socket Mode and verify a complete message round trip.','docs/SLACK_SETUP.md'],
  ['model-router','Connect a model','Configure a real conversation route and understand what context it receives.','docs/CHAT_SETUP.md'],
  ['setup-guide','Your first workspace','Let the Setup Guide organize your goal, then connect the capabilities you need.','website/content/setup.md'],
  ['browser-operator','Browser operations','Understand observations, action approval and the browser bridge you need.','docs/BROWSER_OPERATIONS.md'],
  ['operations','Maintain your installation','Start, protect, back up, restore and update your local deployment.','docs/LOCAL_OPERATIONS.md'],
];
const pages = [...features.map(x=>({slug:x[0],title:x[1],intro:x[2],feature:x})),...guides.map(x=>({slug:x[0],title:x[1],intro:x[2],source:x[3]}))];
const linkMap = {'DISCORD_SETUP.md':'discord.html','SLACK_SETUP.md':'slack.html','CHAT_SETUP.md':'model-router.html','LOCAL_OPERATIONS.md':'operations.html','NATIVE_GATEWAY_OPERATIONS.md':'native-channel-gateway.html','PRODUCTION_EXECUTION_BOUNDARY.md':'isolated-execution.html','INSTALLATION.md':'install.html'};
const depth = [
  [['memory-system','operational-memory','handoffs','token-reduction','memory-quality'], 'docs/CHAT_SETUP.md', ['Optional project memory','Recovering and comparing responses']],
  [['workspace','projects-goals','messages-inbox','agent-studio'], 'docs/CHAT_SETUP.md', ['First-run Setup Guide','Behavior']],
  [['tasks-runs','approvals-contracts','evidence-approvals','isolated-execution','compute-tools'], 'docs/PRODUCTION_EXECUTION_BOUNDARY.md', ['What must be true before a worker can run','Explicit approved-command mode']],
  [['native-channel-gateway','channel-mirror','teams-subgroups'], 'docs/NATIVE_GATEWAY_OPERATIONS.md', ['Runtime contract','Hierarchy and mirroring']],
  [['agent-forge','architecture','systems','process-library','procedure-compiler','capabilities'], 'docs/PUBLIC_SYSTEM_ARCHITECTURE.md', ['Workflow Engine','JEv']],
  [['model-cost-routing','context-economy'], 'docs/CHAT_SETUP.md', ['Configure a route','Behavior']],
  [['trust','cryptography','public-marketplace-migration','github','quality-flywheel'], 'docs/LOCAL_OPERATIONS.md', ['Local data and backups','First secure owner setup']],
];
function implementationDepth(slug){
  const rule=depth.find(([slugs])=>slugs.includes(slug));if(!rule)return '';
  const [,file,wanted]=rule;const raw=fs.readFileSync(path.join(root,file),'utf8').replace(/\r/g,'');
  const sections=raw.split(/(?=^## )/m).filter(s=>wanted.some(h=>s.startsWith(`## ${h}\n`)));
  if(sections.length!==wanted.length)throw new Error(`Missing source section for ${slug} in ${file}`);
  return `<h2>Configuration and operating details</h2><p>The following settings and behavior apply to this workflow in the current implementation.</p>`+markdown(sections.join('\n').replace(/^## /gm,'### '));
}
function inline(raw) {
  return esc(raw).replace(/\[([^\]]+)\]\(([^)]+)\)/g,(_,label,url)=>{
    const target = linkMap[path.basename(url.split('#')[0])] || (/^https:\/\//.test(url)?url:`${repo}/blob/vnext/docs/${url.replace(/^\.\//,'')}`);
    return `<a href="${target}">${label}</a>`;
  }).replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
}
function markdown(raw) {
  const lines=raw.replace(/\r/g,'').split('\n'); let html='',paragraph=[],list='',code=null;
  const flush=()=>{if(paragraph.length){html+=`<p>${inline(paragraph.join(' '))}</p>`;paragraph=[];} if(list){html+=`</${list}>`;list='';}};
  for(const line of lines){
    if(line.startsWith('```')){if(code!==null){html+=`<div class="codebox"><button type="button" data-copy>Copy</button><pre><code>${esc(code.join('\n'))}</code></pre></div>`;code=null;}else{flush();code=[];}continue;}
    if(code!==null){code.push(line);continue;}
    if(/^# /.test(line)){flush();continue;}
    if(/^#{2,4} /.test(line)){flush();const level=line.match(/^#+/)[0].length;html+=`<h${level}>${inline(line.replace(/^#+ /,''))}</h${level}>`;continue;}
    if(!line.trim()){flush();continue;}
    const item=line.match(/^\s*(?:([-*])|\d+\.)\s+(.+)$/);
    if(item){if(paragraph.length){html+=`<p>${inline(paragraph.join(' '))}</p>`;paragraph=[];}const type=item[1]?'ul':'ol';if(list!==type){if(list)html+=`</${list}>`;html+=`<${type}>`;list=type;}html+=`<li>${inline(item[2])}</li>`;}
    else if(list){
      // Wrapped Markdown list lines belong to the preceding item, including
      // lines that are not indented. Emitting a paragraph here makes invalid HTML.
      html=html.replace(/<\/li>$/,` ${inline(line.trim())}</li>`);
    }else paragraph.push(line.trim());
  } flush(); return html;
}
const nav = `<a href="learn.html">All guides</a><a href="install.html">Install</a><a href="model-router.html">Models</a><a href="telegram.html">Connect Telegram</a><a href="github.html">GitHub</a>`;
function layout(page,body){
  const headings=[];
  body=body.replace(/<h2>(.*?)<\/h2>/g,(_,t)=>{const id=`section-${headings.length+1}`;headings.push([id,t]);return `<h2 id="${id}">${t}</h2>`;});
  const toc=headings.map(([id,t])=>`<a href="#${id}">${t}</a>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(page.title)} | AgentForge</title><meta name="description" content="${esc(page.intro)}"><link rel="canonical" href="https://agentforge-site.onrender.com/${page.slug}.html"><link rel="icon" href="agentforge-logo.jpg"><link rel="stylesheet" href="guides.css"></head><body><a class="skip" href="#content">Skip to content</a><header class="top"><a class="brand" href="index.html">AgentForge<span> Learn</span></a><nav aria-label="Main navigation">${nav}</nav><details class="mobile-nav"><summary>Menu</summary>${nav}</details></header><div class="guide-layout"><aside class="guide-nav"><label for="guide-search">Find a guide</label><input id="guide-search" type="search" placeholder="Memory, setup, channels…"><nav aria-label="Guide library">${pages.map(p=>`<a data-guide ${p.slug===page.slug?'aria-current="page"':''} href="${p.slug}.html">${esc(p.title)}</a>`).join('')}</nav></aside><main id="content"><div class="eyebrow">AGENTFORGE / USER GUIDE</div><h1>${esc(page.title)}</h1><p class="lead">${esc(page.intro)}</p><div class="actions"><a class="primary" href="install.html">Get started</a><a href="${repo}">View source on GitHub ↗</a></div><details class="toc" open><summary>On this page</summary>${toc}</details><article>${body}</article><section class="next"><h2>Put it into practice</h2><p>Start with a clean local workspace, connect the capability you need and verify a small result before expanding your workflow.</p><a class="primary" href="install.html">Install AgentForge</a> <a href="${repo}">Download source / star on GitHub ↗</a></section></main></div><footer><div><strong>AgentForge</strong><p>Open source workforce tools. Apache-2.0.</p></div><nav aria-label="Footer navigation">${nav}<a href="operations.html">Backup &amp; updates</a><a href="trust.html">Privacy &amp; control</a><a href="${repo}/issues">Report an issue</a><a href="${repo}/blob/vnext/LICENSE">License</a></nav></footer><script src="guides.js" defer></script></body></html>`;
}
for(const page of pages){
  let body;
  if(page.feature){const [,title,,mechanism,steps,example,limits,related,source]=page.feature;
    body=`<h2>What ${esc(title.toLowerCase())} does</h2><p>${esc(mechanism)}</p><h2>Use it in your workflow</h2><p>${esc(steps)}</p><h2>A practical example</h2><div class="example"><span>Illustrative workflow</span><p>${esc(example)}</p></div><h2>What to verify</h2><p>Check the records associated with this workflow, not just the final chat response. Confirm the project, selected configuration and expected output agree. If a provider is involved, validate a real request in your own deployment before treating it as connected.</p><h2>Current boundaries</h2><div class="boundary"><p>${esc(limits)}</p></div><h2>Continue learning</h2><div class="related">${related.split(',').map(slug=>{const p=pages.find(p=>p.slug===slug);return `<a href="${slug}.html">${esc(p?.title||slug)} →</a>`;}).join('')}</div><h2>Implementation reference</h2><p>This guide describes the current public implementation. Developers can inspect <a href="${repo}/blob/vnext/${source}">${esc(source)}</a> for the relevant behavior. This reference supplements the explanation above.</p>`;
    body+=implementationDepth(page.slug);
  }else {
    let text=fs.readFileSync(path.join(root,page.source),'utf8');
    if(page.slug==='slack')text=text.replace(/No workspace token,[\s\S]*?workspace snapshot\./,'Credentials must remain outside the public package. Workspace messages and routing metadata may be retained locally; protect the workspace snapshot as private data.');
    if(['slack','discord'].includes(page.slug))text+='\n'+fs.readFileSync(path.join(site,'content',`${page.slug}-details.md`),'utf8');
    body=markdown(text);
  }
  fs.writeFileSync(path.join(site,`${page.slug}.html`),layout(page,body));
}
const groups=[['Start here',['install','setup-guide','model-router','operations']],['Messaging',['telegram','discord','slack','channel-mirror','native-channel-gateway']],['Work and teams',['workspace','projects-goals','tasks-runs','agent-studio','teams-subgroups','messages-inbox']],['Memory and efficiency',['memory-system','operational-memory','handoffs','token-reduction','context-economy','model-cost-routing','memory-quality','quality-flywheel']],['Execution and trust',['approvals-contracts','evidence-approvals','process-library','procedure-compiler','compute-tools','isolated-execution','browser-operator','cryptography','trust','public-marketplace-migration']],['Understand the system',['agent-forge','systems','architecture','capabilities','github']]];
const hub={slug:'learn',title:'Learn AgentForge',intro:'From your first installation to a repeatable team workflow. Pick a task, follow the guide and know what success looks like.'};
fs.writeFileSync(path.join(site,'learn.html'),layout(hub,groups.map(([name,slugs])=>`<h2>${name}</h2><div class="guide-cards">${slugs.map(slug=>{const p=pages.find(p=>p.slug===slug);return `<a href="${slug}.html"><strong>${esc(p.title)}</strong><p>${esc(p.intro)}</p><span>Read guide →</span></a>`;}).join('')}</div>`).join('')));
// Keep the existing homepage design; expose the guide library beside its install links.
let home=fs.readFileSync(path.join(site,'index.html'),'utf8');
if(!home.includes('href="learn.html"'))home=home.replace('href="install.html"','href="learn.html"').replace('</footer>','<a href="install.html">Installation guide</a></footer>');
fs.writeFileSync(path.join(site,'index.html'),home);
const all=fs.readdirSync(site).filter(f=>f.endsWith('.html')&&f!=='404.html');
fs.writeFileSync(path.join(site,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${all.map(f=>`<url><loc>https://agentforge-site.onrender.com/${f==='index.html'?'':f}</loc></url>`).join('')}</urlset>`);
console.log(`Built ${pages.length} guides and the learning hub.`);
