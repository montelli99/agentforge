import { roomMapClient } from "./roomMapClient.js";
import { draftClient } from "./draftClient.js";
import { projectFilesClient } from "./projectFilesClient.js";
import { evidenceClient } from "./evidenceClient.js";
import { performanceClient } from "./performanceClient.js";
import { goalClient } from "./goalClient.js";
import { documentClient } from "./documentClient.js";
import { migrationClient } from "./migrationClient.js";
import { catalogClient } from "./catalogClient.js";
import { memoryClient } from "./memoryClient.js";
import { preferencesClient } from "./preferencesClient.js";
import { connectionsClient } from "./connectionsClient.js";
import { responseClient } from "./responseClient.js";
import { activityClient } from "./activityClient.js";
import { teamClient } from "./teamClient.js";
import { workboardClient } from "./workboardClient.js";
import { messageClient } from "./messageClient.js";
import { projectClient } from "./projectClient.js";
import { conversationClient } from "./conversationClient.js";
import { workspaceTheme } from "./workspaceTheme.js";
export function renderWorkspaceApp(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AgentForge</title>
  <style>
    :root {
      --bg-void: #111216;
      --bg-base: #18191c;
      --bg-sidebar: #141517;
      --bg-surface: #202125;
      --bg-elevated: #28292e;
      --border: #ffffff12;
      --border-cyan: #c4b5fd40;
      --text-main: #eeeef0;
      --text-muted: #9a9ba5;
      --accent: #c4b5fd;
      --accent-hover: #ddd3ff;
      --accent-dim: #c4b5fd14;
      --green: #7cd4af;
      --green-dim: #7cd4af18;
      --purple: #c4b5fd;
      --purple-dim: #c4b5fd18;
      --amber: #e9bc77;
      --amber-dim: #e9bc7718;
      --red: #ed939f;
      --red-dim: #ed939f18;
      --radius: 12px;
    }
    * { 
      box-sizing: border-box; 
      margin: 0; 
      padding: 0; 
      scrollbar-width: thin;
      scrollbar-color: rgba(196, 181, 253, 0.25) transparent;
    }
    ::-webkit-scrollbar {
      width: 5px;
      height: 5px;
    }
    ::-webkit-scrollbar-track {
      background: transparent;
    }
    ::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 9999px;
      border: 1px solid rgba(255, 255, 255, 0.05);
      transition: background 0.15s;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: rgba(196, 181, 253, 0.5);
      box-shadow: 0 0 10px rgba(196, 181, 253, 0.4);
    }
    ::-webkit-scrollbar-corner {
      background: transparent;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      background-color: #18191c;
      background-image: 
        radial-gradient(ellipse at 15% 10%, rgba(196, 181, 253, 0.08) 0%, transparent 45%),
        radial-gradient(ellipse at 85% 10%, rgba(179, 136, 255, 0.08) 0%, transparent 45%),
        radial-gradient(ellipse at 50% 88%, rgba(0, 230, 118, 0.05) 0%, transparent 55%),
        linear-gradient(rgba(255, 255, 255, 0.015) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.015) 1px, transparent 1px);
      background-size: 100% 100%, 100% 100%, 100% 100%, 36px 36px, 36px 36px;
      color: var(--text-main);
      height: 100vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    
    /* Top Header */
    body > header { height: 46px; flex: 0 0 46px; background: var(--bg-sidebar); border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; padding: 0 1rem; font-size: 0.8rem; }
    .brand { display: flex; align-items: center; gap: 0.5rem; font-weight: 700; font-size: 1rem; color: #fff; }
    .brand-badge { background: var(--accent-dim); color: var(--accent); font-size: 0.65rem; padding: 0.15rem 0.4rem; border-radius: 4px; text-transform: uppercase; font-weight: 600; }
    .header-status { display: flex; align-items: center; gap: 1.5rem; color: var(--text-muted); font-size: 0.8rem; }
    .status-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--green); display: inline-block; margin-right: 0.35rem; }

    /* Main Container: focused workspace navigation */
    .app-container { display: grid; grid-template-columns: 224px minmax(0, 1fr); flex: 1; min-height: 0; overflow: hidden; }

    /* Left Column: Navigation & Tree — Sleek zero-scrollbar */
    .nav-col { 
      width: 224px; 
      min-width: 224px; 
      background: var(--bg-sidebar); 
      border-right: 1px solid var(--border); 
      display: flex; 
      flex-direction: column; 
      align-items: stretch; 
      overflow-y: auto; 
      padding: 14px 12px; 
      scrollbar-width: none; 
      -ms-overflow-style: none; 
    }
    .nav-col::-webkit-scrollbar { 
      display: none; 
      width: 0; 
      height: 0; 
    }
    .nav-section { display:block; padding:16px 10px 6px; color:var(--text-muted); font-size:10px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; }
    .nav-section:first-child { padding-top:4px; }
    .nav-item { width:100%; min-height:38px; display:flex; align-items:center; justify-content:flex-start; gap:11px; margin:2px 0; padding:0 11px; border-radius:8px; color:var(--text-muted); text-decoration:none; font-size:13px; cursor:pointer; transition:all .15s; position:relative; }
    .nav-item svg { width:18px; height:18px; flex:0 0 18px; stroke:currentColor; fill:none; stroke-width:1.8; }
    .nav-item[aria-current="page"] { background:var(--accent-dim); color:var(--accent); }
    .nav-spacer { flex:1; }
    .nav-item:hover { background: var(--bg-surface); color: #fff; }
    .nav-item.active { font-weight: 600; }
    .nav-badge { margin-left:auto; min-width:18px; height:18px; padding:0 5px; display:inline-flex; align-items:center; justify-content:center; border-radius:9px; background:var(--accent-dim); color:var(--accent); font-size:10px; font-weight:700; }
    .nav-badge.alert { background: var(--amber); }

    /* Center Column: View / Chat / Visualizer */
    .main-col { min-width:0; display: flex; flex-direction: column; background: var(--bg-base); overflow: hidden; }
    .view-header { height: 48px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; padding: 0 1.25rem; background: var(--bg-sidebar); }
    .view-title { font-weight: 600; font-size: 0.95rem; }
    .view-content { flex: 1; overflow-y: auto; padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; }

    /* Right Column: Context Panel */
    .context-col { display:none; }
    .context-card { background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 0.85rem; }
    .card-title { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.5rem; letter-spacing: 0.05em; }

    /* Chat Elements */
    .chat-messages { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 0.75rem; }
    .message-row { display: flex; gap: 0.75rem; }
    .message-avatar { width: 32px; height: 32px; border-radius: 6px; background: var(--accent-dim); display: flex; align-items: center; justify-content: center; font-size: 1rem; }
    .message-body { flex: 1; background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 0.65rem 0.85rem; }
    .message-meta { display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.25rem; }
    .message-meta .author { font-weight: 600; color: #fff; }
    .message-text { font-size: 0.85rem; line-height: 1.4; }
    .btn { background: linear-gradient(135deg, #c4b5fd, #aa98ee); color: #000; border: none; padding: 0.55rem 1.1rem; border-radius: 6px; font-size: 0.8rem; font-weight: 700; cursor: pointer; transition: all 0.15s; font-family: inherit; box-shadow: 0 0 12px rgba(196,181,253,0.25); }
    .btn:hover { background: linear-gradient(135deg, #ddd3ff, #c4b5fd); box-shadow: 0 0 20px rgba(196,181,253,0.45); transform: translateY(-1px); }
    .btn-secondary { background: rgba(14, 26, 44, 0.7); border: 1px solid rgba(255, 255, 255, 0.1); color: var(--text-main); box-shadow: none; }
    .btn-secondary:hover { background: rgba(22, 38, 62, 0.9); border-color: rgba(196, 181, 253, 0.3); color: #fff; }
    .btn-danger { background: linear-gradient(135deg, #ff5252, #d32f2f); color: #fff; box-shadow: 0 0 12px rgba(255,82,82,0.3); }
    .btn-danger:hover { background: #ff1744; }
    .btn-sm { padding: 0.3rem 0.65rem; font-size: 0.72rem; }

    /* Cards & Lists */
    .grid-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 1rem; }
    .item-card { background: rgba(10, 20, 34, 0.72); backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px; padding: 1.1rem; display: flex; flex-direction: column; gap: 0.5rem; box-shadow: 0 8px 24px rgba(0,0,0,0.4); transition: border-color 0.15s, box-shadow 0.15s; }
    .item-card:hover { border-color: rgba(196, 181, 253, 0.25); box-shadow: 0 8px 30px rgba(0,0,0,0.6), 0 0 15px rgba(196,181,253,0.08); }
    .badge { display: inline-block; font-size: 0.65rem; font-weight: 700; padding: 0.2rem 0.5rem; border-radius: 4px; text-transform: uppercase; font-family: inherit; letter-spacing: 0.04em; }
    .badge-green { background: rgba(0, 230, 118, 0.15); color: #00e676; border: 1px solid rgba(0, 230, 118, 0.3); }
    .badge-amber { background: rgba(255, 145, 0, 0.15); color: #ff9100; border: 1px solid rgba(255, 145, 0, 0.3); }
    .badge-red { background: rgba(255, 82, 82, 0.15); color: #ff5252; border: 1px solid rgba(255, 82, 82, 0.3); }
    .badge-blue { background: rgba(196, 181, 253, 0.15); color: #c4b5fd; border: 1px solid rgba(196, 181, 253, 0.3); }

    /* Modal */
    .modal-overlay { display: none; position: fixed; inset: 0; background: rgba(2, 4, 10, 0.85); backdrop-filter: blur(8px); align-items: center; justify-content: center; z-index: 100; }
    .modal-overlay.active { display: flex; }
    .modal-box { background: rgba(10, 20, 34, 0.95); backdrop-filter: blur(20px); border: 1px solid rgba(196, 181, 253, 0.3); border-radius: 12px; width: 560px; max-width: 90vw; padding: 1.75rem; display: flex; flex-direction: column; gap: 1rem; max-height: 85vh; overflow-y: auto; box-shadow: 0 16px 48px rgba(0,0,0,0.8), 0 0 30px rgba(196,181,253,0.15); }
    .modal-title { font-size: 1.2rem; font-weight: 700; font-family: inherit; color: #fff; }
    .form-group { display: flex; flex-direction: column; gap: 0.35rem; }
    .form-label { font-size: 0.75rem; font-weight: 600; color: var(--text-muted); font-family: inherit; text-transform: uppercase; letter-spacing: 0.05em; }
    .form-control { background: rgba(4, 8, 16, 0.8); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 6px; color: #fff; padding: 0.6rem 0.85rem; font-size: 0.85rem; outline: none; transition: border-color 0.15s, box-shadow 0.15s; }
    .form-control:focus { border-color: #c4b5fd; box-shadow: 0 0 12px rgba(196,181,253,0.25); }

    /* Next-Gen AI Developer Harness Chat & Artifact Drawer */
    .chat-layout { display: grid; grid-template-columns: 210px minmax(0, 1fr) 360px; height: 100%; min-height: 0; gap: 12px; flex: 1; overflow: hidden; }
    .chat-layout.drawer-collapsed { grid-template-columns: 210px minmax(0, 1fr); }
    .chat-layout.drawer-collapsed .chat-context-drawer { display: none !important; }
    @media(max-width:1250px){ .chat-layout { grid-template-columns: 200px minmax(0, 1fr) 320px; } }
    @media(max-width:960px){ .chat-layout { grid-template-columns: 180px minmax(0, 1fr); } .chat-context-drawer { display: none !important; } }
    @media(max-width:700px){ .chat-layout { grid-template-columns: minmax(0, 1fr); } .chat-channels-pane { display: none !important; } }
    .chat-channels-pane { background: rgba(6,12,22,0.85); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 8px; overflow-y: auto; backdrop-filter: blur(16px); }
    .chat-channel-item { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 8px; color: #94a3b8; font-size: 12px; cursor: pointer; transition: all 0.15s; }
    .chat-channel-item:hover { background: rgba(196,181,253,0.08); color: #f1f5f9; }
    .chat-channel-item.active { background: rgba(196,181,253,0.15); color: #c4b5fd; font-weight: 600; border-left: 2px solid #c4b5fd; }
    .chat-agent-item { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 8px; color: #cbd5e1; font-size: 12px; cursor: pointer; transition: all 0.15s; }
    .chat-agent-item:hover { background: rgba(179,136,255,0.08); color: #fff; }
    .chat-agent-item.active { background: rgba(179,136,255,0.15); color: #d4b8ff; font-weight: 600; border-left: 2px solid #b388ff; }
    .chat-main-pane { display: flex; flex-direction: column; height: 100%; min-height: 0; background: rgba(10,20,34,0.72); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; backdrop-filter: blur(16px); overflow: hidden; }
    .chat-head-bar { height: 46px; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: space-between; padding: 0 16px; background: rgba(6,12,22,0.6); flex-shrink: 0; }
    .chat-task-banner { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 14px; background: rgba(196, 181, 253, 0.06); border-bottom: 1px solid rgba(196, 181, 253, 0.2); animation: fadeInMsg 0.2s ease-out; flex-shrink: 0; }
    .task-banner-left { display: flex; align-items: center; gap: 10px; min-width: 0; }
    .task-banner-spinner { width: 14px; height: 14px; border: 2px solid rgba(196, 181, 253, 0.2); border-top-color: #c4b5fd; border-radius: 50%; animation: spin 0.8s linear infinite; flex-shrink: 0; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .task-banner-text { font-size: 11px; font-family: inherit; color: #cbd5e1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .task-banner-actions { display: flex; gap: 6px; flex-shrink: 0; }
    .chat-feed { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 14px; }
    .chat-msg { display: flex; gap: 12px; max-width: 90%; animation: fadeInMsg 0.2s ease-out; }
    @keyframes fadeInMsg { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    .chat-msg.user { margin-left: auto; flex-direction: row-reverse; }
    .chat-avatar { width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px; flex-shrink: 0; }
    .chat-avatar.user { background: linear-gradient(135deg,#c4b5fd,#7c4dff); color: #000; box-shadow: 0 0 12px rgba(196,181,253,0.3); }
    .chat-avatar.agent { background: linear-gradient(135deg,#1e1b4b,#0f172a); border: 1px solid rgba(196,181,253,0.4); color: #c4b5fd; box-shadow: 0 0 12px rgba(196,181,253,0.15); }
    .chat-bubble { padding: 12px 16px; border-radius: 12px; font-size: 13px; line-height: 1.6; }
    .chat-msg.user .chat-bubble { background: rgba(196,181,253,0.1); border: 1px solid rgba(196,181,253,0.3); color: #f8fafc; border-top-right-radius: 2px; }
    .chat-msg.agent .chat-bubble { background: rgba(6,12,22,0.85); border: 1px solid rgba(255,255,255,0.1); color: #e2e8f0; border-top-left-radius: 2px; box-shadow: 0 4px 20px rgba(0,0,0,0.4); }
    .chat-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 11px; }
    .chat-meta .agent-name { font-weight: 700; color: #fff; font-family: inherit; }
    .chat-meta .model-badge { font-size: 9px; padding: 1px 6px; border-radius: 4px; background: rgba(196,181,253,0.15); color: #c4b5fd; font-family: monospace; }
    .chat-meta .time { color: #64748b; font-size: 10px; margin-left: auto; }
    .chat-thought-trace { margin: 8px 0; border: 1px solid rgba(179,136,255,0.25); border-radius: 8px; background: rgba(0,0,0,0.35); overflow: hidden; }
    .chat-thought-header { padding: 6px 10px; font-size: 11px; font-family: monospace; color: #d4b8ff; display: flex; align-items: center; justify-content: space-between; cursor: pointer; background: rgba(179,136,255,0.06); }
    .chat-thought-body { padding: 10px; font-size: 11px; font-family: ui-monospace,SFMono-Regular,Consolas,monospace; line-height: 1.6; color: #94a3b8; border-top: 1px solid rgba(179,136,255,0.15); }
    .chat-tool-card { margin: 8px 0; padding: 10px 12px; border: 1px solid rgba(196,181,253,0.25); border-radius: 8px; background: rgba(0,0,0,0.45); font-family: ui-monospace,SFMono-Regular,Consolas,monospace; font-size: 11px; }
    .chat-actions { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
    .chat-interactive-box { margin: 10px 0; padding: 12px 14px; background: rgba(4, 10, 20, 0.7); border: 1px solid rgba(196, 181, 253, 0.35); border-radius: 10px; box-shadow: 0 4px 20px rgba(196, 181, 253, 0.08); }
    .chat-interactive-title { font-size: 13px; font-weight: 700; color: #fff; font-family: inherit; display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
    .chat-interactive-sub { font-size: 11px; color: #94a3b8; line-height: 1.5; margin-bottom: 10px; }
    .chat-choice-grid { display: flex; flex-direction: column; gap: 8px; }
    .chat-choice-card { display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; border-radius: 8px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); cursor: pointer; transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); text-align: left; }
    .chat-choice-card:hover { background: rgba(196, 181, 253, 0.08); border-color: #c4b5fd; transform: translateX(3px); box-shadow: 0 0 15px rgba(196, 181, 253, 0.2); }
    .chat-choice-radio { width: 14px; height: 14px; border-radius: 50%; border: 2px solid rgba(196, 181, 253, 0.5); margin-top: 2px; flex-shrink: 0; }
    .chat-choice-card:hover .chat-choice-radio { border-color: #c4b5fd; background: rgba(196, 181, 253, 0.3); }
    .chat-choice-body { flex: 1; min-width: 0; }
    .chat-choice-heading { font-size: 12px; font-weight: 700; color: #f1f5f9; display: flex; align-items: center; gap: 6px; }
    .chat-choice-desc { font-size: 11px; color: #94a3b8; margin-top: 2px; line-height: 1.4; }
    .chat-interactive-actions { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
    .chat-action-btn { padding: 5px 11px; border-radius: 6px; font-size: 11px; font-weight: 600; background: rgba(196, 181, 253, 0.1); border: 1px solid rgba(196, 181, 253, 0.25); color: #c4b5fd; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; gap: 5px; }
    .chat-action-btn:hover { background: rgba(196, 181, 253, 0.25); border-color: #c4b5fd; color: #fff; box-shadow: 0 0 12px rgba(196, 181, 253, 0.3); }

    /* Ultra-Clean Modern Composer (Antigravity Style) */
    .chat-cockpit { border-top: 1px solid rgba(255,255,255,0.08); background: rgba(6,12,22,0.85); padding: 12px 16px 14px; display: flex; flex-direction: column; gap: 8px; backdrop-filter: blur(16px); }
    .cockpit-box { background: rgba(14,24,42,0.7); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 10px 14px 10px; display: flex; flex-direction: column; gap: 6px; transition: border-color 0.2s, box-shadow 0.2s; }
    .cockpit-box:focus-within { border-color: rgba(196,181,253,0.45); box-shadow: 0 0 20px rgba(196,181,253,0.12); }
    .cockpit-textarea { width: 100%; min-height: 52px; max-height: 140px; resize: none; background: transparent; border: none; color: #fff; padding: 0; font-size: 13px; font-family: inherit; outline: none; line-height: 1.55; }
    .cockpit-textarea::placeholder { color: #64748b; font-size: 12.5px; }
    .cockpit-bottom-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.05); }
    .cockpit-tools-left { display: flex; align-items: center; gap: 6px; }
    .cockpit-model-select { background: rgba(6,12,22,0.85); border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; color: #c4b5fd; font-size: 11px; font-weight: 600; padding: 4px 8px; outline: none; cursor: pointer; transition: all 0.15s; }
    .cockpit-model-select:hover { border-color: rgba(196,181,253,0.35); }
    .cockpit-tool-pill { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; color: #94a3b8; font-size: 11px; padding: 3px 8px; cursor: pointer; transition: all 0.15s; font-family: inherit; }
    .cockpit-tool-pill:hover { background: rgba(196,181,253,0.1); color: #c4b5fd; border-color: rgba(196,181,253,0.3); }
    .cockpit-tools-right { display: flex; align-items: center; gap: 10px; }
    .cockpit-token-counter { font-size: 10px; color: #64748b; font-family: ui-monospace,monospace; }
    .cockpit-send-btn { width: 32px; height: 32px; border-radius: 8px; background: linear-gradient(135deg,#c4b5fd,#aa98ee); color: #000; border: none; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 12px rgba(196,181,253,0.3); flex-shrink: 0; }
    .cockpit-send-btn:hover { background: linear-gradient(135deg,#ddd3ff,#c4b5fd); box-shadow: 0 0 20px rgba(196,181,253,0.5); transform: translateY(-1px); }
    .chat-context-drawer { background: rgba(6,12,22,0.92); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 0; display: flex; flex-direction: column; overflow: hidden; backdrop-filter: blur(16px); }
    .drawer-tabs { display: flex; border-bottom: 1px solid rgba(255,255,255,0.08); background: rgba(4,8,16,0.6); flex-shrink: 0; }
    .drawer-tab { flex: 1; padding: 10px 8px; font-size: 11px; font-weight: 600; font-family: inherit; color: #94a3b8; border: none; background: transparent; cursor: pointer; text-align: center; transition: all 0.15s; border-bottom: 2px solid transparent; }
    .drawer-tab:hover { color: #f1f5f9; background: rgba(255,255,255,0.03); }
    .drawer-tab.active { color: #c4b5fd; border-bottom-color: #c4b5fd; background: rgba(196,181,253,0.05); }
    .drawer-content-pane { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 12px; }
    .diff-viewer { background: #030712; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 11px; line-height: 1.5; overflow-x: auto; }
    .diff-file-head { background: rgba(255,255,255,0.05); padding: 6px 10px; font-weight: 600; color: #cbd5e1; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: space-between; }
    .diff-lines { padding: 8px 0; }
    .diff-line { padding: 1px 10px; display: flex; white-space: pre; }
    .diff-line.add { background: rgba(0, 230, 118, 0.12); color: #4ade80; }
    .diff-line.del { background: rgba(255, 82, 82, 0.12); color: #f87171; }
    .diff-line.info { color: #60a5fa; background: rgba(96, 165, 250, 0.08); }
    .diff-line.ctx { color: #94a3b8; }
    .settings-container { max-width: 1040px; margin: 0 auto; width: 100%; display: flex; flex-direction: column; gap: 16px; padding-bottom: 40px; }
    .settings-nav-bar { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(138px, 100%), 1fr)); gap: 6px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px; }
    .settings-nav-btn { width: 100%; min-width: 0; padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); background: rgba(10,20,34,0.6); color: #94a3b8; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s; font-family: inherit; white-space: normal; text-align: center; }
    .settings-nav-btn:hover { color: #fff; background: rgba(196,181,253,0.08); border-color: rgba(196,181,253,0.2); }
    .settings-nav-btn.active { color: #000; background: #c4b5fd; font-weight: 700; border-color: #c4b5fd; box-shadow: 0 0 15px rgba(196,181,253,0.3); }
    .settings-panel { display: flex; flex-direction: column; gap: 16px; }
    .settings-card { background: rgba(10,20,34,0.72); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 18px; display: flex; flex-direction: column; gap: 14px; backdrop-filter: blur(16px); }
    .settings-card-head { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 10px; }
    .settings-card-title { font-size: 14px; font-weight: 700; color: #fff; font-family: inherit; display: flex; align-items: center; gap: 8px; }
    .settings-field-row { display: grid; grid-template-columns: 220px 1fr; gap: 16px; align-items: center; }
    .settings-field-label { font-size: 12px; font-weight: 600; color: #cbd5e1; }
    .settings-field-desc { font-size: 11px; color: #64748b; margin-top: 2px; }
    .toast-notification { position: fixed; bottom: 24px; right: 24px; padding: 12px 20px; border-radius: 8px; background: #00e676; color: #000; font-weight: 700; font-size: 13px; box-shadow: 0 8px 30px rgba(0,230,118,0.4); z-index: 9999; animation: slideInToast 0.25s ease-out; }
    @keyframes slideInToast { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    .home-page { max-width:1320px; margin:0 auto; width:100%; }
    .home-page .main-head { display:flex; align-items:flex-start; justify-content:space-between; gap:20px; margin:4px 0 24px; }
    .home-page .main-title { font-size:28px; line-height:1.2; letter-spacing:-.04em; }
    .home-page .main-sub { max-width:720px; color:var(--text-muted); font-size:14px; line-height:1.55; margin-top:7px; }
    .home-actions { display:flex; gap:9px; flex-wrap:wrap; }
    .home-state { display:flex; align-items:flex-start; gap:14px; padding:16px 18px; margin-bottom:22px; border:1px solid var(--amber); border-radius:10px; background:var(--amber-dim); }
    .home-state-icon { width:30px; height:30px; flex:0 0 30px; display:flex; align-items:center; justify-content:center; border-radius:50%; background:rgba(240,160,48,.18); color:var(--amber); font-size:16px; font-weight:700; }
    .home-state strong { display:block; color:var(--text-main); font-size:14px; margin-bottom:3px; }
    .home-state p { color:var(--text-muted); font-size:12px; line-height:1.5; }
    .home-sections { display:grid; grid-template-columns:minmax(0,1.15fr) minmax(320px,.85fr); gap:18px; align-items:start; }
    .home-stack { display:flex; flex-direction:column; gap:18px; min-width:0; }
    .home-panel { background:var(--bg-sidebar); border:1px solid var(--border); border-radius:10px; padding:18px; min-width:0; }
    .home-panel-head { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:14px; }
    .home-panel-title { font-size:15px; font-weight:650; letter-spacing:-.01em; }
    .home-panel-count { color:var(--text-muted); font-size:12px; }
    .home-empty { display:flex; flex-direction:column; align-items:flex-start; color:var(--text-muted); font-size:13px; line-height:1.6; padding:8px 0 2px; }
    .home-empty strong { color:var(--text-main); font-size:14px; margin-bottom:3px; }
    .home-empty .btn { margin-top:12px; }
    .home-work-list { display:flex; flex-direction:column; gap:9px; }
    .home-work-item { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px; border:1px solid var(--border); border-radius:8px; background:var(--bg-base); }
    .home-work-item strong { display:block; font-size:13px; margin-bottom:4px; }
    .home-work-item span { color:var(--text-muted); font-size:11px; }
    .home-runtime-details { margin-top:18px; border-top:1px solid var(--border); padding-top:14px; }
    .home-runtime-details summary { color:var(--text-muted); font-size:12px; cursor:pointer; }
    .home-runtime-details .runtime-copy { color:var(--text-muted); font-size:12px; line-height:1.6; margin-top:10px; }
    .forge-room { --room-line:rgba(163,177,203,.13); max-width:1500px; margin:0 auto; width:100%; color:#eef2fb; }
    .forge-topline { display:flex; align-items:center; gap:10px; color:#8d9ab2; font:10px ui-monospace,SFMono-Regular,Consolas,monospace; letter-spacing:.13em; text-transform:uppercase; }
    .forge-live-dot { width:7px; height:7px; border-radius:50%; background:var(--amber); box-shadow:0 0 12px rgba(255,190,83,.45); }
    .forge-room { --room-line: rgba(196, 181, 253, 0.15); max-width: 1560px; margin: 0 auto; width: 100%; color: #eef2fb; }
    .forge-topline { display: flex; align-items: center; gap: 10px; color: #8d9ab2; font: 10px ui-monospace,SFMono-Regular,Consolas,monospace; letter-spacing: .13em; text-transform: uppercase; }
    .forge-live-dot { width: 8px; height: 8px; border-radius: 50%; background: #00e676; box-shadow: 0 0 12px #00e676; }
    .forge-header { height: auto; flex: 0 0 auto; display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; padding: 22px 0 24px; border: 0; border-bottom: 1px solid var(--room-line); background: transparent; }
    .forge-header h1 { margin-top: 10px; font-size: clamp(32px,4vw,46px); line-height: 1.1; letter-spacing: -0.04em; font-weight: 700; font-family: inherit; background: linear-gradient(135deg, #fff, #94a3b8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .forge-header p { margin-top: 10px; max-width: 700px; color: #94a3b8; font-size: 13px; line-height: 1.6; }
    .forge-identity { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; color: #aab5c9; font: 11px ui-monospace,SFMono-Regular,Consolas,monospace; }
    .forge-identity strong { color: #c4b5fd; font: 700 13px inherit; }
    .forge-metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin: 18px 0; }
    .forge-metric { position: relative; overflow: hidden; min-height: 102px; padding: 16px 18px; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.03), transparent 70%), rgba(10, 20, 34, 0.75); backdrop-filter: blur(16px); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08); transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s; }
    .forge-metric:hover { transform: translateY(-2px); border-color: rgba(196, 181, 253, 0.35); box-shadow: 0 12px 28px rgba(0, 0, 0, 0.6), 0 0 20px rgba(196, 181, 253, 0.15); }
    .forge-metric:before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent, #c4b5fd, transparent); }
    .forge-metric span { display: flex; align-items: center; justify-content: space-between; color: #94a3b8; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; font-family: inherit; font-weight: 600; }
    .forge-metric strong { display: block; margin-top: 6px; font-size: 32px; font-weight: 700; letter-spacing: -0.02em; font-family: inherit; color: #fff; text-shadow: 0 0 20px rgba(196, 181, 253, 0.2); }
    .forge-metric small { display: flex; align-items: center; gap: 6px; margin-top: 4px; color: #64748b; font-size: 11px; font-family: inherit; }
    .forge-grid { display: grid; grid-template-columns: minmax(220px, .72fr) minmax(380px, 1.5fr) minmax(250px, .8fr); gap: 14px; align-items: stretch; }
    .forge-panel { min-width: 0; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; background: rgba(10, 20, 34, 0.72); backdrop-filter: blur(16px); box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.06); }
    .forge-panel-head { min-height: 49px; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 0 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); }
    .forge-panel-head h2 { color: #f1f5f9; font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; font-family: inherit; }
    .forge-panel-head span { color: #c4b5fd; font: 10px ui-monospace,SFMono-Regular,Consolas,monospace; font-weight: 700; }
    .forge-roster { display: flex; flex-direction: column; gap: 8px; padding: 12px; }
    .forge-agent { display: flex; gap: 10px; align-items: center; min-width: 0; padding: 10px 12px; border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 8px; background: rgba(4, 7, 14, 0.5); transition: border-color 0.15s; }
    .forge-agent:hover { border-color: rgba(196, 181, 253, 0.3); }
    .forge-agent-mark { width: 30px; height: 30px; flex: 0 0 30px; display: grid; place-items: center; border-radius: 8px; color: #c4b5fd; font-size: 11px; font-weight: 700; background: rgba(196, 181, 253, 0.12); border: 1px solid rgba(196, 181, 253, 0.25); box-shadow: 0 0 10px rgba(196, 181, 253, 0.15); }
    .forge-agent-copy { min-width: 0; flex: 1; }
    .forge-agent-copy strong { display: block; overflow: hidden; color: #fff; font-size: 12px; font-family: inherit; text-overflow: ellipsis; white-space: nowrap; }
    .forge-agent-copy span { display: block; margin-top: 2px; color: #94a3b8; font-size: 10px; }
    .forge-state { width: 7px; height: 7px; flex: 0 0 7px; border-radius: 50%; background: #64748b; }
    .forge-state.working { background: #00e676; box-shadow: 0 0 10px #00e676; }
    .forge-state.error { background: #ff5252; box-shadow: 0 0 10px #ff5252; }
    .forge-empty { margin: 13px; padding: 18px; border: 1px dashed rgba(255, 255, 255, 0.12); border-radius: 8px; color: #94a3b8; font-size: 11px; line-height: 1.6; }
    .forge-empty strong { display: block; margin-bottom: 5px; color: #f1f5f9; font-size: 13px; }
    .forge-empty .btn { margin-top: 10px; }
    .forge-floor { position: relative; min-height: 340px; overflow: hidden; border-radius: 10px; background: #030712; }
    .forge-core { position: absolute; left: 50%; top: 50%; width: 114px; height: 114px; transform: translate(-50%,-50%); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; border: 1px solid rgba(196, 181, 253, 0.4); border-radius: 50%; background: radial-gradient(circle at 45% 35%, #081a2e, #020814 72%); box-shadow: 0 0 38px rgba(196, 181, 253, 0.2), inset 0 0 20px rgba(196, 181, 253, 0.1); text-align: center; }
    .forge-core span { color: #c4b5fd; font: 9px ui-monospace,SFMono-Regular,Consolas,monospace; letter-spacing: .1em; }
    .forge-core strong { font-size: 13px; }
    .forge-core small { color: #8a96aa; font-size: 9px; }
    .forge-link { position: absolute; left: 50%; top: 50%; width: var(--link-width); height: 1px; transform: rotate(var(--link-angle)); transform-origin: left; background: linear-gradient(90deg, rgba(196, 181, 253, 0.45), rgba(163, 177, 203, .08)); }
    .forge-node { position: absolute; left: var(--node-x); top: var(--node-y); transform: translate(-50%,-50%); display: flex; align-items: center; gap: 7px; max-width: 135px; padding: 7px 9px; border: 1px solid rgba(196, 181, 253, 0.2); border-radius: 7px; background: #0c1828; color: inherit; font: inherit; text-align: left; cursor: pointer; box-shadow: 0 8px 18px rgba(0,0,0,.4); }
    .forge-node:hover, .forge-node:focus-visible { outline: 2px solid #c4b5fd; outline-offset: 2px; background: #122238; }
    .forge-node .forge-agent-mark { width: 22px; height: 22px; flex-basis: 22px; font-size: 9px; }
    .forge-node strong { overflow: hidden; color: #dbe2ee; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
    .forge-floor-note { position: absolute; left: 14px; bottom: 12px; color: #718097; font: 9px ui-monospace,SFMono-Regular,Consolas,monospace; }
    .forge-task-list, .forge-event-list { display: flex; flex-direction: column; gap: 0; padding: 4px 14px; }
    .forge-task, .forge-event { display: flex; align-items: flex-start; gap: 10px; padding: 11px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.06); }
    .forge-task:last-child, .forge-event:last-child { border-bottom: 0; }
    .forge-task-pin { width: 7px; height: 7px; flex: 0 0 7px; margin-top: 5px; border: 1px solid #c4b5fd; border-radius: 50%; box-shadow: 0 0 6px #c4b5fd; }
    .forge-task-copy, .forge-event-copy { min-width: 0; flex: 1; }
    .forge-task-copy strong, .forge-event-copy strong { display: block; color: #f1f5f9; font-size: 11px; line-height: 1.4; font-family: inherit; }
    .forge-task-copy span, .forge-event-copy span { display: block; margin-top: 3px; color: #94a3b8; font-size: 10px; line-height: 1.45; }
    .forge-task .badge { margin-left: auto; white-space: nowrap; }
    .forge-review { margin: 12px; padding: 12px; border: 1px solid rgba(255, 145, 0, 0.3); border-radius: 8px; background: rgba(255, 145, 0, 0.06); }
    .forge-review strong { color: #ff9100; font-size: 11px; font-family: inherit; }
    .forge-review p { margin-top: 5px; color: #cbd5e1; font-size: 11px; line-height: 1.5; }
    .forge-foot { display: flex; justify-content: space-between; gap: 15px; margin-top: 14px; color: #64748b; font-size: 11px; line-height: 1.5; }
    .forge-foot button { padding: 0; border: 0; color: #c4b5fd; background: none; font: inherit; cursor: pointer; font-weight: 600; }
    .goal-workspace { max-width:1120px; margin:0 auto; width:100%; }
    .goal-intro { display:grid; grid-template-columns:minmax(0,1fr) minmax(270px,.55fr); gap:20px; align-items:stretch; margin-bottom:20px; }
    .goal-intro-copy,.goal-compose,.goal-record { background:var(--bg-sidebar); border:1px solid var(--border); border-radius:12px; }
    .goal-intro-copy { padding:26px; background:radial-gradient(ellipse at 88% 5%,rgba(120,105,255,.18),transparent 44%),var(--bg-sidebar); }
    .goal-kicker { color:var(--accent); font-size:10px; letter-spacing:.15em; font-weight:750; text-transform:uppercase; }
    .goal-heading { margin-top:10px; font-size:30px; letter-spacing:-.04em; line-height:1.15; }
    .goal-description { max-width:620px; color:var(--text-muted); font-size:13px; line-height:1.65; margin-top:10px; }
    .goal-compose { padding:17px; display:flex; flex-direction:column; gap:10px; }
    .goal-compose label { color:var(--text-main); font-size:13px; font-weight:650; }
    .goal-compose textarea { width:100%; min-height:112px; resize:vertical; background:var(--bg-base); border:1px solid var(--border); border-radius:8px; color:var(--text-main); padding:11px; font:13px/1.55 inherit; }
    .goal-compose textarea:focus { outline:2px solid var(--accent); outline-offset:1px; }
    .goal-boundary { color:var(--text-muted); font-size:11px; line-height:1.5; }
    .goal-section-head { display:flex; align-items:center; justify-content:space-between; margin:25px 0 12px; }
    .goal-section-head h2 { font-size:15px; letter-spacing:-.01em; }
    .goal-records { display:grid; grid-template-columns:repeat(auto-fit,minmax(290px,1fr)); gap:12px; }
    .goal-record { padding:17px; }
    .goal-record-head { display:flex; align-items:center; justify-content:space-between; gap:12px; }
    .goal-record-id { color:var(--text-muted); font:11px ui-monospace,monospace; }
    .goal-record h3 { font-size:15px; line-height:1.4; margin-top:12px; }
    .goal-record p { color:var(--text-muted); font-size:12px; line-height:1.55; margin-top:7px; }
    .goal-record-meta { display:flex; flex-wrap:wrap; gap:7px; margin-top:14px; }
    .goal-empty { border:1px dashed var(--border); border-radius:10px; padding:22px; color:var(--text-muted); font-size:13px; line-height:1.6; }
    .home-activity { margin-top:18px; }
    .home-activity .table { table-layout:fixed; }
    .home-activity .table th,.home-activity .table td { padding:8px 10px; }
    .home-activity .table td:last-child { overflow-wrap:anywhere; }
    .brand-badge { background:transparent; color:var(--text-muted); border-left:1px solid var(--border); border-radius:0; padding-left:10px; font:11px ui-monospace,monospace; }
    .header-status { gap:14px; font-size:11px; }
    .header-status #channel-status { display:none; }
    body[data-view="home"] .view-content { padding:28px clamp(18px,3vw,42px); }
    @media(max-width:900px){ .app-container{grid-template-columns:190px minmax(0,1fr)}.nav-col{width:190px;min-width:190px}.home-sections,.goal-intro{grid-template-columns:1fr}.home-page .main-title{font-size:24px} }
    @media(max-width:1050px){ .forge-grid{grid-template-columns:minmax(200px,.7fr) minmax(0,1.3fr)}.forge-grid>.forge-panel:last-child{grid-column:1/-1}.forge-grid>.forge-panel:last-child .forge-event-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:20px} }
    @media(max-width:700px){ .forge-header{align-items:flex-start;flex-direction:column}.forge-identity{align-items:flex-start}.forge-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.forge-grid{grid-template-columns:1fr}.forge-grid>.forge-panel:last-child{grid-column:auto}.forge-grid>.forge-panel:last-child .forge-event-list{display:flex}.forge-floor{min-height:270px}.forge-node{max-width:105px}.forge-node strong{max-width:65px}.forge-foot{flex-direction:column} }
    @media(prefers-reduced-motion:reduce){ .forge-floor:after{animation:none} }
    @media(max-width:620px){ .app-container{grid-template-columns:58px minmax(0,1fr)}.nav-col{width:58px;min-width:58px;align-items:center;padding:8px 0}.nav-section,.nav-label{display:none}.nav-item{width:40px;height:38px;justify-content:center;padding:0;gap:0;font-size:0}.nav-badge{position:absolute;top:0;right:0;width:8px;min-width:8px;height:8px;padding:0;font-size:0}.home-page .main-head{flex-direction:column}.home-page .main-title,.goal-heading{font-size:22px}.home-sections,.goal-intro{grid-template-columns:minmax(0,1fr)}.home-state{padding:13px}.home-work-item{align-items:flex-start;flex-direction:column}.goal-intro-copy{padding:20px} }
    .doc-item:hover { background: rgba(196,181,253,0.08) !important; }
    .doc-item.active { background: rgba(196,181,253,0.15) !important; border-color: rgba(196,181,253,0.4) !important; }
  </style>
  <style>${workspaceTheme}</style>
  <style>
    .auth-gate{position:fixed;z-index:200;inset:0;display:grid;place-items:center;padding:22px;background:rgba(10,11,13,.84);backdrop-filter:blur(10px)}
    .auth-gate-card{width:min(470px,100%);padding:28px;border:1px solid #c4b5fd42;border-radius:18px;background:radial-gradient(circle at 85% 0,#c4b5fd16,transparent 39%),var(--bg-surface);box-shadow:0 30px 100px #000b}
    .auth-gate-mark{display:grid;place-items:center;width:36px;height:36px;border-radius:11px;background:var(--accent-dim);color:var(--accent);font-size:21px}.auth-gate h1{margin:17px 0 7px;font-size:26px;letter-spacing:-.045em}.auth-gate p{margin:0;color:var(--text-muted);font-size:13px;line-height:1.65}.auth-gate form{display:grid;gap:12px;margin-top:21px}.auth-gate label{display:grid;gap:6px;color:var(--text-muted);font-size:11px}.auth-gate [hidden]{display:none!important}.auth-gate input{min-height:42px}.auth-gate footer{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:16px}.auth-gate button[data-mode]{padding:0;border:0;background:transparent;color:var(--accent);font:inherit;font-size:12px;cursor:pointer}.auth-gate [role=status]{min-height:20px;margin-top:12px;color:var(--amber);font-size:12px;line-height:1.45}@media(max-width:520px){.auth-gate-card{padding:23px}.auth-gate footer{align-items:flex-start;flex-direction:column}.auth-gate footer .btn{width:100%}}
  </style>
</head>
<body>
  <header>
    <div class="brand"><button class="workspace-menu" aria-label="Toggle navigation" aria-expanded="false" aria-controls="workspace-navigation" onclick="toggleWorkspaceNavigation()">☰</button>
      <span>AgentForge</span>
      <span class="brand-badge">Local workspace</span>
    </div>
    <button class="workspace-project" id="workspace-project" type="button" onclick="openWorkspaceProjectSwitcher()" title="Switch workspace project"><span>CURRENT PROJECT</span><strong id="workspace-project-label">All projects</strong><em aria-hidden="true">⌄</em></button><button class="workspace-search" onclick="openWorkspaceSearch()">Search workspace <kbd>Ctrl K</kbd></button><button class="workspace-experience" id="workspace-experience" type="button" onclick="switchView('onboarding')" title="Choose workspace experience"><span>WORKSPACE MODE</span><strong id="workspace-experience-label">Choose a mode</strong><em aria-hidden="true">⌄</em></button><div class="header-status">
      <span><span class="status-dot" id="event-status-dot" style="background:var(--amber)"></span><span id="event-status">Connecting to local events…</span></span>
      <span id="channel-status">External channels: not connected</span>
      <span id="data-mode"></span>
    </div>
  </header>

  <div class="app-container">
    <!-- Left Navigation -->
    <div class="nav-col" id="workspace-navigation" role="navigation" aria-label="Workspace">
      <button class="mobile-mode-switch" type="button" onclick="switchView('onboarding')"><span>WORKSPACE MODE</span><strong id="mobile-workspace-experience-label">Choose a mode</strong><em>Switch mode <b aria-hidden="true">→</b></em></button>
      <div class="nav-section">Team</div>
      <a class="nav-item active" aria-current="page" title="Command room" aria-label="Command room" onclick="switchView('home', this)"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg><span class="nav-label">Command room</span></a>
      <a class="nav-item" title="Messages" aria-label="Messages" onclick="switchView('messages', this)"><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span class="nav-label">Messages</span></a>
      <a class="nav-item" title="Inbox" aria-label="Inbox" onclick="switchView('inbox', this)"><svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z"/><path d="M4 13h4l2 3h4l2-3h4"/></svg><span class="nav-label">Inbox</span><span class="nav-badge alert" id="inbox-count"></span></a>
      <a class="nav-item" title="Team map" aria-label="Team map" onclick="switchView('graph', this)"><svg viewBox="0 0 24 24"><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="12" cy="18" r="3"/><path d="m8.5 7.5 7 0M7.5 8.5l3.5 7M16.5 8.5l-3.5 7"/></svg><span class="nav-label">Team map</span></a>
      <div class="nav-section">Work</div>
      <a class="nav-item" title="Projects" aria-label="Projects" onclick="switchView('projects', this)"><svg viewBox="0 0 24 24"><path d="M3 7V5h7l2 2h9v13H3z"/></svg><span class="nav-label">Projects</span></a>
      <a class="nav-item" title="Agents" aria-label="Agents" onclick="switchView('agents', this)"><svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></svg><span class="nav-label">Agents</span></a>
      <a class="nav-item" title="Agent studio" aria-label="Agent studio" onclick="switchView('studio', this)"><svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z"/><path d="M8 8h8M8 12h5M8 16h8"/><path d="m17 12 3 3-3 3"/></svg><span class="nav-label">Agent studio</span></a>
      <a class="nav-item" title="AgentForge Harness" aria-label="AgentForge Harness" onclick="switchView('harnesses', this)"><svg viewBox="0 0 24 24"><path d="M12 3v3M5.6 5.6l2.1 2.1M3 12h3m-.4 6.4 2.1-2.1M12 18v3m4.3-5.1 2.1 2.1M18 12h3m-4.1-4.3 2.1-2.1"/><circle cx="12" cy="12" r="5"/></svg><span class="nav-label">AgentForge Harness</span></a>
      <a class="nav-item" title="Tasks and runs" aria-label="Tasks and runs" onclick="switchView('tasks', this)"><svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg><span class="nav-label">Tasks</span><span class="nav-badge" id="tasks-count"></span></a>
      <a class="nav-item" title="Goals and requirement plans" aria-label="Goals" onclick="switchView('goals', this)"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/><path d="m16 8 5-5"/></svg><span class="nav-label">Goals</span></a>
      <a class="nav-item" title="Approvals" aria-label="Approvals" onclick="switchView('approvals', this)"><svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg><span class="nav-label">Approvals</span><span class="nav-badge alert" id="approvals-count"></span></a>
      <div class="nav-section">Playbooks</div>
      <a class="nav-item" title="Processes" aria-label="Processes" onclick="switchView('processes', this)"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="5" rx="1"/><rect x="14" y="16" width="7" height="5" rx="1"/><path d="M6.5 8v4h11v4"/></svg><span class="nav-label">Processes</span></a>
      <a class="nav-item" title="Marketplace" aria-label="Marketplace" onclick="switchView('marketplace', this)"><svg viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/></svg><span class="nav-label">Marketplace</span></a>
      <a class="nav-item" title="Migration" aria-label="Migration" onclick="switchView('migration', this)"><svg viewBox="0 0 24 24"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg><span class="nav-label">Migration</span></a>
      <div class="nav-section">Connections</div>
      <a class="nav-item" title="Models and routing" aria-label="Models and routing" onclick="switchView('models', this)"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1-2.4 2.4-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5v.2h-3.4v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1-2.4-2.4.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H4v-3.4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1 2.4-2.4.1.1a1.7 1.7 0 0 0 1.8.3 1.7 1.7 0 0 0 1-1.5V4h3.4v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1 2.4 2.4-.1.1a1.7 1.7 0 0 0-.3 1.8 1.7 1.7 0 0 0 1.5 1h.2V14h-.2a1.7 1.7 0 0 0-1.5 1z"/></svg><span class="nav-label">Models</span></a>
      <a class="nav-item" title="Compute and sandboxes" aria-label="Compute and sandboxes" onclick="switchView('compute', this)"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/></svg><span class="nav-label">Compute</span></a>
      <a class="nav-item" title="Tools" aria-label="Tools" onclick="switchView('tools', this)"><svg viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.7-3.7a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/></svg><span class="nav-label">Tools</span></a>
      <div class="nav-section">Management</div>
      <a class="nav-item" title="Operational memory" aria-label="Operational memory" onclick="switchView('memory', this)"><svg viewBox="0 0 24 24"><path d="M12 3a7 7 0 0 0-4 12.7c.6.4 1 1 1 1.8V19h6v-1.5c0-.8.4-1.4 1-1.8A7 7 0 0 0 12 3z"/><path d="M9 22h6m-5-18v3m-5 5H3m16 0h2"/></svg><span class="nav-label">Memory</span></a>
      <a class="nav-item" title="Benchmarks" aria-label="Benchmarks" onclick="switchView('benchmarks', this)"><svg viewBox="0 0 24 24"><path d="M3 3v18h18M7 14l4-4 4 3 5-7"/></svg><span class="nav-label">Benchmarks</span></a>
      <a class="nav-item" title="Documentation & Specifications" aria-label="Documentation" onclick="switchView('docs', this)"><svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/></svg><span class="nav-label">Specifications</span><span class="nav-badge" id="docs-count"></span></a>
      <a class="nav-item" title="Activity and audit" aria-label="Activity and audit" onclick="switchView('activity', this)"><svg viewBox="0 0 24 24"><path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/></svg><span class="nav-label">Activity</span></a>
      <div class="nav-spacer"></div>
      <a class="nav-item" title="Settings" aria-label="Settings" onclick="switchView('settings', this)"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1-2.4 2.4-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5v.2h-3.4v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1-2.4-2.4.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H4v-3.4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1 2.4-2.4.1.1a1.7 1.7 0 0 0 1.8.3 1.7 1.7 0 0 0 1-1.5V4h3.4v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1 2.4 2.4-.1.1a1.7 1.7 0 0 0-.3 1.8 1.7 1.7 0 0 0 1.5 1h.2V14h-.2a1.7 1.7 0 0 0-1.5 1z"/></svg><span class="nav-label">Settings</span></a>
    </div>

    <!-- Center View Area -->
    <div class="main-col">
      <div class="view-header">
        <div class="view-title" id="view-title">Command room</div>
        <div class="view-header-controls"><button id="workspace-refresh-notice" class="btn btn-secondary" hidden>Updates available · Refresh</button><div id="view-actions"></div></div>
      </div>
      <div class="view-content" id="view-content">
        <!-- Dynamic Content Injected Here -->
      </div>
    </div>

    <!-- Right Context Panel -->
    <div class="context-col" id="context-col" aria-label="AgentForge runtime overview">
      <div class="context-card"><div class="card-title">AgentForge Runtime</div><div>Checking local harness and task status…</div></div>
    </div>
  </div>

  <nav class="mobile-tabbar" aria-label="Primary navigation">
    <button type="button" data-mobile-view="home" aria-current="page" onclick="switchView('home')"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg><span>Home</span></button>
    <button type="button" data-mobile-view="messages" onclick="switchView('messages')"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H7l-3 2v-5.1A7.5 7.5 0 1 1 20 11.5Z"/><path d="M8 11h8M8 14h5"/></svg><span>Messages</span></button>
    <button type="button" data-mobile-view="tasks" onclick="switchView('tasks')"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg><span>Work</span></button>
    <button type="button" data-mobile-view="inbox" onclick="switchView('inbox')"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v16H4z"/><path d="M4 13h4l2 3h4l2-3h4"/></svg><span>Inbox</span><i class="mobile-tabbar-badge" id="mobile-inbox-count" hidden></i></button>
    <button type="button" data-mobile-more aria-haspopup="menu" aria-expanded="false" onclick="toggleWorkspaceNavigation()"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg><span>More</span></button>
  </nav>

  <!-- Wizard Modal: Create Agent -->
  <div class="modal-overlay" id="agent-modal">
    <div class="modal-box">
      <div class="modal-title">Create a teammate</div>
      <div class="form-group">
        <label class="form-label">Name</label>
        <input type="text" class="form-control" id="wiz-name" placeholder="e.g. Jordan">
      </div>
      <div class="form-group">
        <label class="form-label">Role</label>
        <input type="text" class="form-control" id="wiz-role" placeholder="e.g. Underwriting Analyst">
      </div>
      <div class="form-group">
        <label class="form-label">What should this teammate help with?</label>
        <input type="text" class="form-control" id="wiz-desc" placeholder="Briefly describe what this teammate executes">
      </div>
      <div class="form-group">
        <label class="form-label">Execution control</label>
        <select class="form-control" id="wiz-harness">
          <option value="native">AgentForge Harness · reviewed boundaries and approvals</option>
        </select>
        <p class="form-hint">AgentForge keeps work inside the team and review controls you define. Provider connections are configured separately.</p>
      </div>
      <div class="form-group">
        <label class="form-label">Model preference</label>
        <select class="form-control" id="wiz-model">
          <option value="4">Tier 4: Frontier cloud candidate</option>
          <option value="3">Tier 3: Strong local candidate</option>
          <option value="2" selected>Tier 2: Fast local candidate</option>
          <option value="1">Tier 1: Deterministic decision candidate</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Workspace access</label>
        <select class="form-control" id="wiz-compute">
          <option value="local_workspace">Local Workspace / Worktree</option>
          <option value="local_sandbox">Isolated Sandbox</option>
          <option value="none">None (Messaging Only)</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Operating procedure</label>
        <select class="form-control" id="wiz-process"><option value="">No procedure assigned</option></select>
      </div>
      <div id="wiz-result" role="status" style="margin-top:0.5rem;"></div>
      <div style="display:flex; gap:0.5rem; justify-content:flex-end; margin-top:1rem;">
        <button class="btn btn-secondary" onclick="closeModal('agent-modal')">Cancel</button>
        <button class="btn" onclick="submitCreateAgent()">Create Teammate</button>
      </div>
    </div>
  </div>

  <div class="modal-overlay" id="task-modal">
    <div class="modal-box">
      <div class="modal-title">Create Task</div>
      <div class="item-card">This saves a task with restricted permissions. Running it requires a configured execution environment and a reviewed plan.</div>
      <div class="form-group">
        <label class="form-label" for="task-title">Task name</label>
        <input type="text" class="form-control" id="task-title" maxlength="300" placeholder="What needs to be done?">
      </div>
      <div class="form-group">
        <label class="form-label" for="task-description">Details</label>
        <textarea class="form-control" id="task-description" maxlength="20000" rows="4" placeholder="Add context and expected result"></textarea>
      </div>
      <div class="form-group">
        <label class="form-label" for="task-project">Project</label>
        <select class="form-control" id="task-project"><option value="">No project</option></select>
        <label class="form-label" for="task-priority">Priority</label>
        <select class="form-control" id="task-priority">
          <option value="medium">Normal</option>
          <option value="low">Low</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" for="task-agent">Assign to teammate (optional)</label>
        <select class="form-control" id="task-agent"><option value="">Unassigned</option></select>
      </div>
      <details class="task-boundary-editor">
        <summary>Execution boundaries &amp; checks (optional)</summary>
        <p>Prepare a reviewable plan. Saving does not approve commands, connect a repository, or start work.</p>
        <label class="form-label" for="task-base-branch">Starting branch</label><input id="task-base-branch" class="form-control" placeholder="main" maxlength="200">
        <label class="form-label" for="task-base-sha">Starting commit (full Git SHA)</label><input id="task-base-sha" class="form-control" placeholder="40-character commit SHA" maxlength="64">
        <label class="form-label" for="task-allowed-paths">Allowed paths · one per line</label><textarea id="task-allowed-paths" class="form-control" rows="3" placeholder="src/**"></textarea>
        <label class="form-label" for="task-protected-paths">Protected paths · one per line</label><textarea id="task-protected-paths" class="form-control" rows="3">.env
.env.*
.git/**</textarea>
        <label class="form-label" for="task-test-command">Test command</label><input id="task-test-command" class="form-control" placeholder="npm test" maxlength="20000">
        <label class="form-label" for="task-build-command">Build command (optional)</label><input id="task-build-command" class="form-control" placeholder="npm run build" maxlength="20000">
        <p>Separate worktree, verification evidence, and human review are required. External messaging, production writes, deployment, force push, deletion, and outbound network remain disallowed.</p>
      </details>
      <div id="task-result" role="status" style="margin-top:0.5rem;"></div>
      <div style="display:flex; gap:0.5rem; justify-content:flex-end; margin-top:1rem;">
        <button class="btn btn-secondary" onclick="closeModal('task-modal')">Cancel</button>
        <button class="btn" onclick="submitCreateTask()">Save Task</button>
      </div>
    </div>
  </div>

  <div class="modal-overlay" id="process-import-modal">
    <div class="modal-box">
      <div class="modal-title">Import an Operating Procedure</div>
      <div class="item-card">Paste SOP text or Markdown. AgentForge parses steps and flags unresolved business rules for review. Importing does not grant authority or execute the procedure.</div>
      <div class="form-group">
        <label class="form-label" for="process-import-content">Procedure text</label>
        <textarea class="form-control" id="process-import-content" rows="12" maxlength="200000" placeholder="# Request review SOP&#10;1. Confirm request details&#10;2. Ask a reviewer if authorization is unclear"></textarea>
      </div>
      <div id="process-import-result" role="status" style="margin-top:0.5rem;"></div>
      <div style="display:flex; gap:0.5rem; justify-content:flex-end; margin-top:1rem;">
        <button class="btn btn-secondary" onclick="closeModal('process-import-modal')">Cancel</button>
        <button class="btn" onclick="submitProcessImport()">Import Procedure</button>
      </div>
    </div>
  </div>

  <script>
    let currentView = 'home';
    let activeWorkspaceExperience = null;
    let currentChannelId = 'chan-general';
    let currentMemoryNamespace = 'general';
    let activeChatAgent = 'agent-orion';
    let activeChatAgentName = 'Orchestrator';
    let activeChatAgentRole = 'Lead Orchestrator';
    let chatTargetType = 'channel';
    let storeData = { messages: [], agents: [], tasks: [], approvals: [], processes: [], calls: [], packages: [] };

    // Browser sessions use an HttpOnly, same-site cookie. The token is never
    // copied into localStorage, URLs, workspace records, or rendered content.
    function openAuthenticationGate(mode = 'setup') {
      document.querySelector('.auth-gate')?.remove();
      const gate = document.createElement('section');
      gate.className = 'auth-gate';
      gate.setAttribute('role', 'dialog');
      gate.setAttribute('aria-modal', 'true');
      const isSetup = mode === 'setup';
      gate.innerHTML = '<div class="auth-gate-card"><div class="auth-gate-mark" aria-hidden="true">✳</div><h1>' + (isSetup ? 'Secure this workspace' : 'Welcome back') + '</h1><p>' + (isSetup ? 'Create the local owner password before this workspace starts. AgentForge stores only a password hash in local workspace data; the password never appears in a URL or browser storage.' : 'Sign in to continue to this protected AgentForge workspace.') + '</p><form><label class="auth-username"' + (isSetup ? ' hidden' : '') + '>Owner username<input name="username" autocomplete="username" value="owner" required></label><label>' + (isSetup ? 'Your name' : 'Username') + '<input name="displayName" autocomplete="name" maxlength="120"' + (isSetup ? '' : ' hidden') + '></label><label>Password<input name="password" type="password" autocomplete="' + (isSetup ? 'new-password' : 'current-password') + '" minlength="12" required></label><button class="btn" type="submit">' + (isSetup ? 'Secure & continue' : 'Sign in') + '</button></form><div role="status" aria-live="polite"></div><footer><span>Local-only by default</span><button type="button" data-mode>' + (isSetup ? 'Already set up? Sign in' : 'First use? Set up the owner account') + '</button></footer></div>';
      document.body.append(gate);
      const form = gate.querySelector('form');
      const status = gate.querySelector('[role=status]');
      gate.querySelector('[data-mode]').onclick = () => openAuthenticationGate(isSetup ? 'login' : 'setup');
      form.onsubmit = async event => {
        event.preventDefault();
        const submit = form.querySelector('[type=submit]');
        submit.disabled = true;
        status.textContent = isSetup ? 'Securing the local workspace…' : 'Signing in…';
        try {
          const values = new FormData(form);
          const body = isSetup
            ? { password: values.get('password'), displayName: values.get('displayName') }
            : { username: values.get('username'), password: values.get('password') };
          const response = await fetch(isSetup ? '/api/auth/bootstrap' : '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || 'Authentication could not be completed.');
          gate.remove();
          startAuthenticatedWorkspace();
        } catch (error) {
          status.textContent = error instanceof Error ? error.message : 'Authentication could not be completed.';
          submit.disabled = false;
        }
      };
      gate.querySelector('input:not([hidden])')?.focus();
    }

    function escapeHtml(value) {
      return String(value ?? '').replace(/[&<>"']/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      })[character]);
    }

    function safeJsString(value) {
      return escapeHtml(JSON.stringify(String(value)).replace(/</g, '\\u003c'));
    }

    // Initialize Realtime SSE connection
    function initRealtime() {
      const sse = new EventSource('/api/realtime');
      const status = document.getElementById('event-status');
      const statusDot = document.getElementById('event-status-dot');
      const mode = document.getElementById('data-mode');
      sse.onopen = () => {
        status.innerText = 'Workspace updates live';
        statusDot.style.background = 'var(--green)';
      };
      sse.onerror = () => {
        status.innerText = 'Reconnecting to workspace updates';
        statusDot.style.background = 'var(--amber)';
      };
      fetch('/api/status').then(response => response.json()).then(result => {
        const recordMode = result.dataMode === 'SAMPLE_DATA_PRESENT' ? 'Sample workspace' : result.dataMode === 'EMPTY' ? 'Workspace ready' : result.dataMode === 'USER_DATA' ? 'Your workspace' : 'Workspace state unavailable';
        const storageMode = result.storageMode === 'local_json' ? 'Stored on this device' : 'Temporary session';
        mode.innerText = recordMode + ' · ' + storageMode;
        if ((result.dataMode !== 'USER_DATA' && result.dataMode !== 'EMPTY') || result.storageMode !== 'local_json') {
          mode.style.color = 'var(--amber)';
        } else {
          mode.style.color = 'var(--green)';
        }
      }).catch(() => {
        mode.innerText = 'Workspace status unavailable';
        mode.style.color = 'var(--red)';
      });
      refreshRuntimePanel();
      refreshWorkspaceExperience();
      refreshWorkspaceProjectLabel();
      updateNavCounts();
      let pendingStatusRefresh = null;
      sse.onmessage = (e) => {
        try {
          JSON.parse(e.data);
          // Background writes must not discard a reader selection, filter, or form.
          const notice = document.getElementById('workspace-refresh-notice');
          notice.hidden = false;
          if (pendingStatusRefresh === null) pendingStatusRefresh = setTimeout(() => {
            pendingStatusRefresh = null;
            updateNavCounts();
            refreshRuntimePanel();
          }, 300);
        } catch(err){}
      };
      document.getElementById('workspace-refresh-notice').onclick = () => {
        if (document.querySelector('dialog[open]')) return;
        const notice = document.getElementById('workspace-refresh-notice');
        const goalInput = document.getElementById('completion-goal-input');
        if (goalInput?.value.trim()) {
          notice.textContent = 'Save your goal draft before refreshing';
          goalInput.focus();
          return;
        }
        loadView(currentView);
      };
    }

    function syncWorkspaceExperiencePicker() {
      const labels = { command: 'Command room', workspace: 'Collaboration', studio: 'Agent studio' };
      const mobileLabel = document.getElementById('mobile-workspace-experience-label');
      if (mobileLabel) mobileLabel.textContent = labels[activeWorkspaceExperience] || 'Choose a mode';
      const picker = document.querySelector('.pathway-picker');
      if (picker) {
        picker.querySelector('.forge-topline').textContent = 'AGENTFORGE / WORKSPACE MODE';
        picker.querySelector('h1').textContent = 'Choose how you want to work.';
        picker.querySelector('header p').textContent = 'All three modes use the same workspace. Switch views any time; your projects, conversations, tasks, and history stay together.';
        picker.querySelector('footer span').textContent = 'Choose a starting view. You can switch modes later without moving your workspace data.';
      }
      document.querySelectorAll('.pathway-card').forEach(card => {
        const experience = card.classList.contains('pathway-command') ? 'command' : card.classList.contains('pathway-workspace') ? 'workspace' : 'studio';
        const isCurrent = experience === activeWorkspaceExperience;
        card.classList.toggle('is-current', isCurrent);
        card.dataset.experience = experience;
        card.setAttribute('aria-pressed', String(isCurrent));
        let marker = card.querySelector('.pathway-current');
        if (!marker) { marker = document.createElement('span'); marker.className = 'pathway-current'; marker.textContent = 'Current mode'; card.appendChild(marker); }
        marker.hidden = !isCurrent;
      });
    }

    async function refreshWorkspaceExperience() {
      const button = document.getElementById('workspace-experience');
      const label = document.getElementById('workspace-experience-label');
      if (!button || !label) return;
      const labels = { command: 'Command room', workspace: 'Collaboration', studio: 'Agent studio' };
      try {
        const response = await fetch('/api/workspace');
        if (!response.ok) throw new Error('Workspace unavailable');
        const result = await response.json();
        activeWorkspaceExperience = result.workspace?.experience || null;
        label.textContent = labels[activeWorkspaceExperience] || 'Choose a mode';
        button.dataset.ready = activeWorkspaceExperience ? 'true' : 'false';
        syncWorkspaceExperiencePicker();
      } catch {
        label.textContent = 'Mode unavailable';
        button.dataset.ready = 'false';
      }
    }

    async function refreshWorkspaceProjectLabel() {
      const button = document.getElementById('workspace-project');
      const label = document.getElementById('workspace-project-label');
      if (!button || !label) return;
      try {
        const response = await fetch('/api/projects');
        if (!response.ok) throw new Error('Projects unavailable');
        const projects = await response.json();
        const selected = projectState?.selected ? projects.find(project => project.id === projectState.selected && !project.archived) : null;
        label.textContent = selected?.name || 'All projects';
        button.dataset.ready = 'true';
      } catch {
        label.textContent = 'Projects unavailable';
        button.dataset.ready = 'false';
      }
    }

    async function openWorkspaceProjectSwitcher() {
      const dialog = document.createElement('dialog');
      dialog.className = 'conversation-dialog workspace-project-dialog';
      dialog.innerHTML = '<header><div><span class="goal-kicker">CURRENT PROJECT</span><h2>Switch project</h2></div><button class="btn btn-sm btn-secondary" type="button" data-close aria-label="Close project chooser">×</button></header><p class="memory-disclosure">Choose a project to open its conversations, work, files, and decisions.</p><div class="workspace-project-options" role="list"></div><footer><button class="btn btn-secondary" type="button" data-all>All projects</button><button class="btn" type="button" data-manage>Manage projects</button></footer>';
      const close = dialog.querySelector('[data-close]');
      close.onclick = () => dialog.close();
      dialog.onclose = () => dialog.remove();
      document.body.append(dialog);
      dialog.showModal();
      const list = dialog.querySelector('.workspace-project-options');
      try {
        const response = await fetch('/api/projects');
        if (!response.ok) throw new Error('Could not load projects.');
        const projects = (await response.json()).filter(project => !project.archived);
        if (!projects.length) {
          list.textContent = 'No saved projects yet. Start from the workspace guide or create one in Projects.';
        } else {
          for (const project of projects) {
            const option = document.createElement('button');
            option.type = 'button';
            option.className = 'workspace-project-option';
            option.setAttribute('role', 'listitem');
            option.innerHTML = '<span class="workspace-project-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3.75 6.75A1.75 1.75 0 0 1 5.5 5h4.12l1.8 1.9h7.08a1.75 1.75 0 0 1 1.75 1.75v9.85a1.75 1.75 0 0 1-1.75 1.75h-13a1.75 1.75 0 0 1-1.75-1.75z"/><path d="M4 9h16"/></svg></span><span class="workspace-project-copy"><strong></strong><span></span></span><span class="workspace-project-trailing" aria-hidden="true"></span>';
            option.querySelector('.workspace-project-copy strong').textContent = project.name;
            option.querySelector('.workspace-project-copy span').textContent = project.description || 'Project conversations, work, files, and decisions';
            if (projectState.selected === project.id) {
              option.classList.add('is-current');
              option.setAttribute('aria-current', 'true');
              const current = document.createElement('small');
              current.textContent = 'Current';
              option.querySelector('.workspace-project-trailing').replaceChildren(current);
            } else {
              option.querySelector('.workspace-project-trailing').innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7 4 6 6-6 6"/></svg>';
            }
            option.onclick = () => { projectState.selected = project.id; projectState.tab = 'overview'; saveProjectNavigation(); dialog.close(); refreshWorkspaceProjectLabel(); switchView('projects'); };
            list.append(option);
          }
        }
      } catch (error) {
        list.textContent = error.message || 'Could not load projects.';
      }
      dialog.querySelector('[data-all]').onclick = () => { projectState.selected = null; saveProjectNavigation(); dialog.close(); refreshWorkspaceProjectLabel(); switchView('projects'); };
      dialog.querySelector('[data-manage]').onclick = () => { dialog.close(); switchView('projects'); };
    }

    async function refreshRuntimePanel() {
      const panel = document.getElementById('context-col');
      try {
        const [harnessResponse, tasksResponse, agentsResponse] = await Promise.all([
          fetch('/api/harnesses'), fetch('/api/tasks'), fetch('/api/agents')
        ]);
        if (!harnessResponse.ok || !tasksResponse.ok || !agentsResponse.ok) throw new Error('Local status unavailable');
        const harness = await harnessResponse.json();
        const tasks = await tasksResponse.json();
        const agents = await agentsResponse.json();
        const statuses = ['backlog', 'ready', 'in_progress', 'verification_running', 'waiting_approval', 'paused', 'completed', 'failed', 'cancelled'];
        const counts = statuses.map(status => '<div style="display:flex; justify-content:space-between;"><span>' + escapeHtml(status.replaceAll('_', ' ')) + '</span><b>' + tasks.filter(task => task.status === status).length + '</b></div>').join('');
        const runtime = harness.runtime;
        const harnessSummary = runtime.canExecuteTasks ? 'Reviewed task execution is available.' : 'Execution is offline until all required boundaries are connected.';
        panel.innerHTML = '<div class="context-card"><div class="card-title">AgentForge worker</div><div><span class="badge badge-amber">' + escapeHtml(runtime.status.replaceAll('_', ' ')) + '</span></div><div style="font-size:0.78rem; margin-top:0.45rem;">' + escapeHtml(runtime.explanation) + '</div><div style="font-size:0.78rem; margin-top:0.45rem;">Workers <b>' + runtime.workerCount + '</b> · Can run tasks <b>' + (runtime.canExecuteTasks ? 'Yes' : 'No') + '</b></div></div><div class="context-card"><div class="card-title">Workspace activity</div><div style="font-size:0.78rem;">Teammates <b>' + agents.length + '</b></div><div style="font-size:0.78rem; margin:0.25rem 0 0.45rem;">Tasks <b>' + tasks.length + '</b></div>' + counts + '</div><div class="context-card"><div class="card-title">AgentForge Harness</div><div style="font-size:0.78rem; margin-top:0.45rem;">' + escapeHtml(harnessSummary) + '</div><button class="btn btn-sm btn-secondary" style="margin-top:0.7rem" data-open-harness>Open harness</button></div>';
        panel.querySelector('[data-open-harness]')?.addEventListener('click', () => switchView('harnesses'));
      } catch {
        panel.innerHTML = '<div class="context-card"><div class="card-title">AgentForge Runtime</div><div>Runtime status could not be read from the local control plane.</div></div>';
      }
    }

    async function updateNavCounts() {
      try {
        const [inboxResponse, tasksResponse, approvalsResponse] = await Promise.all([
          fetch('/api/inbox'), fetch('/api/tasks'), fetch('/api/approvals')
        ]);
        const [inbox, tasks, approvals] = await Promise.all([
          inboxResponse.json(), tasksResponse.json(), approvalsResponse.json()
        ]);
        document.getElementById('inbox-count').innerText = inbox.length || '';
        const mobileInboxCount=document.getElementById('mobile-inbox-count');if(mobileInboxCount){mobileInboxCount.hidden=!inbox.length;mobileInboxCount.textContent=inbox.length?String(inbox.length):'';}
        document.getElementById('tasks-count').innerText = tasks.length || '';
        document.getElementById('approvals-count').innerText = approvals.filter(item => item.status === 'pending').length || '';
      } catch (error) {
        // Keep counts blank when the backing routes are unavailable.
      }
    }

    let viewRequestSequence=0;
    async function loadView(viewName) {
      const expectedSequence=viewRequestSequence+1;
      try { await renderView(viewName); }
      catch(error) {
        if(currentView!==viewName || viewRequestSequence!==expectedSequence)return;
        const content=document.getElementById('view-content');content.replaceChildren();
        const panel=document.createElement('section');panel.className='workspace-load-error';
        const title=document.createElement('h2');title.textContent='This view could not load.';
        const detail=document.createElement('p');detail.textContent=error.message || 'The local workspace did not respond.';
        const retry=document.createElement('button');retry.className='btn';retry.textContent='Try again';retry.onclick=()=>loadView(viewName);
        panel.append(title,detail,retry);content.appendChild(panel);
      }
    }
    function renderWorkspaceSurfaceLoading(root, heading, copy) {
      root.innerHTML = '<main class="workspace-surface-loading" aria-busy="true" aria-live="polite"><header><span class="forge-topline">AGENTFORGE / LOCAL WORKSPACE</span><h1>' + escapeHtml(heading) + '</h1><p>' + escapeHtml(copy) + '</p></header><section><i></i><i></i></section><div class="workspace-surface-loading-grid"><article><i></i><i></i><i></i></article><article><i></i><i></i><i></i></article></div></main>';
    }

    async function renderView(viewName) {
      if(floorResizeObserver)floorResizeObserver.disconnect();
      if(graphResizeObserver)graphResizeObserver.disconnect();
      const requestId=++viewRequestSequence;
      const refreshNotice = document.getElementById('workspace-refresh-notice');
      refreshNotice.hidden = true;
      refreshNotice.textContent = 'Updates available · Refresh';
      currentView = viewName;
      document.body.dataset.view = viewName;
      const content = document.getElementById('view-content');
      const title = document.getElementById('view-title');
      const actions = document.getElementById('view-actions');
      if (viewName === 'onboarding') {
        title.innerText = 'Welcome';
        actions.innerHTML = '';
        if(requestId!==viewRequestSequence)return; content.innerHTML = '<main class="pathway-picker"><header><div><span class="forge-topline">AGENTFORGE / FIRST WORKSPACE</span><h1>Choose your way in.</h1><p>Every path is a complete view of the same workspace. Pick the surface that fits the work in front of you; switch later without losing projects, conversations, teammates, tasks, or history.</p></div><div class="pathway-picker-mark" aria-hidden="true"><i></i><i></i><i></i><b>✳</b></div></header><section class="pathway-grid" aria-label="Choose workspace experience"><button class="pathway-card pathway-command" onclick="chooseWorkspaceExperience(&quot;command&quot;,&quot;home&quot;)"><span class="pathway-number">01</span><span class="pathway-art pathway-art-command" aria-hidden="true"><svg viewBox="0 0 280 72" fill="none"><path d="M40 36h84m32 0h84M124 36l16-20m16 20 18 20" stroke="currentColor" stroke-opacity=".5" stroke-width="1.5" stroke-dasharray="3 5"/><rect x="112" y="20" width="56" height="32" rx="9"/><circle cx="40" cy="36" r="10"/><circle cx="240" cy="36" r="10"/><circle cx="140" cy="16" r="8"/><circle cx="176" cy="56" r="8"/><path d="M132 36h16m-8-8v16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></span><strong>Run an autonomous team</strong><p>Operate from a decision-first command room. Watch work, review approvals, and keep the team moving.</p><em>Open Command Room <b>→</b></em></button><button class="pathway-card pathway-workspace" onclick="chooseWorkspaceExperience(&quot;workspace&quot;,&quot;messages&quot;)"><span class="pathway-number">02</span><span class="pathway-art pathway-art-workspace" aria-hidden="true"><svg viewBox="0 0 280 72" fill="none"><path d="M36 19h108a10 10 0 0 1 10 10v16a10 10 0 0 1-10 10H89l-18 12V55H36a10 10 0 0 1-10-10V29a10 10 0 0 1 10-10Z"/><path d="M126 8h112a10 10 0 0 1 10 10v16a10 10 0 0 1-10 10h-31l-15 11V44h-66a10 10 0 0 1-10-10V18a10 10 0 0 1 10-10Z"/><path d="M46 33h55m-55 8h38m55-21h54m-54 8h35" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".7"/><circle cx="222" cy="57" r="5"/></svg></span><strong>Work alongside agents</strong><p>Organize conversations, projects, context, files, and decisions in one shared place.</p><em>Open Conversations <b>→</b></em></button><button class="pathway-card pathway-studio" onclick="chooseWorkspaceExperience(&quot;studio&quot;,&quot;studio&quot;)"><span class="pathway-number">03</span><span class="pathway-art pathway-art-studio" aria-hidden="true"><svg viewBox="0 0 280 72" fill="none"><rect x="27" y="10" width="72" height="52" rx="10"/><circle cx="53" cy="28" r="8"/><path d="M39 50c2-8 8-12 14-12s12 4 14 12m17-28h-6m6 10h-6m6 10h-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M116 21h116m-116 15h90m-90 15h104" stroke="currentColor" stroke-opacity=".42" stroke-width="2" stroke-linecap="round"/><circle cx="157" cy="21" r="5"/><circle cx="194" cy="36" r="5"/><circle cx="174" cy="51" r="5"/><path d="m249 37 8 8 15-18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span><strong>Build and test agents</strong><p>Configure teammates, inspect their boundaries, and review the evidence around their work.</p><em>Open Agent Studio <b>→</b></em></button></section><form class="pathway-brief" onsubmit="beginWithOutcome(event)"><div><span class="goal-kicker">Give the agent the outcome</span><label for="onboarding-goal">What do you want your team to accomplish?</label><p>AgentForge will turn this into a saved requirement plan. Nothing executes until its boundaries and evidence are reviewed.</p></div><textarea id="onboarding-goal" required maxlength="40000" placeholder="Example: Research the market, prepare a launch plan, and build a reviewable first release."></textarea><div class="pathway-brief-actions"><span id="onboarding-goal-feedback" role="status"></span><button class="btn" type="submit">Prepare the plan</button></div></form><footer><span>Your workspace begins empty by design.</span><button class="btn btn-sm btn-secondary" onclick="switchView(&quot;settings&quot;)">Review settings</button></footer></main>';
      } else if (viewName === 'home') {
        title.innerText = 'Command room';
        actions.innerHTML = '';
        if(requestId!==viewRequestSequence)return;
        renderWorkspaceSurfaceLoading(content, 'Command room', 'Checking your saved workspace, decisions, teammates, and active work.');
        const responses = await Promise.all([fetch('/api/harnesses'), fetch('/api/tasks'), fetch('/api/agents'), fetch('/api/approvals'), fetch('/api/audit'), fetch('/api/setup-guide/status')]);
        if (responses.some(response => !response.ok)) throw new Error('Command room could not load the saved workspace state.');
        const [harness, tasks, agents, approvals, audit, setupGuide] = await Promise.all(responses.map(response => response.json()));
        const runtime = harness.runtime;
        const guidePrepared = setupGuide?.prepared === true;
        const openTasks = tasks.filter(task => !['completed', 'failed', 'cancelled'].includes(task.status));
        const activeTaskIds = new Set(runtime.activeTaskIds || []);
        const liveTasks = openTasks.filter(task => activeTaskIds.has(task.id) && ['in_progress', 'verification_running'].includes(task.status));
        const pendingApprovals = approvals.filter(approval => approval.status === 'pending');
        const failedTasks = tasks.filter(task => task.status === 'failed');
        const sampleAgentIds = new Set(['agent-alex', 'agent-reviewer']);
        const hasSampleAgents = agents.some(agent => sampleAgentIds.has(agent.id));
        const hasSampleTask = tasks.some(task => task.id === 'AF-142');
        const hasSampleApproval = approvals.some(approval => /fixture record|fixture approval/i.test((approval.description || '') + ' ' + (approval.action || '')));
        const hasPreviewRecords = hasSampleAgents || hasSampleTask || hasSampleApproval;
        const roomNodes = agents.slice(0, 6).map((agent, index) => {
          const positions = [[22, 30], [78, 30], [17, 71], [83, 71], [35, 17], [65, 83]];
          const [x, y] = positions[index];
          const name = escapeHtml(agent.name);
          const mark = escapeHtml((agent.name || '?').slice(0, 1).toUpperCase());
          const lineWidth = index % 2 === 0 ? '140px' : '118px';
          const lineAngle = [164, 16, 196, -16, -128, 52][index];
          return '<span class="forge-link" style="--link-width:' + lineWidth + ';--link-angle:' + lineAngle + 'deg"></span><button class="forge-node" style="--node-x:' + x + '%;--node-y:' + y + '%" onclick="switchView(\\'agents\\')" aria-label="Open agent profile ' + name + '"><span class="forge-agent-mark">' + mark + '</span><strong title="' + name + '">' + name + '</strong></button>';
        }).join('');
        const agentRows = agents.length ? agents.slice(0, 8).map(agent => {
          const assignedTasks = tasks.filter(task => task.assignedAgentId === agent.id && !['completed', 'failed', 'cancelled'].includes(task.status));
          const assignedCount = assignedTasks.length;
          const activeTask = assignedTasks.find(task => activeTaskIds.has(task.id) && ['in_progress', 'verification_running'].includes(task.status));
          const savedState = activeTask ? 'Running · ' + activeTask.title : assignedCount ? 'Assigned · ' + assignedTasks[0].title + (assignedCount > 1 ? ' · ' + assignedCount + ' open tasks' : '') : agent.status === 'error' ? 'Saved profile status · error' : 'No open work';
          const liveIndicator = activeTask ? '<span class="forge-state is-live" title="Verified live task execution"><i></i><span>Live</span></span>' : '<span class="forge-state is-saved" title="Saved assignment; no verified live run"><i></i><span>Saved</span></span>';
          return '<div class="forge-agent"><span class="forge-agent-mark">' + escapeHtml((agent.name || '?').slice(0, 1).toUpperCase()) + '</span><div class="forge-agent-copy"><strong>' + escapeHtml(agent.name) + '</strong><span>' + escapeHtml(agent.role || 'Configured teammate') + (sampleAgentIds.has(agent.id) ? ' · Fixture profile' : '') + '</span><small>' + escapeHtml(savedState) + '</small></div>' + liveIndicator + '</div>';
        }).join('') : '<div class="forge-empty"><strong>No agents configured</strong>This workspace has no saved agent profiles yet.<br><button class="btn btn-sm" onclick="openAgentModal()">Create first agent</button></div>';
        const taskRows = openTasks.length ? openTasks.slice(0, 5).map(task => '<div class="forge-task"><span class="forge-task-pin"></span><div class="forge-task-copy"><strong>' + escapeHtml(task.title) + '</strong><span>' + (task.id === 'AF-142' ? 'Fixture record · ' : 'Saved task · ') + escapeHtml(task.status.replaceAll('_', ' ')) + (task.priority ? ' · ' + escapeHtml(task.priority) : '') + '</span></div><span class="badge ' + (task.status === 'failed' ? 'badge-red' : 'badge-muted') + '">' + escapeHtml(task.status.replaceAll('_', ' ')) + '</span></div>').join('') : '<div class="command-guide-next"><span aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 5h14v14H5zM8 9h8M8 13h5"/><path d="M16 17h5m-2.5-2.5v5"/></svg></span><div><strong>No open tasks yet</strong><p>' + (guidePrepared ? 'Your setup plan is saved. Create a task when you are ready to start separate work.' : 'Have the guide organize a larger outcome or capture one task directly.') + '</p></div><button class="btn btn-sm" onclick="openTaskModal()">Create task</button></div>';
        const reviewRows = pendingApprovals.slice(0, 3).map(approval => '<div class="forge-review"><strong>' + (/fixture approval/i.test(approval.action) ? 'Fixture approval · ' : 'Review requested · ') + escapeHtml(approval.action) + '</strong><p>' + escapeHtml(approval.description || 'Approval requested') + '</p></div>').join('');
        const attentionRows = pendingApprovals.length ? reviewRows : failedTasks.length ? '<div class="forge-review"><strong>Failed work needs inspection</strong><p>' + failedTasks.length + ' task record' + (failedTasks.length === 1 ? '' : 's') + ' failed verification or execution. Review the saved evidence before retrying.</p></div>' : guidePrepared ? '<div class="command-guide-next" data-next-action="review-plan"><span aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 6h14M5 12h9M5 18h6"/><path d="m16 16 2 2 4-5"/></svg></span><div><strong>Your plan is ready to review</strong><p>AgentForge has organized the goal into saved requirements. Review the plan and any remaining decisions before starting work.</p></div><button class="btn btn-sm btn-secondary" onclick="openSetupGuideConversation()">Review plan</button></div>' : '<div class="command-guide-attention"><span aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3 4.5 6v5.2c0 4.1 3.1 7.8 7.5 9.8 4.4-2 7.5-5.7 7.5-9.8V6L12 3Z"/><path d="M12 7v5m0 3h.01"/></svg></span><div><strong>Execution is offline</strong><p>Review the four safeguards before tasks can run. AgentForge keeps execution disabled until each is ready.</p></div><button class="btn btn-sm" onclick="switchView(&quot;harnesses&quot;)">Review setup</button></div>';
        // The audit stream can contain recurring service notices. Group adjacent equivalent
        // records so the Command Room stays decision-first while retaining the full ledger.
        // Startup diagnostics belong in the full audit ledger. Repeating them in
        // the Command Room turns a decision surface into a status-log wall.
        const commandAudit = audit.filter(entry => ![
          'task_worker_start_blocked',
          'task_worker_started',
          'server_started',
          'legacy_fixture_records_removed',
        ].includes(String(entry.action).toLowerCase()));
        const groupedEvents = [];
        for (const entry of [...commandAudit].sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))) {
          const key = [entry.action, entry.targetType || 'Workspace', entry.targetId || ''].join('|');
          const existing = groupedEvents.find(group => group.key === key);
          if (existing) existing.count += 1;
          else groupedEvents.push({ key, entry, count: 1 });
          if (groupedEvents.length >= 5 && groupedEvents.every(group => group.count === 1)) break;
        }
        const events = groupedEvents.slice(0, 5).map(group => {
          const entry = group.entry;
          const repeated = group.count > 1 ? ' · ' + group.count + ' similar recorded events' : '';
          return '<div class="forge-event"><span class="forge-task-pin"></span><div class="forge-event-copy"><strong>' + escapeHtml(entry.action.replaceAll('_', ' ')) + '</strong><span>' + escapeHtml(entry.targetType || 'Workspace') + ' · ' + escapeHtml(new Date(entry.timestamp).toLocaleString()) + repeated + '</span></div></div>';
        }).join('') || '<div class="forge-empty"><strong>No audit events yet</strong>Saved changes will appear here as workspace actions happen.</div>';
        const latestEvent = groupedEvents[0];
        const latestEventSummary = latestEvent
          ? escapeHtml(latestEvent.entry.action.replaceAll('_', ' ')) + ' · ' + escapeHtml(new Date(latestEvent.entry.timestamp).toLocaleString()) + (latestEvent.count > 1 ? ' · ' + latestEvent.count + ' similar events' : '')
          : 'No saved workspace changes yet';
        const runtimeLabel = runtime.canExecuteTasks ? 'Execution connected' : 'Execution disconnected';
        const teamHeading = 'Your team';
        const teamSummary = liveTasks.length ? liveTasks.length + ' verified live run' + (liveTasks.length === 1 ? '' : 's') + '. Other status labels reflect saved assignments.' : runtime.canExecuteTasks ? 'No verified live runs. Status labels reflect saved profiles and assignments.' : 'Execution is offline. Status labels reflect saved profiles and assignments.';
        const firstUse = agents.length === 0 && openTasks.length === 0 && pendingApprovals.length === 0;
        const setupCapabilities = [
          { key: 'modelPlanning', label: 'Choose a model', view: 'models' },
          { key: 'isolatedCompute', label: 'Set up a sandbox', view: 'compute' },
          { key: 'realVerification', label: 'Verify real work', view: 'harnesses' },
          { key: 'evidenceCollection', label: 'Collect proof', view: 'harnesses' },
        ];
        const capabilities = runtime.readiness?.capabilities || {};
        const readyCapabilityCount = setupCapabilities.filter(item => capabilities[item.key] === true).length;
        const firstUseMarkup = firstUse
          ? '<section class="command-first-use" aria-labelledby="command-first-use-title"><div class="command-first-use-intro"><div class="command-first-use-art" aria-hidden="true"><svg viewBox="0 0 216 148" fill="none"><path d="M40 40 108 72 176 40M40 108l68-36 68 36" stroke="currentColor" stroke-opacity=".34" stroke-width="1.5"/><circle cx="40" cy="40" r="11"/><circle cx="176" cy="40" r="11"/><circle cx="40" cy="108" r="11"/><circle cx="176" cy="108" r="11"/><rect x="83" y="47" width="50" height="50" rx="15"/><path d="M108 60v24m-12-12h24" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="40" cy="40" r="3" fill="currentColor"/><circle cx="176" cy="40" r="3" fill="currentColor"/><circle cx="40" cy="108" r="3" fill="currentColor"/><circle cx="176" cy="108" r="3" fill="currentColor"/></svg></div><span class="goal-kicker">A clear path to your first run</span><h2 id="command-first-use-title">Build the team and safeguards once. Then give it real work.</h2><p>Let the Setup Guide organize the workspace and show what still needs your decision. Execution stays blocked until the model, isolation, verification, and evidence checks are ready.</p><div class="command-first-use-actions"><button id="command-start-guided-setup" class="btn" onclick="startGuidedWorkspaceSetup()">Start guided setup</button><button class="btn btn-secondary" onclick="openAgentModal()">Create first teammate</button></div><p id="command-guided-setup-feedback" class="command-guided-setup-feedback" role="status" aria-live="polite">The guide creates a reviewable plan; it does not run work or connect services.</p></div><div class="command-first-use-readiness"><div class="command-first-use-readiness-head"><div><span class="goal-kicker">Execution readiness</span><strong>' + readyCapabilityCount + ' of ' + setupCapabilities.length + ' safeguards ready</strong></div><span class="command-readiness-mark" aria-label="' + readyCapabilityCount + ' of ' + setupCapabilities.length + ' ready">' + readyCapabilityCount + '/' + setupCapabilities.length + '</span></div><ol>' + setupCapabilities.map((item, index) => {
              const ready = capabilities[item.key] === true;
              return '<li class="' + (ready ? 'is-ready' : '') + '"><span class="command-step-index">' + (ready ? '✓' : String(index + 1).padStart(2, '0')) + '</span><span><strong>' + item.label + '</strong><small>' + (ready ? 'Verified' : 'Needs setup') + '</small></span><button type="button" onclick="switchView(&quot;' + item.view + '&quot;)" aria-label="Set up ' + item.label + '">→</button></li>';
            }).join('') + '</ol><p>Each status comes from the active runtime check.</p></div></section>'
          : '';
        const commandWorkArea = firstUse
          ? firstUseMarkup
          : '<section class="forge-panel command-attention"><div class="forge-panel-head"><div><span class="goal-kicker">Your next decision</span><h2>Needs your attention</h2></div><button class="btn btn-sm btn-secondary" onclick="switchView(&quot;approvals&quot;)">Open review desk</button></div>' + attentionRows + '</section>' +
            (hasPreviewRecords ? '<div class="forge-review command-fixture-notice"><strong>Preview data</strong><p>Preview only · no live agent work.</p></div>' : '') +
            '<div class="command-work-overview"><section class="forge-panel command-team-panel"><div class="forge-panel-head"><div><span class="goal-kicker">Your people and their assignments</span><h2>' + teamHeading + '</h2></div><span>' + agents.length + ' PROFILE' + (agents.length === 1 ? '' : 'S') + '</span></div><div class="forge-roster">' + agentRows + '</div><div class="forge-foot"><span>' + teamSummary + '</span><button onclick="switchView(&quot;agents&quot;)">Open team →</button></div></section>' +
            '<section class="forge-panel command-continue"><div class="forge-panel-head"><div><span class="goal-kicker">Keep momentum</span><h2>Continue working</h2></div><button class="btn btn-sm btn-secondary" onclick="switchView(&quot;tasks&quot;)">All work</button></div><div class="forge-task-list">' + taskRows + '</div></section></div>';
        const commandEvents = firstUse
          ? '<details class="forge-panel command-events-disclosure"><summary><span><strong>Recent workspace history</strong><small>' + audit.length + ' saved audit entries · newest activity first</small></span><span class="command-events-toggle">Show activity <b>⌄</b></span></summary><div class="forge-event-list">' + events + '</div></details>'
          : '<details class="forge-panel command-events-disclosure command-events-compact"><summary><span><strong>Last recorded change</strong><small>' + latestEventSummary + '</small></span><span class="command-events-toggle">View history <b>⌄</b></span></summary><div class="forge-event-list">' + events + '</div></details>';
        if(requestId!==viewRequestSequence)return; content.innerHTML = '<main class="forge-room command-room' + (firstUse ? ' is-first-use' : '') + '">' +
          '<header class="forge-header"><div><div class="forge-topline">AgentForge / Workspace snapshot</div><h1>Command room</h1><p>' + (firstUse ? 'Set up the safeguards and create a teammate before starting your first task.' : 'Your agents, work queue, review requests, and recorded changes in one place. The room reflects saved workspace data; it does not simulate activity.') + '</p></div>' + (firstUse ? '' : '<button class="command-signal" onclick="switchView(&quot;graph&quot;)" aria-label="Open Team Room"><span class="command-signal-art ' + (liveTasks.length ? 'is-live' : 'is-idle') + '" aria-hidden="true"><i></i><b></b></span><span class="command-signal-copy"><small>TEAM ROOM</small><strong>Open the live team map</strong><em>' + (liveTasks.length ? liveTasks.length + ' verified run' + (liveTasks.length === 1 ? '' : 's') + ' in progress' : pendingApprovals.length ? pendingApprovals.length + ' decision' + (pendingApprovals.length === 1 ? '' : 's') + ' waiting for review' : 'See assignments, readiness, and review routes') + '</em></span><span class="command-signal-arrow" aria-hidden="true">↗</span></button>') + '</header>' +
          commandWorkArea +
          commandEvents +
          (firstUse ? '' : '<div class="forge-foot"><span>' + escapeHtml(runtimeLabel) + ' · No synthetic activity, spend, or uptime figures are shown.</span><span><button onclick="openTaskModal()">Create task</button> &nbsp;·&nbsp; <button onclick="openAgentModal()">Add agent</button> &nbsp;·&nbsp; <button onclick="switchView(\\'activity\\')">Full event ledger →</button></span></div>') +
          '</main>';
        wireWorkspaceRecords(content, agents, openTasks);
        setTimeout(() => initFloorPhysics(agents, runtime, tasks), 40);
      } else if (viewName === 'graph') {
        title.innerText = 'Team Room';
        actions.innerHTML = '<button class="btn btn-sm btn-secondary" onclick="switchView(\\'agents\\')">Manage teammates</button>';
        if(requestId!==viewRequestSequence)return;
        renderWorkspaceSurfaceLoading(content, 'Team Room', 'Checking saved teammate profiles, work ownership, and review requests.');
        const [harness, tasks, agents, approvals] = await Promise.all([
          fetch('/api/harnesses').then(r=>r.json()),
          fetch('/api/tasks').then(r=>r.json()),
          fetch('/api/agents').then(r=>r.json()),
          fetch('/api/approvals').then(r=>r.json()),
        ]);
        const activeTaskIds = new Set(harness.runtime.activeTaskIds || []);
        const activeTasks = tasks.filter(task => activeTaskIds.has(task.id) && ['in_progress', 'verification_running'].includes(task.status));
        const savedActiveTasks = tasks.filter(task => !activeTaskIds.has(task.id) && ['in_progress', 'verification_running'].includes(task.status));
        const attentionTasks = tasks.filter(task => ['waiting_approval', 'paused', 'failed'].includes(task.status));
        const pendingApprovals = approvals.filter(item => item.status === 'pending');
        const nextTasks = [...attentionTasks, ...activeTasks, ...savedActiveTasks, ...tasks.filter(task => ['ready', 'approved', 'backlog'].includes(task.status))].slice(0, 5);
        const isFixtureLabel = value => /fixture|visual qa/i.test(String(value || ''));
        const hasFixtureRecords = agents.some(agent => isFixtureLabel(agent.id) || isFixtureLabel(agent.name) || isFixtureLabel(agent.role))
          || tasks.some(task => isFixtureLabel(task.title) || isFixtureLabel(task.description))
          || approvals.some(approval => isFixtureLabel(approval.title) || isFixtureLabel(approval.description));
        const fixtureNotice = hasFixtureRecords
          ? '<section class="forge-review team-room-fixture-notice"><strong>Demo records</strong><p>Saved profiles and work below are test data, not live activity.</p></section>'
          : '';
        const teamWorkHeading = hasFixtureRecords ? 'Saved fixture work' : 'Assigned work';
        const teamWorkButton = hasFixtureRecords ? 'Open fixture work' : 'Open work board';
        const teamTaskStatus = task => activeTaskIds.has(task.id) ? 'Live run · ' + task.status.replaceAll('_', ' ') : ['in_progress', 'verification_running'].includes(task.status) ? 'Saved active status · no live run' : task.status.replaceAll('_', ' ');
        if(requestId!==viewRequestSequence)return; content.innerHTML = '<main class="forge-room topology-room" style="max-width:1650px;">' +
          '<header class="forge-header"><div><div class="forge-topline">AgentForge / Your people and their work</div><h1>Team Room</h1><p>Saved teammates and their work, not a live activity feed.</p></div><div class="forge-identity" data-state="' + (harness.runtime.canExecuteTasks ? 'connected' : 'offline') + '"><span>EXECUTION SERVICE</span><strong>' + (harness.runtime.canExecuteTasks ? 'Connected' : 'Offline') + '</strong><span>' + (harness.runtime.canExecuteTasks ? 'Tasks can run with the connected service.' : 'Task execution needs setup.') + '</span></div></header>' + fixtureNotice +
          '<div class="team-room-controls"><div class="team-room-summary"><span><strong>' + agents.length + '</strong> teammates</span><span><strong>' + activeTasks.length + '</strong> active work item' + (activeTasks.length === 1 ? '' : 's') + '</span><span><strong>' + pendingApprovals.length + '</strong> decision' + (pendingApprovals.length === 1 ? '' : 's') + ' waiting</span></div><div class="team-room-mode" role="group" aria-label="Team Room view"><button type="button" class="btn btn-sm btn-secondary" data-team-room-mode="room">Room</button><button type="button" class="btn btn-sm btn-secondary" data-team-room-mode="roster">Roster</button><span>Room shows relationships. Roster gives every saved teammate a readable home.</span></div></div>' +
          '<div class="team-room-layout">' +
            '<section class="team-room-map-card" data-team-room="room"><div class="team-room-card-head"><div><span class="goal-kicker">Workspace relationships</span><h2>Who is connected to the work</h2></div><span class="badge badge-muted">Saved records</span></div><div class="team-room-map-pending" role="status"><div class="team-room-pending-art" aria-hidden="true"><i></i><i></i><i></i><b>✳</b><em></em><em></em></div><span>Loading saved team state</span><strong>Mapping teammates and work</strong></div><canvas id="forge-floor-canvas"></canvas><p class="team-room-map-hint">Select a teammate to see their saved role and current work. Open the full profile for boundaries and tools.</p></section><section class="team-room-roster" data-team-room="roster" hidden><div class="team-room-card-head"><div><span class="goal-kicker">Saved teammate profiles</span><h2>Every teammate, at a glance</h2></div><span class="badge badge-muted">Accessible roster</span></div><div class="team-room-roster-grid"></div></section>' +
            '<aside class="team-room-side"><section class="forge-panel team-room-panel"><div class="forge-panel-head"><h2>What needs attention</h2><button class="btn btn-sm btn-secondary" onclick="switchView(\\'approvals\\')">Open review desk</button></div><div class="team-room-attention">' + (pendingApprovals.length ? '<div class="team-room-attention-card"><span>Review needed</span><strong>' + pendingApprovals.length + ' request' + (pendingApprovals.length === 1 ? '' : 's') + ' await your decision</strong></div>' : attentionTasks.length ? '<div class="team-room-attention-card"><span>Task attention</span><strong>' + attentionTasks.length + ' task' + (attentionTasks.length === 1 ? '' : 's') + ' need review or a decision</strong></div>' : '<div class="command-clear"><span>✓</span><div><strong>No decisions waiting</strong><p>Review requests and paused work will appear here.</p></div></div>') + '</div></section><section class="forge-panel team-room-panel"><div class="forge-panel-head"><h2>' + teamWorkHeading + '</h2><button class="btn btn-sm btn-secondary" onclick="switchView(\\'tasks\\')">' + teamWorkButton + '</button></div><div class="team-room-work">' + (nextTasks.length ? nextTasks.map(task => '<button class="team-room-task" data-task-id="' + escapeHtml(task.id) + '"><strong>' + escapeHtml(task.title) + '</strong><span>' + escapeHtml(teamTaskStatus(task)) + (task.priority ? ' · ' + escapeHtml(task.priority) : '') + '</span></button>').join('') : '<div class="forge-empty"><strong>No saved work yet</strong>Create a task when you are ready to give the team work.</div>') + '</div></section></aside>' +
          '</div>' +
        '</main>';
        const roomMap=content.querySelector('[data-team-room=room]'),roster=content.querySelector('[data-team-room=roster]');
        const rosterGrid=content.querySelector('.team-room-roster-grid');
        for(const agent of agents){const card=document.createElement('button');card.type='button';card.className='team-room-roster-card';const initials=document.createElement('span');initials.className='team-avatar';initials.textContent=agent.name.split(' ').map(word=>word[0]).slice(0,2).join('').toUpperCase();const copy=document.createElement('div');const name=document.createElement('strong');name.textContent=agent.name;const role=document.createElement('span');role.textContent=agent.role||'Configured teammate';const assigned=tasks.filter(task=>task.assignedAgentId===agent.id&&!['completed','failed','cancelled'].includes(task.status));const focus=document.createElement('small');focus.textContent=assigned.length?assigned[0].title:'Profile · '+(agent.status||'idle').replaceAll('_',' ');copy.append(name,role,focus);const count=document.createElement('em');count.textContent=assigned.length+' open';card.append(initials,copy,count);card.onclick=()=>openWorkspaceAgent(agent,card);rosterGrid.append(card);}
        if(!agents.length){const empty=document.createElement('div');empty.className='team-room-roster-empty';empty.textContent='No saved teammate profiles yet. Add a teammate when you are ready to define their role and boundaries.';rosterGrid.append(empty);}
        const applyTeamRoomMode=mode=>{teamRoomMode=mode;const isRoom=mode==='room';roomMap.hidden=!isRoom;roster.hidden=isRoom;content.querySelectorAll('[data-team-room-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.teamRoomMode===mode)));};
        content.querySelectorAll('[data-team-room-mode]').forEach(button=>button.onclick=()=>applyTeamRoomMode(button.dataset.teamRoomMode));
        applyTeamRoomMode(teamRoomMode);
        mountTopologyRecords(content, agents, tasks);
        content.querySelectorAll('.team-room-task').forEach(button=>{const task=tasks.find(item=>item.id===button.dataset.taskId);if(task)button.onclick=()=>{workboardState.agents=agents;openWorkDetail(task);};});
        setTimeout(() => initFloorPhysics(agents, harness.runtime, tasks), 30);
      } else if (viewName === 'goals') {
        title.innerText = 'Goal desk';
        actions.innerHTML = '';
        if(requestId!==viewRequestSequence)return;
        renderWorkspaceSurfaceLoading(content, 'Goals', 'Checking your saved outcomes, requirements, and evidence.');
        const response = await fetch('/api/completion/sessions');
        if (!response.ok) throw new Error('Goal plans could not be loaded.');
        const sessions = await response.json();
        const goalCards = sessions.length ? sessions.map(session => {
          const passed = session.criticReview?.critiquePassed === true;
          const statusClass = session.state === 'COMPLETE_VERIFIED' ? 'badge-green' : session.state === 'BLOCKED_OWNER' || session.state === 'BLOCKED_EXTERNAL' ? 'badge-amber' : session.state === 'FAILED' ? 'badge-red' : 'badge-blue';
          const goalText = session.originalGoal?.rawText || '';
          const excerpt = goalText.slice(0, 620);
          return '<article class="goal-record"><div class="goal-record-head"><span class="goal-record-id">' + escapeHtml(session.taskId) + '</span><span class="badge ' + statusClass + '">' + escapeHtml(session.state.replaceAll('_', ' ')) + '</span></div><h3>' + escapeHtml(session.prd?.title || 'Untitled goal') + '</h3><p>' + escapeHtml(excerpt) + (goalText.length > 620 ? '…' : '') + '</p><div class="goal-record-meta"><span class="badge ' + (passed ? 'badge-green' : 'badge-amber') + '">' + (passed ? 'Source checks passed' : 'Source checks need review') + '</span><span class="badge badge-muted">' + (session.prd?.requirements?.length || 0) + ' requirements</span><span class="badge badge-muted">Started ' + escapeHtml(new Date(session.startedAt).toLocaleString()) + '</span></div><p>' + (session.state === 'COMPLETE_VERIFIED' ? 'Completion was verified in this process.' : 'This is a saved draft. Review its scope, acceptance criteria and dependencies before execution; creating a plan does not start an agent.') + '</p></article>';
        }).join('') : '<div class="goal-empty">No goal plans have been saved in this workspace yet. Add a goal to preserve its original wording, generated requirements, and review state.</div>';
        if(requestId!==viewRequestSequence)return; content.innerHTML = '<div class="goal-workspace"><div class="goal-intro"><section class="goal-intro-copy"><div class="goal-kicker">AgentForge · Persistent goal tracking</div><h1 class="goal-heading">Keep the goal. Track the proof.</h1><p class="goal-description">Turn a substantial request into a saved requirement plan with an immutable source goal, a dependency map, and an explicit review state. Plans survive a server restart.</p></section><form class="goal-compose" onsubmit="createCompletionGoal(); return false"><label for="completion-goal-input">What should AgentForge work toward?</label><textarea id="completion-goal-input" maxlength="40000" required placeholder="Describe the outcome, requirements, constraints, and how you will know it is done."></textarea><div id="completion-goal-feedback" class="goal-boundary" aria-live="polite">Plan creation saves the goal and requirements. It does not execute an agent task.</div><button class="btn" type="submit">Create goal plan</button></form></div><div class="goal-section-head"><h2>Saved goal plans</h2><span class="home-panel-count">' + sessions.length + (sessions.length === 1 ? ' plan' : ' plans') + '</span></div><div class="goal-records">' + goalCards + '</div></div>';
        content.querySelectorAll('.goal-record').forEach((card,index)=>{const button=document.createElement('button');button.className='btn btn-secondary';button.textContent='Open plan & evidence';button.onclick=()=>showGoalDetails(sessions[index]);card.append(button);});
      } else if (viewName === 'messages') {
        title.innerText = 'Conversations';
        actions.innerHTML = '';
        await showConversations();
      } else if (viewName === 'agents') {
        title.innerText = 'Teammates';
        actions.innerHTML = '';
        await showTeamDirectory();
      } else if (viewName === 'tasks') {
        title.innerText = 'Work board';
        actions.innerHTML = '';
        await showWorkboard();
      } else if (viewName === 'approvals') {
        title.innerText = 'Review desk';
        actions.innerHTML = '';
        await showReviewCenter();
      } else if (viewName === 'processes') {
        title.innerText = 'Playbooks';
        actions.innerHTML = '';
        await showPlaybookLibrary();
      } else if (viewName === 'voice') {
        title.innerText = 'Voice Call Simulator';
        actions.innerHTML = '<button class="btn" onclick="simulateVoiceCall()">+ Simulate Outbound Call</button>';
        const res = await fetch('/api/calls');
        const calls = await res.json();
        if(requestId!==viewRequestSequence)return; content.innerHTML = '<div class="item-card">Mock simulation only. No telephone call is placed by this build.</div><div class="grid-cards">' + calls.map(c => renderCallCard(c)).join('') + '</div>';
      } else if (viewName === 'marketplace') {
        title.innerText = 'Package library';
        actions.innerHTML = '';
        await showPackageLibrary();
      } else if (viewName === 'activity') {
        title.innerText = 'Activity';
        actions.innerHTML = '';
        await showActivityTimeline();
      } else if (viewName === 'inbox') {
        title.innerText = 'Inbox';
        actions.innerHTML = '';
        await showActionInbox();
      } else if (viewName === 'migration') {
        title.innerText = 'Migration';
        actions.innerHTML = '';
        await showMigrationWorkspace();
      } else if (viewName === 'models' || viewName === 'compute') {
        title.innerText = viewName === 'models' ? 'Models' : 'Compute';
        actions.innerHTML = '';
        await showConnectionWorkspace(viewName);
      } else if (viewName === 'tools') {
        title.innerText = 'Tools';
        actions.innerHTML = '';
        await showConnectionWorkspace('tools');
      } else if (viewName === 'studio') {
        title.innerText = 'Agent studio';
        actions.innerHTML = '';
        // Render immediately. A slow local store must never leave the primary workspace blank.
        if(requestId!==viewRequestSequence)return;
        content.innerHTML = '<main class="agent-studio agent-studio-loading" aria-busy="true" aria-live="polite"><header class="studio-hero"><div><span class="forge-topline">BUILD · TEST · REVIEW</span><h1>Agent studio</h1><p>Loading your saved teammates, work, processes, and setup guide.</p></div><div class="studio-hero-mark" aria-hidden="true"><i></i><i></i><i></i><b>✳</b></div></header><section class="studio-loading-layout"><aside><i></i><i></i><i></i></aside><section><i></i><i></i><i></i><i></i></section><aside><i></i><i></i></aside></section></main>';
        const [harness, agents, tasks, processes, threads, sessions, guideStatus] = await Promise.all([
          fetch('/api/harnesses').then(response => response.json()),
          fetch('/api/agents').then(response => response.json()),
          fetch('/api/tasks').then(response => response.json()),
          fetch('/api/processes').then(response => response.json()),
          fetch('/api/threads').then(response => response.json()),
          fetch('/api/completion/sessions').then(response => response.json()),
          fetch('/api/setup-guide/status').then(response => response.json()),
        ]);
        const configured = agents.length;
        actions.innerHTML = configured ? '<button class="btn btn-sm" onclick="openAgentModal()">Add teammate</button>' : '';
        // Keep the embedded guide visible after first-run preparation so the
        // next decision is clear instead of burying it behind a generic profile.
        const selected = agents.find(agent => agent.id === 'agent-setup-guide') || agents[0];
        const assigned = selected ? tasks.filter(task => task.assignedAgentId === selected.id && !['completed', 'failed', 'cancelled'].includes(task.status)) : [];
        const capabilityNames = Object.entries(harness.runtime.readiness?.capabilities || {}).filter(([, value]) => value).map(([name]) => name.replace(/([A-Z])/g, ' $1').replace(/^./, letter => letter.toUpperCase()));
        const readiness = Object.fromEntries((guideStatus.gates || []).map(gate => [gate.key, gate.ready]));
        const setupSteps = guideStatus.gates || [];
        const guideThread = guideStatus.thread || threads.find(thread => thread.title === 'Workspace setup' && !thread.archived);
        const setupSession = guideStatus.prepared ? sessions.find(session => session.originalGoal?.submittedBy === 'setup-guide') : undefined;
        const guidePrepared = Boolean(guideStatus.prepared);
        const guideRequirements = Array.isArray(guideStatus.requirements) ? guideStatus.requirements : [];
        const guideRequirementRows = guideRequirements.slice(0, 4).map(requirement => '<li><span class="studio-guide-requirement-risk" data-risk="' + escapeHtml(requirement.riskLevel || 'medium') + '">' + escapeHtml((requirement.riskLevel || 'medium').replaceAll('_', ' ')) + '</span><div><strong>' + escapeHtml(requirement.title) + '</strong><small>' + escapeHtml((requirement.acceptanceCriteria || [])[0] || 'Acceptance criteria are recorded in the saved plan.') + '</small></div></li>').join('');
        const guideRequirementCard = guidePrepared ? '<section class="studio-guide-requirements"><div><span class="goal-kicker">Prepared plan</span><strong>' + guideRequirements.length + ' reviewable requirement' + (guideRequirements.length === 1 ? '' : 's') + '</strong></div><p>' + escapeHtml(guideStatus.outcome || 'The saved outcome is available in the guide conversation.') + '</p><ol>' + (guideRequirementRows || '<li class="studio-muted">The guide has not extracted requirements yet.</li>') + '</ol>' + (guideRequirements.length > 4 ? '<button class="btn btn-sm btn-secondary" onclick="switchView(&quot;goals&quot;)">View complete plan</button>' : '') + '</section>' : '';
        const setupPlan = guideStatus.setupPlan;
        const setupRoleRows = setupPlan?.roles?.map(role => '<li><strong>' + escapeHtml(role.name) + '</strong><small>' + escapeHtml(role.purpose || 'Role inferred from the stated outcome.') + '</small></li>').join('') || '<li class="studio-muted">Tell the guide the outcome to infer the team.</li>';
        const setupQuestionRows = setupPlan?.questions?.filter(question => question.required).slice(0, 3).map(question => '<li><strong>' + escapeHtml(question.prompt) + '</strong><small>Needed before ' + escapeHtml(question.blocks?.join(', ') || 'live execution') + '.</small></li>').join('') || '<li class="studio-muted">No owner decisions are required yet.</li>';
        const setupAnswerRows = (guideStatus.setupAnswers || []).map(answer => '<li><strong>' + escapeHtml(answer.questionId) + '</strong><small>' + escapeHtml(answer.answer) + '</small></li>').join('') || '<li class="studio-muted">No answers saved yet.</li>';
        const nextSetupQuestion = guideStatus.nextQuestion;
        const setupAnswerForm = nextSetupQuestion
          ? '<form class="studio-guide-answer" onsubmit="saveSetupAnswer(event)"><span class="goal-kicker">Your next decision</span><label for="setup-guide-answer"><strong>' + escapeHtml(nextSetupQuestion.prompt) + '</strong><small>' + escapeHtml(nextSetupQuestion.reason || 'This answer helps the guide prepare the safest next step.') + '</small></label><input type="hidden" name="questionId" value="' + escapeHtml(nextSetupQuestion.id) + '"><textarea id="setup-guide-answer" name="answer" rows="3" required maxlength="20000" placeholder="Type your answer in plain language"></textarea><div><button class="btn btn-sm" type="submit">Save answer</button><span class="studio-guide-answer-feedback" role="status" aria-live="polite"></span></div></form>'
          : '<div class="studio-guide-answer studio-guide-answer-complete"><strong>All required setup answers are saved.</strong><small>You can still update constraints in the guide conversation.</small></div>';
        const setupRevisionRows = (guideStatus.setupRevisions || []).slice(-4).reverse().map(revision => '<li><strong>Plan v' + escapeHtml(String(revision.version)) + '</strong><small>' + escapeHtml(revision.title || 'Previous setup plan') + '</small></li>').join('') || '<li class="studio-muted">No previous plan revisions.</li>';
        const setupPlanCard = setupPlan ? '<section class="studio-guide-requirements"><div><span class="goal-kicker">Agent plan</span><strong>' + escapeHtml(setupPlan.summary || 'The guide inferred a starting workforce.') + '</strong></div>' + setupAnswerForm + '<div class="studio-plan-columns"><div><span class="goal-kicker">Proposed teammates</span><ol>' + setupRoleRows + '</ol></div><div><span class="goal-kicker">Questions for you</span><ol>' + setupQuestionRows + '</ol></div></div><div><span class="goal-kicker">Saved owner answers</span><ol>' + setupAnswerRows + '</ol></div><div><span class="goal-kicker">Plan history</span><ol>' + setupRevisionRows + '</ol></div></section>' : '';
        const runtimeReadinessRows = (guideStatus.runtimeReadiness?.capabilities || []).map(capability => '<li class="' + (capability.configured ? 'ready' : '') + '"><strong>' + (capability.configured ? '✓ ' : '○ ') + escapeHtml(capability.label) + '</strong><small>' + escapeHtml(capability.detail) + (capability.runtimeState ? ' Runtime: ' + escapeHtml(capability.runtimeState) + '.' : '') + '</small></li>').join('');
        const runtimeReadinessCard = runtimeReadinessRows ? '<section class="studio-guide-requirements"><div><span class="goal-kicker">This computer</span><strong>What AgentForge found</strong></div><p>' + escapeHtml(guideStatus.runtimeReadiness.nextAction || 'Review the next configuration decision.') + '</p><ol>' + runtimeReadinessRows + '</ol></section>' : '';
        const guideSteps = selected?.id === 'agent-setup-guide' ? '<section class="studio-panel studio-guide-panel"><div class="studio-panel-head"><div><span class="goal-kicker">Embedded workspace guide</span><h3>' + (guidePrepared ? 'Your workspace is organized' : 'Ready to organize your workspace') + '</h3></div><span>' + setupSteps.filter(gate => !gate.ready).length + ' decision' + (setupSteps.filter(gate => !gate.ready).length === 1 ? '' : 's') + ' remain</span></div><div class="studio-guide-proof"><div class="' + (guidePrepared ? 'ready' : '') + '"><i>✓</i><span>Workspace</span><strong>' + (guidePrepared ? 'Prepared' : 'Waiting for outcome') + '</strong></div><div class="' + (guideThread ? 'ready' : '') + '"><i>◌</i><span>Guide conversation</span><strong>' + (guideThread ? 'Ready' : 'Not created') + '</strong></div><div class="' + (setupSession ? 'ready' : '') + '"><i>◇</i><span>Requirement plan</span><strong>' + (setupSession ? 'Saved' : 'Not created') + '</strong></div></div><div class="studio-guide-copy"><strong>AgentForge already handled:</strong> the project, private channel, durable guide conversation, and reviewable plan. <strong>Next:</strong> ' + escapeHtml(guideStatus.nextAction || 'Tell the guide the outcome you want to achieve.') + '.</div>' + guideRequirementCard + runtimeReadinessCard + setupPlanCard + '<ul>' + setupSteps.map(gate => '<li class="' + (gate.ready ? 'ready' : '') + '"><strong>' + (gate.ready ? '✓ ' : '○ ') + escapeHtml(gate.title) + '</strong><button class="btn btn-sm btn-secondary" onclick="switchView(&quot;' + escapeHtml(gate.view) + '&quot;)">' + (gate.ready ? 'Review' : 'Set up') + '</button></li>').join('') + '</ul><footer><span>Ask the guide what is missing, add constraints, or keep the handoff in one durable conversation.</span><button class="btn btn-sm btn-secondary" onclick="openSetupGuideConversation()">Open guide conversation</button></footer></section>' : '';
        const agentRows = configured ? agents.map(agent => '<button class="studio-agent-row" onclick="switchView(&quot;agents&quot;)"><span>' + escapeHtml((agent.name || '?').slice(0, 1).toUpperCase()) + '</span><div><strong>' + escapeHtml(agent.name) + '</strong><small>' + escapeHtml(agent.role || 'Configured teammate') + '</small></div><em>' + escapeHtml((agent.status || 'idle').replaceAll('_', ' ')) + '</em></button>').join('') : '<div class="studio-empty-list">No teammates yet</div>';
        const workRows = assigned.length ? assigned.slice(0, 5).map(task => '<li><strong>' + escapeHtml(task.title) + '</strong><span>' + escapeHtml(task.status.replaceAll('_', ' ')) + '</span></li>').join('') : '<li class="studio-muted">No open work is assigned yet.</li>';
        const processRows = processes.length ? processes.slice(0, 4).map(process => '<li><strong>' + escapeHtml(process.name) + '</strong><span>v' + escapeHtml(String(process.version)) + '</span></li>').join('') : '<li class="studio-muted">No saved processes yet.</li>';
        if(requestId!==viewRequestSequence)return; content.innerHTML = '<main class="agent-studio"><header class="studio-hero"><div><span class="forge-topline">BUILD · TEST · REVIEW</span><h1>Agent studio</h1><p>Configure teammates and examine the boundaries around their work. This surface only reflects saved records and verified runtime state.</p></div><div class="studio-hero-mark" aria-hidden="true"><i></i><i></i><i></i><b>✳</b></div></header><section class="studio-layout"><aside class="studio-rail"><div class="studio-rail-head"><span>TEAMMATES</span></div><div class="studio-agent-list">' + agentRows + '</div><div class="studio-rail-foot">' + configured + ' saved profile' + (configured === 1 ? '' : 's') + '</div></aside><section class="studio-editor"><header><div><span class="goal-kicker">' + (selected ? 'Selected profile' : 'Start here') + '</span><h2>' + escapeHtml(selected?.name || 'Build your first teammate') + '</h2><p>' + escapeHtml(selected ? (selected.description || selected.role || 'This teammate has no saved description yet.') : 'Create a teammate with a clear role, boundaries, and an explicit provider choice.') + '</p></div>' + (selected ? '<button class="btn btn-secondary" onclick="switchView(&quot;agents&quot;)">Edit profile</button>' : '<button class="btn" onclick="openAgentModal()">Create teammate</button>') + '</header><div class="studio-editor-grid"><section><span>ROLE</span><strong>' + escapeHtml(selected?.role || 'Not configured') + '</strong></section><section><span>STATUS</span><strong>' + escapeHtml((selected?.status || 'not configured').replaceAll('_', ' ')) + '</strong></section><section><span>ASSIGNED WORK</span><strong>' + assigned.length + '</strong></section><section><span>PROCESSES</span><strong>' + processes.length + '</strong></section></div>' + guideSteps + '<section class="studio-panel"><div class="studio-panel-head"><h3>Assigned work</h3><button class="btn btn-sm btn-secondary" onclick="switchView(&quot;tasks&quot;)">Open work</button></div><ul>' + workRows + '</ul></section><section class="studio-panel"><div class="studio-panel-head"><h3>Saved processes</h3><button class="btn btn-sm btn-secondary" onclick="switchView(&quot;processes&quot;)">Open processes</button></div><ul>' + processRows + '</ul></section></section><aside class="studio-inspector"><span class="goal-kicker">Execution readiness</span><h2>' + (harness.runtime.canExecuteTasks ? 'Ready to review' : 'Planning only') + '</h2><p>' + escapeHtml(harness.runtime.explanation) + '</p><div class="studio-gates">' + (capabilityNames.length ? capabilityNames.map(name => '<span>✓ ' + escapeHtml(name) + '</span>').join('') : '<span>○ No verified capabilities</span>') + '</div><button class="btn btn-secondary" onclick="switchView(&quot;harnesses&quot;)">Inspect runtime</button></aside></section></main>';
      } else if (viewName === 'projects') {
        title.innerText = 'Projects';
        actions.innerHTML = '';
        await showProjects();
      } else if (viewName === 'memory') {
        title.innerText = 'Memory';
        actions.innerHTML = '';
        await showMemoryWorkspace();
      } else if (viewName === 'harnesses') {
        title.innerText = 'Harness';
        actions.innerHTML = '';
        await showConnectionWorkspace(viewName);
      } else if (viewName === 'benchmarks') {
        title.innerText = 'Performance';
        actions.innerHTML = '';
        await showPerformanceWorkspace();
      } else if (viewName === 'docs') {
        title.innerText = 'Specifications';
        actions.innerHTML = '';
        await showDocumentLibrary();
      } else if (viewName === 'settings') {
        title.innerText = 'Settings';
        actions.innerHTML = '';
        await showWorkspaceSettings();
      } else {
        title.innerText = viewName.toUpperCase();
        actions.innerHTML = '';
        if(requestId!==viewRequestSequence)return; content.innerHTML = '<div class="item-card">This <b>' + viewName + '</b> view is a placeholder and is not implemented yet.</div>';
      }
      if (requestId === viewRequestSequence) syncWorkspaceExperiencePicker();
    }

    function renderInboxCard(item) {
      return '<div class="item-card">' +
        '<div style="display:flex; justify-content:space-between; align-items:center;">' +
          '<b>' + escapeHtml(item.title) + '</b><span class="badge ' + (item.severity === 'critical' ? 'badge-red' : item.severity === 'warning' ? 'badge-amber' : 'badge-blue') + '">' + escapeHtml(item.severity.toUpperCase()) + '</span>' +
        '</div>' +
        '<div style="font-size:0.8rem; margin:0.4rem 0;">' + escapeHtml(item.description) + '</div>' +
        '<div style="font-size:0.75rem; color:var(--text-muted);">' + new Date(item.timestamp).toLocaleString() + '</div>' +
        (item.actionable && item.type === 'approval_needed' ? '<button class="btn btn-sm" style="margin-top:0.5rem;" onclick="switchView(\\'approvals\\')">Go to Approvals</button>' : '') +
        (item.actionable && item.type === 'task_failed' ? '<button class="btn btn-sm btn-secondary" style="margin-top:0.5rem;" onclick="switchView(\\'tasks\\')">Inspect Task</button>' : '') +
      '</div>';
    }

    function renderMigrationSourceCard(s) {
      return '<div class="item-card">' +
        '<div style="display:flex; justify-content:space-between; align-items:center;">' +
          '<b>' + escapeHtml(s.name) + '</b><span class="badge badge-blue">SOURCE</span>' +
        '</div>' +
        '<div style="font-size:0.8rem; color:var(--text-muted); margin:0.3rem 0;">' + escapeHtml(s.description) + '</div>' +
        '<div style="display:flex; gap:0.4rem; margin-top:0.5rem; flex-wrap:wrap;">' +
          '<button class="btn btn-sm btn-secondary" onclick="runMigrationInspect(' + safeJsString(s.id) + ')">Inspect</button>' +
          '<button class="btn btn-sm btn-secondary" onclick="runMigrationPlan(' + safeJsString(s.id) + ')">View Plan</button>' +
          '<button class="btn btn-sm" onclick="runMigrationDryRun(' + safeJsString(s.id) + ')">Dry Run</button>' +
          '<button class="btn btn-sm btn-green" onclick="runMigrationImport(' + safeJsString(s.id) + ')">Import & Verify</button>' +
        '</div>' +
      '</div>';
    }

    function renderMemoryCard(record) {
      return '<div class="item-card"><div class="card-title">' + escapeHtml(record.title) + '</div><div style="font-size:0.75rem;color:var(--text-muted);">' + escapeHtml(record.category.replaceAll('_', ' ')) + ' · ' + escapeHtml(record.namespace) + (record.tags.length ? ' · ' + escapeHtml(record.tags.join(', ')) : '') + '</div><div style="white-space:pre-wrap;margin-top:0.5rem;">' + escapeHtml(record.content) + '</div><div style="font-size:0.7rem;color:var(--text-muted);margin-top:0.5rem;">Saved ' + escapeHtml(new Date(record.createdAt).toLocaleString()) + '</div></div>';
    }

    async function runMigrationInspect(source) {
      const res = await fetch('/api/migration/inspect', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ source }) });
      const data = await res.json();
      document.getElementById('migration-results').innerHTML = '<div class="item-card"><div class="card-title">Local Fixture Inspection: ' + escapeHtml(source) + '</div><pre style="font-size:0.75rem;">' + escapeHtml(JSON.stringify(data, null, 2)) + '</pre></div>';
    }

    async function runMigrationPlan(source) {
      const res = await fetch('/api/migration/plan', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ source }) });
      const data = await res.json();
      document.getElementById('migration-results').innerHTML = '<div class="item-card"><div class="card-title">Local Fixture Plan: ' + escapeHtml(source) + ' (Readiness score is not live-system verification)</div><pre style="font-size:0.75rem;">' + escapeHtml(JSON.stringify(data, null, 2)) + '</pre></div>';
    }

    async function runMigrationDryRun(source) {
      const res = await fetch('/api/migration/dry-run', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ source }) });
      const data = await res.json();
      document.getElementById('migration-results').innerHTML = '<div class="item-card"><div class="card-title">Local Fixture Dry Run: ' + escapeHtml(source) + '</div><div>This fixture result is not a production-system migration test.</div><pre style="font-size:0.75rem;">' + escapeHtml(JSON.stringify(data.dryRun, null, 2)) + '</pre></div>';
    }

    async function runMigrationImport(source) {
      const res = await fetch('/api/migration/import', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ source }) });
      const data = await res.json();
      document.getElementById('migration-results').innerHTML = '<div class="item-card"><div class="card-title">Import & Verification: ' + escapeHtml(source) + '</div><div style="font-weight:600;">' + escapeHtml(data.result.importedCount) + ' items in local import result. See unverified fixture output below.</div><pre style="font-size:0.75rem;">' + escapeHtml(JSON.stringify(data.verification, null, 2)) + '</pre></div>';
    }

    async function testEmpiricalRoute() {
      const res = await fetch('/api/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskType: 'code_generation', risk: 'critical', complexityScore: 9, contextTokens: 3000, toolUseRequired: true }),
      });
      const data = await res.json();
      document.getElementById('route-result').innerHTML = '<div class="item-card" style="margin-top:1rem;"><div class="card-title">Empirical Route Output</div><div style="font-size:0.8rem;">Selected: <b>Tier ' + escapeHtml(data.selectedTier) + '</b> (' + escapeHtml(data.selectedTargetId) + ')</div><div>Cost Type: <b>' + escapeHtml(data.costType) + '</b> | Est: ' + escapeHtml(data.estimatedCostUsd) + '</div><div style="font-size:0.75rem; color:var(--text-muted);">' + escapeHtml(data.rationale) + '</div></div>';
    }

    function renderMessage(m) {
      return renderChatMessageCard(m);
    }

    function renderChatMessageCard(m) {
      const isUser = m.authorType === 'user';
      const timeStr = m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

      if (isUser) {
        return '<div class="chat-msg user">' +
          '<div class="chat-avatar user">U</div>' +
          '<div class="chat-bubble">' +
            '<div class="chat-meta">' +
              '<span class="agent-name">Architect / Lead</span>' +
              '<span class="time">' + escapeHtml(timeStr) + '</span>' +
            '</div>' +
            '<div>' + escapeHtml(m.content) + '</div>' +
          '</div>' +
        '</div>';
      }

      let raw = m.content || '';
      let thoughtHtml = '';
      let toolHtml = '';

      const thoughtMatch = raw.match(/\[THOUGHT\]([\s\S]*?)\[\/THOUGHT\]/);
      if (thoughtMatch) {
        const thoughtText = escapeHtml(thoughtMatch[1].trim());
        raw = raw.replace(/\[THOUGHT\][\s\S]*?\[\/THOUGHT\]/, '').trim();
        thoughtHtml = '<div class="chat-thought-trace">' +
          '<div class="chat-thought-header" onclick="const b=this.nextElementSibling; b.style.display=(b.style.display===\\'none\\'?\\'block\\':\\'none\\');">' +
            '<span>⚡ Deep Reasoning Trace (Tier 2 Fast-Path · Verified)</span>' +
            '<span style="font-size:10px;">▾ Toggle</span>' +
          '</div>' +
          '<div class="chat-thought-body" style="display:none;">' + thoughtText + '</div>' +
        '</div>';
      }

      const toolMatch = raw.match(/\[TOOL\]([\s\S]*?)\[\/TOOL\]/);
      if (toolMatch) {
        const toolText = escapeHtml(toolMatch[1].trim());
        raw = raw.replace(/\[TOOL\][\s\S]*?\[\/TOOL\]/, '').trim();
        toolHtml = '<div class="chat-tool-card">' +
          '<div style="color:#c4b5fd; font-weight:700; margin-bottom:4px;">✦ TOOL EXECUTION</div>' +
          '<div style="color:#cbd5e1; font-family:monospace;">' + toolText + '</div>' +
        '</div>';
      }

      let questionHtml = '';
      const qStart = raw.indexOf('[QUESTION:');
      const qEnd = raw.indexOf('[/QUESTION]');
      if (qStart !== -1 && qEnd !== -1 && qEnd > qStart) {
        const fullQ = raw.slice(qStart, qEnd + 11);
        const headerEnd = fullQ.indexOf(']');
        const qTitle = fullQ.slice(10, headerEnd).trim();
        const qBody = fullQ.slice(headerEnd + 1, fullQ.length - 11);
        raw = (raw.slice(0, qStart) + raw.slice(qEnd + 11)).trim();

        let subTitle = '';
        const subIdx = qBody.indexOf('[SUBTITLE:');
        if (subIdx !== -1) {
          const subClose = qBody.indexOf(']', subIdx);
          if (subClose !== -1) subTitle = qBody.slice(subIdx + 10, subClose).trim();
        }

        const choices = [];
        const choiceParts = qBody.split('[CHOICE:');
        for (let idx = 1; idx < choiceParts.length; idx++) {
          const closeBracket = choiceParts[idx].indexOf(']');
          if (closeBracket !== -1) {
            const inner = choiceParts[idx].slice(0, closeBracket);
            const tokens = inner.split('|').map(t => t.trim());
            if (tokens.length >= 2) {
              choices.push({ id: tokens[0], title: tokens[1], desc: tokens[2] || '' });
            }
          }
        }

        let choicesHtml = choices.map(c =>
          '<div class="chat-choice-card" onclick="selectChatChoice(\\\'' + escapeHtml(c.id) + '\\\', \\\'' + escapeHtml(c.title) + '\\\')">' +
            '<div class="chat-choice-radio"></div>' +
            '<div class="chat-choice-body">' +
              '<div class="chat-choice-heading">' + escapeHtml(c.title) + '</div>' +
              '<div class="chat-choice-desc">' + escapeHtml(c.desc) + '</div>' +
            '</div>' +
          '</div>'
        ).join('');

        questionHtml = '<div class="chat-interactive-box">' +
          '<div class="chat-interactive-title"><span>❓</span> ' + escapeHtml(qTitle) + '</div>' +
          (subTitle ? '<div class="chat-interactive-sub">' + escapeHtml(subTitle) + '</div>' : '') +
          '<div class="chat-choice-grid">' + choicesHtml + '</div>' +
        '</div>';
      }

      let actionsBoxHtml = '';
      const actStart = raw.indexOf('[ACTIONS]');
      const actEnd = raw.indexOf('[/ACTIONS]');
      if (actStart !== -1 && actEnd !== -1 && actEnd > actStart) {
        const fullAct = raw.slice(actStart, actEnd + 10);
        const aBody = fullAct.slice(9, fullAct.length - 10);
        raw = (raw.slice(0, actStart) + raw.slice(actEnd + 10)).trim();

        const actionItems = [];
        const actParts = aBody.split('[ACTION:');
        for (let idx = 1; idx < actParts.length; idx++) {
          const closeBracket = actParts[idx].indexOf(']');
          if (closeBracket !== -1) {
            const inner = actParts[idx].slice(0, closeBracket);
            const tokens = inner.split('|').map(t => t.trim());
            if (tokens.length >= 2) {
              actionItems.push({ id: tokens[0], label: tokens[1] });
            }
          }
        }

        actionsBoxHtml = '<div class="chat-interactive-actions">' +
          actionItems.map(a =>
            '<button class="chat-action-btn" onclick="selectChatAction(\\\'' + escapeHtml(a.id) + '\\\', \\\'' + escapeHtml(a.label) + '\\\')">' + escapeHtml(a.label) + '</button>'
          ).join('') +
        '</div>';
      }

      let formattedBody = escapeHtml(raw);
      const bt = String.fromCharCode(96);
      const tripleBt = bt + bt + bt;
      const nl = String.fromCharCode(10);

      const codeBlockParts = formattedBody.split(tripleBt);
      if (codeBlockParts.length > 2) {
        let reconstructed = '';
        for (let idx = 0; idx < codeBlockParts.length; idx++) {
          if (idx % 2 === 1) {
            const firstNl = codeBlockParts[idx].indexOf(nl);
            const lang = firstNl > 0 ? codeBlockParts[idx].slice(0, firstNl).trim() : '';
            const code = firstNl > 0 ? codeBlockParts[idx].slice(firstNl + 1) : codeBlockParts[idx];
            reconstructed += '<pre style="background:rgba(0,0,0,0.6); border:1px solid rgba(196,181,253,0.2); border-radius:6px; padding:10px; margin:8px 0; overflow-x:auto; font-family:monospace; font-size:11px; color:#7dd3fc;"><code class="language-' + lang + '">' + code + '</code></pre>';
          } else {
            reconstructed += codeBlockParts[idx];
          }
        }
        formattedBody = reconstructed;
      }

      const inlineParts = formattedBody.split(bt);
      if (inlineParts.length > 2) {
        let reconstructed = '';
        for (let idx = 0; idx < inlineParts.length; idx++) {
          if (idx % 2 === 1) {
            reconstructed += '<code style="background:rgba(196,181,253,0.1); color:#c4b5fd; padding:2px 5px; border-radius:4px; font-family:monospace; font-size:11px;">' + inlineParts[idx] + '</code>';
          } else {
            reconstructed += inlineParts[idx];
          }
        }
        formattedBody = reconstructed;
      }

      const boldParts = formattedBody.split('**');
      if (boldParts.length > 2) {
        let reconstructed = '';
        for (let idx = 0; idx < boldParts.length; idx++) {
          if (idx % 2 === 1) {
            reconstructed += '<strong>' + boldParts[idx] + '</strong>';
          } else {
            reconstructed += boldParts[idx];
          }
        }
        formattedBody = reconstructed;
      }

      formattedBody = formattedBody.split(nl).join('<br>');

      const matchingAgent = (storeData.agents || []).find(a => a.id === m.authorId);
      const agentName = matchingAgent ? matchingAgent.name : (m.authorId || 'AgentForge');
      const modelBadge = matchingAgent
        ? escapeHtml(matchingAgent.role || 'Teammate')
        : 'Workspace message';

      const avatarMark = agentName.slice(0, 1).toUpperCase();

      const rawMsgContent = m.body || m.content || '';
      const hasDeliverables = !!(m.worktree || m.hasDeliverable || rawMsgContent.indexOf('[DELIVERABLE]') !== -1 || rawMsgContent.indexOf('Commit & Sealed') !== -1);
      const actionsHtml = hasDeliverables ? ('<div class="chat-actions">' +
        '<button class="btn btn-sm" style="background:#c4b5fd; color:#000; font-weight:700; font-size:11px;" onclick="handleChatAction(\\'approve\\', \\'' + escapeHtml(m.id || '') + '\\')">✓ Approve &amp; Merge</button>' +
        '<button class="btn btn-sm btn-secondary" style="font-size:11px;" onclick="handleChatAction(\\'vitest\\', \\'' + escapeHtml(m.id || '') + '\\')">⚡ Run Vitest</button>' +
        '<button class="btn btn-sm btn-secondary" style="font-size:11px;" onclick="handleChatAction(\\'evidence\\', \\'' + escapeHtml(m.id || '') + '\\')">🔍 Evidence Pack</button>' +
      '</div>') : '';

      return '<div class="chat-msg agent">' +
        '<div class="chat-avatar agent">' + avatarMark + '</div>' +
        '<div class="chat-bubble" style="width:100%;">' +
          '<div class="chat-meta">' +
            '<span class="agent-name">' + escapeHtml(agentName) + '</span>' +
            '<span class="model-badge">' + escapeHtml(modelBadge) + '</span>' +
            '<span class="time">' + escapeHtml(timeStr) + '</span>' +
          '</div>' +
          thoughtHtml +
          toolHtml +
          '<div style="margin-top:6px; line-height:1.6; font-size:12px;">' + formattedBody + '</div>' +
          questionHtml +
          actionsBoxHtml +
          actionsHtml +
        '</div>' +
      '</div>';
    }

    function dismissWelcomeCard() {
      const card = document.getElementById('welcome-onboarding-card');
      if (card) card.style.display = 'none';
    }

    function renderWelcomeCard() {
      const matchingAgent = chatTargetType === 'agent'
        ? (storeData.agents || []).find(agent => agent.id === activeChatAgent)
        : undefined;
      if (matchingAgent) {
        const description = matchingAgent.description || 'This teammate has no saved description yet.';
        return '<div class="chat-empty-state"><strong>' + escapeHtml(matchingAgent.name) + '</strong><p>' + escapeHtml(description) + '</p><p>Messages are saved to the workspace. A response requires a configured model route and an execution backend.</p></div>';
      }
      return '<div class="chat-empty-state"><strong>Workspace conversation</strong><p>Use this area to save team messages and review work records. No model route or execution backend is configured in this workspace.</p><p>Create an agent from Team when you are ready to define a teammate.</p></div>';
    }

    function renderChatWorkspace(msgs, channels) {
      const activeChannel = channels.find(channel => channel.id === currentChannelId);
      const activeTitle = (chatTargetType === 'agent')
        ? '@' + activeChatAgentName + ' [' + activeChatAgentRole + ']'
        : '#' + (activeChannel ? activeChannel.name : currentChannelId);
      const activeTier = 'No model route configured';
      const channelRowsHtml = channels.length ? channels.map(channel =>
        '<div class="chat-channel-item ' + (currentChannelId === channel.id && chatTargetType === 'channel' ? 'active' : '') + '" onclick="switchChatChannel(\\\'' + escapeHtml(channel.id) + '\\\')">' +
          '<span>#</span> <span>' + escapeHtml(channel.name) + '</span>' +
        '</div>'
      ).join('') : '<div class="chat-empty-state">No channels saved in this workspace.</div>';

      const agentRowsHtml = (storeData.agents && storeData.agents.length) ? storeData.agents.map(ag => {
        const isCur = (activeChatAgent === ag.id && chatTargetType === 'agent');
        const icon = ag.avatarUrl || (ag.role && ag.role.toLowerCase().includes('qa') ? '🛡' : ag.role && ag.role.toLowerCase().includes('sec') ? '🔒' : ag.role && ag.role.toLowerCase().includes('pmo') ? '📋' : ag.role && ag.role.toLowerCase().includes('eng') ? '⚡' : '🤖');
        const roleLabel = (ag.role || 'Teammate').slice(0, 16);
        return '<div class="chat-agent-item ' + (isCur ? 'active' : '') + '" onclick="switchChatAgent(\\\'' + escapeHtml(ag.id) + '\\\', \\\'' + escapeHtml(ag.name) + '\\\', \\\'' + escapeHtml(ag.role || '') + '\\\')">' +
          '<span>' + icon + '</span> <span>@' + escapeHtml(ag.name) + '</span> <small style="color:var(--text-muted); margin-left:auto; font-size:10px;">' + escapeHtml(roleLabel) + '</small>' +
        '</div>';
      }).join('') : (
        '<div style="padding:10px 8px; font-size:11px; color:#64748b; line-height:1.4;">' +
          'No teammates loaded.<br>' +
          '<button class="btn btn-sm" style="margin-top:6px; font-size:10px; background:#c4b5fd; color:#000; font-weight:700;" onclick="applyWorkforceTemplate(\\\'engineering_swarm\\\')">⚡ Load Engineering Swarm</button>' +
        '</div>'
      );

      const renderedFeed = renderWelcomeCard() + (msgs.length ? msgs.map(m => renderChatMessageCard(m)).join('') : '');

      return '<div class="chat-layout">' +
        '<!-- Left Column: Channels & teammates -->' +
        '<div class="chat-channels-pane">' +
          '<div style="font-size:10px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.08em; padding:4px 8px;">Workspace Channels</div>' +
          channelRowsHtml +

          '<div style="font-size:10px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.08em; padding:12px 8px 4px;">AI Workforce Teammates</div>' +
          agentRowsHtml +
        '</div>' +

        '<!-- Center Column -->' +
        '<div class="chat-main-pane">' +
          '<div class="chat-head-bar">' +
            '<div style="display:flex; align-items:center; gap:10px; min-width:0;">' +
              '<span style="font-weight:700; font-size:14px; color:#fff; white-space:nowrap;" id="chat-active-target-title">' + escapeHtml(activeTitle) + '</span>' +
              '<span class="badge" id="chat-active-tier-badge" style="background:rgba(196,181,253,0.1); color:#c4b5fd; font-size:10px; font-weight:600; border:1px solid rgba(196,181,253,0.25);">● ' + escapeHtml(activeTier) + '</span>' +
            '</div>' +
            '<div style="display:flex; align-items:center; gap:8px;">' +
              '<button class="btn btn-sm btn-secondary" style="font-size:11px; padding:3px 9px;" onclick="toggleChatDrawer()" id="btn-toggle-drawer" title="Toggle right panel">◨ Panel</button>' +
            '</div>' +
          '</div>' +

          '<div class="chat-feed" id="chat-feed-box">' +
            renderedFeed +
          '</div>' +

          '<!-- Ultra-Clean Composer Cockpit -->' +
          '<div class="chat-cockpit">' +
            '<div class="cockpit-box">' +
              '<textarea class="cockpit-textarea" id="cockpit-input" placeholder="Write a workspace message (Enter to send, Shift+Enter for a new line)" onkeydown="handleCockpitKeyDown(event)" oninput="updateCockpitTokenCounter(this)"></textarea>' +
              '<div class="cockpit-bottom-row">' +
                '<div class="cockpit-tools-left">' +
                  '<button type="button" class="cockpit-tool-pill connect-model-pill" onclick="switchView(\\'models\\')" title="Connect a model to enable agent replies">Connect a model</button>' +
                '</div>' +
                '<div class="cockpit-tools-right">' +
                  '<span class="cockpit-token-counter" id="cockpit-token-counter">Saved here · connect a model for replies</span>' +
                  '<button class="cockpit-send-btn" id="btn-cockpit-send" onclick="sendCockpitMessage()" title="Send (Enter)">' +
                    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>' +
                  '</button>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<!-- Right Column: Interactive Artifact & Walkthrough Drawer -->' +
        '<div class="chat-context-drawer">' +
          '<div class="drawer-tabs">' +
            '<button class="drawer-tab active" id="tab-btn-walkthrough" onclick="switchDrawerTab(\\'walkthrough\\')">📄 Walkthrough &amp; Diffs</button>' +
            '<button class="drawer-tab" id="tab-btn-telemetry" onclick="switchDrawerTab(\\'telemetry\\')">⚡ Telemetry &amp; Context</button>' +
          '</div>' +
          '<div id="drawer-tab-content-walkthrough" class="drawer-content-pane">' +
            renderDefaultWalkthroughContent() +
          '</div>' +
          '<div id="drawer-tab-content-telemetry" class="drawer-content-pane" style="display:none;">' +
            renderDefaultTelemetryContent() +
          '</div>' +
        '</div>' +
      '</div>';
    }

    async function switchChatChannel(channelId) {
      currentChannelId = channelId;
      chatTargetType = 'channel';
      loadView('messages');
    }

    async function switchChatAgent(agentId, name, role) {
      activeChatAgent = agentId;
      activeChatAgentName = name;
      activeChatAgentRole = role;
      chatTargetType = 'agent';
      loadView('messages');
    }

    function handleCockpitKeyDown(event) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendCockpitMessage();
      }
    }

    function updateCockpitTokenCounter(textarea) {
      const counter = document.getElementById('cockpit-token-counter');
      if (counter) counter.innerText = 'Saved here · agent replies need a model';
    }

    function insertCockpitPill(text) {
      const textarea = document.getElementById('cockpit-input');
      if (!textarea) return;
      textarea.value += text;
      textarea.focus();
      updateCockpitTokenCounter(textarea);
    }

    function triggerChatAction(action) {
      if (action === 'vitest') {
        showToast('Verification is unavailable until an execution backend records a real check result.');
      } else if (action === 'drift') {
        insertCockpitPill('/drift ');
        sendCockpitMessage();
      }
    }

    function handleChatAction(action, msgId, taskId) {
      if (action === 'approve') {
        approveArtifactTask(taskId || 'AF-142');
      } else if (action === 'vitest') {
        triggerChatAction('vitest');
      } else if (action === 'evidence' || action === 'walkthrough') {
        openArtifactDrawer(taskId || 'AF-142');
      }
    }

    async function applyWorkforceTemplate(templateId) {
      showToast('Workforce templates are unavailable until every route and tool claim can be verified.');
    }

    function promptWorkforceTemplate() {
      const choice = confirm('Load Recommended Engineering Swarm template? (Orchestrator, PMO, DevLead, QA-Release, Security)');
      if (choice) applyWorkforceTemplate('engineering_swarm');
    }

    function toggleChatDrawer() {
      const layout = document.querySelector('.chat-layout');
      if (layout) {
        layout.classList.toggle('drawer-collapsed');
        const isCollapsed = layout.classList.contains('drawer-collapsed');
        const btn = document.getElementById('btn-toggle-drawer');
        if (btn) btn.innerText = isCollapsed ? '◧ Panel' : '◨ Panel';
      }
    }

    async function selectChatChoice(_choiceId, choiceTitle) {
      const textarea = document.getElementById('cockpit-input');
      if (!textarea) return;
      textarea.value = choiceTitle;
      await sendCockpitMessage();
    }

    async function selectChatAction(_actionId, label) {
      showToast('This action needs a configured model route and execution backend. No work was started.');
      const textarea = document.getElementById('cockpit-input');
      if (!textarea) return;
      textarea.value = label;
      await sendCockpitMessage();
    }

    function renderDefaultWalkthroughContent() {
      return '<div class="item-card"><div class="card-title">No task walkthrough selected</div><p>Walkthroughs appear only after an executor records an evidence pack. AgentForge will not show an example diff or a passing result in its place.</p></div>';
    }

    function renderDefaultTelemetryContent() {
      return '<div class="item-card"><div class="card-title">Execution context unavailable</div><p>No backend is connected to report a model route, sandbox, task memory, or measured drift data.</p><button class="btn btn-sm" onclick="switchView(\\'harnesses\\')">Open execution readiness</button></div>';
    }

    async function openArtifactDrawer(taskId) {
      switchDrawerTab('walkthrough');
      try {
        const res = await fetch('/api/tasks/' + encodeURIComponent(taskId) + '/walkthrough');
        if (res.ok) {
          const data = await res.json();
          renderWalkthroughData(data);
          return;
        }
      } catch {}
      const pane = document.getElementById('drawer-tab-content-walkthrough');
      if (pane) pane.innerHTML = '<div class="item-card"><div class="card-title">Walkthrough unavailable</div><p>No verified evidence pack exists for this task.</p></div>';
    }

    function renderWalkthroughData(data) {
      const pane=document.getElementById('drawer-tab-content-walkthrough');if(!pane)return;pane.replaceChildren();
      const title=document.createElement('h3');title.textContent=data.title||data.taskId;
      const status=document.createElement('p');status.textContent=data.verified?'Evidence pack marked verified by the executor.':'Evidence pack has not been verified.';
      const state=document.createElement('p');state.textContent='Recorded task status: '+String(data.status||'unknown').replaceAll('_',' ');
      const changes=document.createElement('pre');changes.textContent=JSON.stringify(data.filesChanged||[],null,2);
      const review=document.createElement('button');review.className='btn btn-secondary';review.textContent='Open approvals';review.onclick=()=>switchView('approvals');
      pane.append(title,status,state,changes,review);
    }

    function approveArtifactTask(_taskId) {
      switchView('approvals');
    }
    function showToast(message) {
      const existing = document.querySelector('.toast-notification');
      if (existing) existing.remove();
      const toast = document.createElement('div');
      toast.className = 'toast-notification';
      toast.innerText = message;
      document.body.appendChild(toast);
      setTimeout(() => { if (toast.parentNode) toast.remove(); }, 3500);
    }

    async function runAutopilotSetup() {
      showToast('Automatic setup is unavailable. Configure and verify every integration explicitly.');
    }

    async function applyPreset() {
      showToast('Workforce presets are unavailable until their model routes and tool permissions can be verified.');
    }

    async function testOllamaFromSettings() {
      showToast('Local model testing is unavailable from Settings until a reviewed connection provider is installed.');
    }

    async function saveAdvancedSettings() {
      showToast('Provider credentials cannot be stored in workspace settings.');
    }

    function saveAllSettings() {
      void runAutopilotSetup();
    }

    function handleComposerModelChange() {
      showToast('No model route is connected to this workspace.');
    }

    function renderSettingsWorkspace() {
      return '<main class="forge-room settings-container">' +
        '<header class="forge-header"><div><div class="forge-topline">AgentForge / Management</div><h1>Connections and safeguards</h1><p>Configure only a real, reviewable integration. This local workspace has no model route, external channel, or execution backend connected.</p></div></header>' +
        '<section class="forge-grid">' +
          '<article class="forge-panel"><div class="forge-panel-head"><h2>Model route</h2><span class="badge badge-amber">NOT CONFIGURED</span></div><p class="runtime-copy">No model can receive workspace messages or execute tasks until it is explicitly configured and passes its readiness checks.</p><div class="forge-foot"><span>Provider-neutral routing</span><button onclick="switchView(\\'models\\')">Review model readiness →</button></div></article>' +
          '<article class="forge-panel"><div class="forge-panel-head"><h2>Execution backend</h2><span class="badge badge-amber">OFFLINE</span></div><p class="runtime-copy">Tasks require an approved plan, isolated compute, real verification, and an evidence pack. The workspace will reject execution while any gate is missing.</p><div class="forge-foot"><span>Fail-closed by design</span><button onclick="switchView(\\'harnesses\\')">Review execution gates →</button></div></article>' +
          '<article class="forge-panel"><div class="forge-panel-head"><h2>External channels</h2><span class="badge badge-muted">OPTIONAL</span></div><p class="runtime-copy">AgentForge owns the Telegram connection. The normal setup uses a BotFather token; an MTProto user session is available for advanced deployments. Discord and Slack remain separately authorized providers.</p><div id="native-telegram-status" class="form-hint">Checking Telegram transport…</div><details style="margin-top:1rem"><summary>Configure a BotFather Telegram token</summary><p class="form-hint">Provide the token through the private runtime environment or an external token file. AgentForge never stores it in workspace records.</p><code>AGENTFORGE_TELEGRAM_BOT_TOKEN<br>AGENTFORGE_TELEGRAM_BOT_TOKEN_FILE</code></details><details style="margin-top:1rem"><summary>Configure an advanced MTProto session</summary><p class="form-hint">Provide an already-authorized user session at runtime. AgentForge never stores the API hash or session in workspace records.</p><code>AGENTFORGE_TELEGRAM_API_ID<br>AGENTFORGE_TELEGRAM_API_HASH<br>AGENTFORGE_TELEGRAM_SESSION</code></details><details style="margin-top:1rem"><summary>Configure standalone Discord</summary><p class="form-hint">Provide the Discord bot token through private runtime configuration. AgentForge owns its Gateway v10 session and never stores the token in workspace records.</p><code>AGENTFORGE_DISCORD_BOT_TOKEN<br>AGENTFORGE_DISCORD_BOT_TOKEN_FILE</code></details><details style="margin-top:1rem"><summary>Configure Slack Socket Mode</summary><p class="form-hint">Provide the Slack app and bot tokens through private runtime configuration. AgentForge owns the Socket Mode session and never stores tokens in workspace records.</p><code>AGENTFORGE_SLACK_APP_TOKEN<br>AGENTFORGE_SLACK_APP_TOKEN_FILE<br>AGENTFORGE_SLACK_BOT_TOKEN<br>AGENTFORGE_SLACK_BOT_TOKEN_FILE</code></details><details style="margin-top:1rem"><summary>Complete a provider callback</summary><p class="form-hint">Paste the callback result from a provider. Raw credentials are never stored here.</p><label>Provider<select id="callback-provider"><option value="telegram">Telegram</option><option value="discord">Discord</option><option value="slack">Slack</option></select></label><label>Connection ID<input id="callback-connection-id" autocomplete="off"></label><label>External workspace ID<input id="callback-workspace-id" autocomplete="off"></label><label>Secret reference<input id="callback-secret-reference" autocomplete="off"></label><label><input id="callback-approved" type="checkbox"> I approve enabling this connection</label><button class="btn btn-sm" onclick="completeProviderCallback()">Save callback</button><div id="callback-result" role="status" style="margin-top:0.75rem"></div></details></article>' +
          '<article class="forge-panel"><div class="forge-panel-head"><h2>Local workspace storage</h2><span class="badge badge-blue">LOCAL JSON</span></div><p class="runtime-copy">Saved workspace records persist locally with backup recovery. This is a single-process staging store, not a claim of encrypted or multi-user production storage.</p><div class="forge-foot"><span>Review the audit before release</span><button onclick="switchView(\\'activity\\')">Open audit ledger →</button></div></article>' +
        '</section>' +
        '<section class="forge-panel" style="margin-top:16px"><div class="forge-panel-head"><h2>What becomes available after configuration</h2><span>NO AUTOMATIC SETUP</span></div><div class="forge-event-list"><div class="forge-event"><span class="forge-task-pin"></span><div class="forge-event-copy"><strong>Connect a model route</strong><span>Enables reviewed response generation only after provider readiness is proven.</span></div></div><div class="forge-event"><span class="forge-task-pin"></span><div class="forge-event-copy"><strong>Connect an execution backend</strong><span>Enables governed tasks only when isolation, verification, and evidence gates are present.</span></div></div><div class="forge-event"><span class="forge-task-pin"></span><div class="forge-event-copy"><strong>Connect a channel</strong><span>Enables a separately authorized transport for the same workspace records.</span></div></div></div></section>' +
      '</main>';
    }

    function exportChatTranscript() {
      fetch('/api/messages?channelId=' + currentChannelId)
        .then(r => r.json())
        .then(msgs => {
          const jsonl = msgs.map(m => JSON.stringify(m)).join(String.fromCharCode(10));
          const blob = new Blob([jsonl], { type: 'application/x-jsonlines' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'chat-transcript-' + currentChannelId + '.jsonl';
          a.click();
        });
    }

    async function sendCockpitMessage() {
      const textarea = document.getElementById('cockpit-input');
      if (!textarea) return;
      const text = textarea.value.trim();
      if (!text) return;
      textarea.value = '';
      updateCockpitTokenCounter(textarea);

      const userMsgRes = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: currentChannelId,
          content: text,
          authorId: 'user-owner',
          authorType: 'user',
          externalProvider: 'web'
        })
      });
      const userMsg = await userMsgRes.json();

      const feed = document.getElementById('chat-feed-box');
      if (feed) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = renderChatMessageCard(userMsg);
        if (tempDiv.firstElementChild) feed.appendChild(tempDiv.firstElementChild);

        feed.scrollTop = feed.scrollHeight;
      }

      await generateAutonomousAgentResponse(text);
    }

    async function generateAutonomousAgentResponse() {
      // A local message is saved by sendCockpitMessage. Until a real
      // conversational adapter is connected, do not infer intent or fabricate
      // a plan, tool result, workspace context, or agent response.
      const feed = document.getElementById('chat-feed-box');
      let blocks = 'A conversational orchestration adapter has not been connected to this workspace.';
      try {
        const harnessResponse = await fetch('/api/harnesses');
        const harness = await harnessResponse.json();
        if (!harness.runtime.canExecuteTasks) {
          blocks = (harness.runtime.readiness?.blockers || []).join(' ') || blocks;
        }
      } catch {
        blocks = 'Execution readiness could not be loaded. No work was started.';
      }
      const offlineMessage = {
        id: 'msg-' + Math.random().toString(36).slice(2, 9),
        channelId: currentChannelId,
        authorId: 'agentforge-system',
        authorType: 'system',
        content: 'AgentForge saved your message locally. It has not generated a model response or started work. ' + blocks + ' Open Harnesses to review the exact readiness gates.',
        createdAt: new Date().toISOString()
      };
      if (feed) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = renderChatMessageCard(offlineMessage);
        if (tempDiv.firstElementChild) feed.appendChild(tempDiv.firstElementChild);
        feed.scrollTop = feed.scrollHeight;
      }
    }

    function renderAgentCard(a, processNames = []) {
      return '<div class="item-card">' +
        '<div style="display:flex; justify-content:space-between; align-items:center;">' +
          '<b>' + escapeHtml(a.name) + '</b><span class="badge badge-green">' + escapeHtml(a.status) + '</span>' +
        '</div>' +
        '<div style="font-size:0.75rem; color:var(--text-muted);">' + escapeHtml(a.role) + '</div>' +
        '<div style="font-size:0.8rem;">' + escapeHtml(a.description) + '</div>' +
        '<div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.4rem;">Operating procedure: <b>' + escapeHtml(processNames.length ? processNames.join(', ') : 'None assigned') + '</b></div>' +
        '<div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.5rem;">Harness: <b>' + escapeHtml(a.harnessPolicy.preferredHarnessId) + '</b> | Tier: <b>Tier ' + escapeHtml(a.modelPolicy.preferredTier) + '</b></div>' +
      '</div>';
    }

    function renderTaskCard(t, agents = []) {
      const assignedAgent = agents.find(agent => agent.id === t.assignedAgentId);
      return '<div class="item-card">' +
        '<div style="display:flex; justify-content:space-between; align-items:center;">' +
          '<b>[' + escapeHtml(t.id) + '] ' + escapeHtml(t.title) + '</b><span class="badge badge-blue">' + escapeHtml(t.status) + '</span>' +
        '</div>' +
        '<div style="font-size:0.8rem;">' + escapeHtml(t.description) + '</div>' +
        '<div style="font-size:0.75rem; color:var(--text-muted);">Assigned: <b>' + escapeHtml(assignedAgent?.name || 'Unassigned') + '</b> | Priority: ' + escapeHtml(t.priority) + '</div>' +
      '</div>';
    }

    function renderApprovalCard(ap) {
      return '<div class="item-card">' +
        '<div style="display:flex; justify-content:space-between; align-items:center;">' +
          '<b>Task ' + escapeHtml(ap.taskId) + '</b><span class="badge badge-amber">' + escapeHtml(ap.risk.toUpperCase()) + ' RISK</span>' +
        '</div>' +
        '<div style="font-size:0.85rem; font-weight:600;">' + escapeHtml(ap.action) + '</div>' +
        '<div style="font-size:0.8rem; color:var(--text-muted);">Unverified description: ' + escapeHtml(ap.description) + '</div>' +
        (ap.evidenceSummary ? '<div style="font-size:0.75rem; background:var(--bg-base); padding:0.4rem; border-radius:4px;">Unverified evidence summary · ' + escapeHtml(ap.evidenceSummary.filesCount) + ' files listed</div>' : '') +
        (ap.status === 'pending' ? '<div style="display:flex; gap:0.5rem; margin-top:0.5rem;"><button class="btn btn-sm" onclick="resolveApproval(' + safeJsString(ap.id) + ', \\'approved\\')">Approve</button><button class="btn btn-sm btn-danger" onclick="resolveApproval(' + safeJsString(ap.id) + ', \\'rejected\\')">Reject</button></div>' : '<div class="badge badge-green">Resolved: ' + escapeHtml(ap.status) + ' by ' + escapeHtml(ap.approverUserId) + '</div>') +
      '</div>';
    }

    function renderProcessCard(p) {
      const processId = safeJsString(p.id);
      const rawContent = escapeHtml(p.rawContent || '');
      const domId = escapeHtml(p.id);
      return '<div class="item-card">' +
        '<div style="display:flex; justify-content:space-between; align-items:center;">' +
          '<b>' + escapeHtml(p.title) + '</b><span id="process-version-' + domId + '" class="badge badge-blue">v' + escapeHtml(p.version) + '</span>' +
        '</div>' +
        '<div style="font-size:0.8rem; color:var(--text-muted);">Source: ' + escapeHtml(p.sourceType) + ' | ' + escapeHtml(p.steps.length) + ' Steps</div>' +
        '<div id="process-rules-' + domId + '" style="font-size:0.75rem; color:' + (p.unresolvedRules.some(rule => !rule.resolved) ? 'var(--amber)' : 'var(--text-muted)') + ';">' + (p.unresolvedRules.some(rule => !rule.resolved) ? '⚠ ' + escapeHtml(p.unresolvedRules.filter(rule => !rule.resolved).length) + ' Unresolved Business Rules (SOP is not authority)' : 'No open questions flagged · Review still required before use') + '</div>' +
        (p.unresolvedRules.some(rule => !rule.resolved) ? '<ul style="font-size:0.75rem;color:var(--amber);">' + p.unresolvedRules.filter(rule => !rule.resolved).map(rule => '<li>' + escapeHtml(rule.question) + '</li>').join('') + '</ul>' : '') +
        '<details style="margin-top:0.75rem;"><summary>Prepare and review a new SOP version</summary>' +
          '<p style="font-size:0.8rem;color:var(--text-muted);">Submitting creates a durable revision proposal. The current SOP stays active until someone approves it. Approval saves the prior version and activates the proposal; no SOP execution or agent update happens automatically.</p>' +
          '<textarea id="process-source-' + domId + '" class="form-control" rows="8">' + rawContent + '</textarea>' +
          '<button class="btn" style="margin-top:0.5rem;" onclick="saveProcessRevision(' + processId + ')">Save as new version</button>' +
          '<div id="process-revision-result-' + domId + '" style="margin-top:0.5rem;"></div>' +
        '</details>' +
        '<button class="btn btn-sm" style="margin-top:0.5rem;" onclick="showProcessHistory(' + processId + ')">Show version history</button>' +
        '<div id="process-history-' + domId + '" style="margin-top:0.5rem;"></div>' +
      '</div>';
    }

    function renderProcessDiff(diff) {
      const rows = [];
      for (const item of diff.modifiedSteps || []) {
        const before = item.changes.instruction?.previous;
        const after = item.changes.instruction?.updated;
        rows.push('<li>Edited ' + escapeHtml(item.stepId) + (before !== undefined ? ': “' + escapeHtml(before) + '” → “' + escapeHtml(after) + '”' : ' (other fields changed)') + '</li>');
      }
      for (const item of diff.addedSteps || []) rows.push('<li>Added: ' + escapeHtml(item.instruction) + '</li>');
      for (const stepId of diff.deletedStepIds || []) rows.push('<li>Removed: ' + escapeHtml(stepId) + '</li>');
      for (const rule of diff.newUnresolvedRules || []) rows.push('<li>New review blocker: ' + escapeHtml(rule.question) + '</li>');
      return '<div class="item-card"><b>Version ' + escapeHtml(diff.previousVersion) + ' → ' + escapeHtml(diff.newVersion) + '</b><ul>' + (rows.length ? rows.join('') : '<li>No step changes detected.</li>') + '</ul></div>';
    }

    async function saveProcessRevision(processId) {
      const domId = String(processId).replace(/[^A-Za-z0-9._:-]/g, '');
      const result = document.getElementById('process-revision-result-' + domId);
      const process = (await (await fetch('/api/processes')).json()).find(item => item.id === processId);
      const rawContent = document.getElementById('process-source-' + domId)?.value;
      if (!process || !rawContent) {
        result.innerHTML = '<div class="badge badge-amber">Enter the revised SOP text first.</div>';
        return;
      }
      const response = await fetch('/api/processes/' + encodeURIComponent(processId) + '/revisions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedVersion: process.version, rawContent }),
      });
      const data = await response.json();
      if (!response.ok) {
        result.innerHTML = '<div class="badge badge-red">' + escapeHtml(data.error || 'Could not save this version.') + '</div>';
        return;
      }
      result.innerHTML = renderProcessDiff(data.diff) + '<div class="badge badge-amber">Revision proposed for review. The active version remains v' + escapeHtml(data.currentProcess.version) + ' until a reviewer approves it.</div>' +
        '<div style="display:flex;gap:0.5rem;margin-top:0.5rem;"><button class="btn btn-sm" onclick="resolveProcessRevisionProposal(' + safeJsString(processId) + ', ' + safeJsString(data.proposal.id) + ', \\'approved\\')">Approve and activate</button><button class="btn btn-sm btn-danger" onclick="resolveProcessRevisionProposal(' + safeJsString(processId) + ', ' + safeJsString(data.proposal.id) + ', \\'rejected\\')">Reject</button></div>';
      await showProcessHistory(processId);
      updateNavCounts();
    }

    async function showProcessHistory(processId) {
      const domId = String(processId).replace(/[^A-Za-z0-9._:-]/g, '');
      const target = document.getElementById('process-history-' + domId);
      const response = await fetch('/api/processes/' + encodeURIComponent(processId) + '/revisions');
      const data = await response.json();
      if (!response.ok) {
        target.innerHTML = '<div class="badge badge-red">' + escapeHtml(data.error || 'Version history unavailable.') + '</div>';
        return;
      }
      const proposals = data.proposals || [];
      target.innerHTML = '<div class="item-card"><b>Current version: ' + escapeHtml(data.current.version) + '</b><div style="margin-top:0.5rem;">Previous versions: ' + (data.revisions.length ? data.revisions.map(item => '<span style="display:inline-flex;align-items:center;gap:0.3rem;margin:0.2rem;"><span class="badge badge-blue">v' + escapeHtml(item.version) + '</span><button class="btn btn-sm" onclick="rollbackProcessRevision(' + safeJsString(processId) + ', ' + Number(item.version) + ')">Restore as new version</button></span>').join(' ') : 'none') + '</div>' +
        '<div style="margin-top:0.75rem;"><b>Revision proposals</b>' + (proposals.length ? proposals.map(item => '<div style="margin-top:0.35rem;padding:0.5rem;border:1px solid var(--border);border-radius:6px;">' + renderProcessDiff(item.diff) + '<div class="badge ' + (item.status === 'pending' ? 'badge-amber' : item.status === 'approved' ? 'badge-green' : 'badge-red') + '">' + escapeHtml(item.status.toUpperCase()) + ' · base v' + escapeHtml(item.expectedVersion) + '</div>' + (item.status === 'pending' ? '<div style="display:flex;gap:0.5rem;margin-top:0.4rem;"><button class="btn btn-sm" onclick="resolveProcessRevisionProposal(' + safeJsString(processId) + ', ' + safeJsString(item.id) + ', \\'approved\\')">Approve and activate</button><button class="btn btn-sm btn-danger" onclick="resolveProcessRevisionProposal(' + safeJsString(processId) + ', ' + safeJsString(item.id) + ', \\'rejected\\')">Reject</button></div>' : '') + '</div>').join('') : ' none') + '</div></div>';
    }

    async function resolveProcessRevisionProposal(processId, proposalId, status) {
      const response = await fetch('/api/processes/' + encodeURIComponent(processId) + '/revisions/' + encodeURIComponent(proposalId) + '/resolve', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      const domId = String(processId).replace(/[^A-Za-z0-9._:-]/g, '');
      const result = document.getElementById('process-revision-result-' + domId);
      if (!response.ok) {
        if (result) result.innerHTML = '<div class="badge badge-red">' + escapeHtml(data.error || 'Could not resolve the proposal.') + '</div>';
        await showProcessHistory(processId);
        return;
      }
      if (result) result.innerHTML = '<div class="badge ' + (status === 'approved' ? 'badge-green' : 'badge-amber') + '">Revision ' + escapeHtml(status) + (data.process ? '; active version is now v' + escapeHtml(data.process.version) : '; active version was not changed') + '.</div>';
      await showProcessHistory(processId);
      if (status === 'approved') switchView('processes');
    }

    async function rollbackProcessRevision(processId, targetVersion) {
      const domId = String(processId).replace(/[^A-Za-z0-9._:-]/g, '');
      const result = document.getElementById('process-revision-result-' + domId);
      const current = (await (await fetch('/api/processes')).json()).find(item => item.id === processId);
      if (!current) {
        result.innerHTML = '<div class="badge badge-red">Process is no longer available.</div>';
        return;
      }
      const response = await fetch('/api/processes/' + encodeURIComponent(processId) + '/rollback', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedVersion: current.version, targetVersion }),
      });
      const data = await response.json();
      if (!response.ok) {
        result.innerHTML = '<div class="badge badge-red">' + escapeHtml(data.error || 'Could not restore that version.') + '</div>';
        return;
      }
      result.innerHTML = renderProcessDiff(data.diff) + '<div class="badge badge-amber">Restored v' + escapeHtml(data.restoredFromVersion) + ' as new version v' + escapeHtml(data.process.version) + '. The previous version remains in history.</div>';
      document.getElementById('process-version-' + domId).innerText = 'v' + data.process.version;
      const rules = document.getElementById('process-rules-' + domId);
      rules.innerText = data.process.unresolvedRules.filter(rule => !rule.resolved).length
        ? '⚠ ' + data.process.unresolvedRules.filter(rule => !rule.resolved).length + ' Unresolved Business Rules (SOP is not authority)'
        : 'No open questions flagged · Review still required before use';
      rules.style.color = data.process.unresolvedRules.filter(rule => !rule.resolved).length ? 'var(--amber)' : 'var(--text-muted)';
      document.getElementById('process-source-' + domId).value = data.process.rawContent || '';
      await showProcessHistory(processId);
    }

    function renderCallCard(c) {
      return '<div class="item-card">' +
        '<div style="display:flex; justify-content:space-between; align-items:center;">' +
          '<b>Call [' + escapeHtml(c.id) + ']</b><span class="badge badge-blue">' + escapeHtml(c.status) + '</span>' +
        '</div>' +
        '<div style="font-size:0.8rem;">' + escapeHtml(c.outcome?.summary || 'Call simulation in progress...') + '</div>' +
        '<div style="font-size:0.75rem; color:var(--text-muted);">Simulated duration: ' + escapeHtml(c.usage?.durationSeconds || 0) + 's | Simulated cost: $' + escapeHtml((c.usage?.totalCostUsd || 0).toFixed(3)) + '</div>' +
      '</div>';
    }

    function renderPackageCard(pkg) {
      return '<div class="item-card">' +
        '<div style="display:flex; justify-content:space-between; align-items:center;">' +
          '<b>' + escapeHtml(pkg.name) + '</b><span class="badge badge-blue">v' + escapeHtml(pkg.version) + '</span>' +
        '</div>' +
        '<div style="font-size:0.8rem; color:var(--text-muted);">' + escapeHtml(pkg.description) + '</div>' +
        '<div style="font-size:0.75rem; color:var(--text-muted);">Manifest publisher: ' + escapeHtml(pkg.publisher.name) + ' | License field: ' + escapeHtml(pkg.license) + ' (not independently verified)</div>' +
        '<button class="btn btn-sm" style="margin-top:0.5rem;" onclick="installPackage(' + safeJsString(pkg.name) + ')">Install Package</button>' +
      '</div>';
    }

    function renderAuditRow(a) {
      return '<div style="font-size:0.75rem; padding:0.4rem 0; border-bottom:1px solid var(--border); display:flex; justify-content:space-between;">' +
        '<span>[' + escapeHtml(a.origin.toUpperCase()) + '] <b>' + escapeHtml(a.action) + '</b> by ' + escapeHtml(a.actorId) + '</span>' +
        '<span style="color:var(--text-muted);">' + new Date(a.timestamp).toLocaleTimeString() + '</span>' +
      '</div>';
    }

    async function resolveApproval(id, status) {
      await fetch('/api/approvals/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvalId: id, status }),
      });
      loadView('approvals');
    }

    async function simulateScribeImport() {
      const sop = '# Lead Underwriting SOP\\n1. Check tax assessor portal\\n2. Calculate estimated equity?\\n3. Move lead to Ready for Offer in CRM';
      await fetch('/api/processes/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawContent: sop, sourceType: 'scribe' }),
      });
      loadView('processes');
    }

    async function simulateVoiceCall() {
      await fetch('/api/calls/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: 'agent-reviewer', phoneNumber: '+15550192834' }),
      });
      loadView('voice');
    }

    async function installPackage(name) {
      let response = await fetch('/api/packages/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageName: name }),
      });
      let result = await response.json();
      if (response.status === 409 && result.requiresPermissionApproval) {
        const permissionSummary = JSON.stringify(result.requestedPermissions, null, 2);
        if (!window.confirm('Review the permissions requested by ' + name + ':\\n\\n' + permissionSummary + '\\n\\nApprove these permissions for the local installation? Package code will not run in this build.')) return;
        response = await fetch('/api/packages/install', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ packageName: name, approvedPermissions: result.requestedPermissions }),
        });
        result = await response.json();
      }
      if (!response.ok) {
        alert('Package was not installed: ' + (result.error || 'request failed'));
        return;
      }
      alert('Local installation record created for ' + name + '. Package code is not executed by this build.');
      loadView('marketplace');
    }

    async function createTelegramLinkCode() {
      const resultElement = document.getElementById('telegram-link-result');
      resultElement.innerText = 'Creating one-time code…';
      const response = await fetch('/api/telegram/link-code', { method: 'POST' });
      const result = await response.json();
      if (!response.ok) {
        resultElement.innerText = result.error || 'Could not create a Telegram link code.';
        return;
      }
      resultElement.innerHTML = '<div><b>One-time code:</b> <code>' + escapeHtml(result.code) + '</code></div><div>Expires: ' + escapeHtml(new Date(result.expiresAt).toLocaleTimeString()) + '</div><div>Send <code>/link ' + escapeHtml(result.code) + '</code> from your authorized Telegram session in a private chat.</div>';
    }

    async function createWorkspaceSetup() {
      const resultElement = document.getElementById('workspace-create-result');
      const workspaceName = document.getElementById('project-workspace-name').value.trim();
      const spaceName = document.getElementById('project-space-name').value.trim();
      const channelName = document.getElementById('project-channel-name').value.trim();
      if (!workspaceName || !spaceName || !channelName) {
        resultElement.innerText = 'Enter a workspace, space, and channel name to continue.';
        return;
      }
      resultElement.innerText = 'Creating workspace…';
      const post = async (url, body) => {
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Request failed.');
        return result;
      };
      try {
        const workspace = await post('/api/workspaces', { name: workspaceName.trim() });
        const space = await post('/api/spaces', { workspaceId: workspace.id, name: spaceName.trim(), provider: 'agentforge' });
        await post('/api/channels', { workspaceId: workspace.id, spaceId: space.id, name: channelName.trim(), provider: 'agentforge', visibility: 'public' });
        loadView('projects');
      } catch (error) {
        resultElement.innerText = error instanceof Error ? error.message : 'Workspace setup failed.';
      }
    }

    function loadMemoryNamespace() {
      const value = document.getElementById('memory-namespace').value.trim();
      currentMemoryNamespace = value || 'general';
      loadView('memory');
    }

    async function createMemoryRecord() {
      const resultElement = document.getElementById('memory-save-result');
      const namespace = document.getElementById('memory-namespace').value.trim() || 'general';
      const response = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          namespace,
          category: document.getElementById('memory-category').value,
          title: document.getElementById('memory-title').value,
          content: document.getElementById('memory-content').value,
          tags: document.getElementById('memory-tags').value.split(',').map(tag => tag.trim()).filter(Boolean),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        resultElement.innerText = result.error || 'Memory record was not saved.';
        return;
      }
      currentMemoryNamespace = namespace;
      loadView('memory');
    }

    function openModal(id) {
      let modal = document.getElementById(id);
      if (!(modal instanceof HTMLDialogElement)) {
        const dialog = document.createElement('dialog');
        dialog.id = id;
        dialog.className = modal.className;
        while (modal.firstChild) dialog.append(modal.firstChild);
        modal.replaceWith(dialog);
        modal = dialog;
        const title = modal.querySelector('.modal-title');
        if (title) { title.id = id + '-title'; modal.setAttribute('aria-labelledby', title.id); }
        modal.querySelectorAll('.form-group').forEach(group => {
          const label = group.querySelector('label'), control = group.querySelector('input, select, textarea');
          if (label && control) label.htmlFor = control.id;
        });
      }
      if (!modal.open) modal.showModal();
    }
    function closeModal(id) {
      const modal = document.getElementById(id);
      if (modal instanceof HTMLDialogElement) modal.close();
    }

    function openProcessImportModal() {
      document.getElementById('process-import-result').innerText = '';
      openModal('process-import-modal');
    }

    async function submitProcessImport() {
      const result = document.getElementById('process-import-result');
      const rawContent = document.getElementById('process-import-content').value.trim();
      if (!rawContent) {
        result.innerText = 'Paste the procedure text first.';
        return;
      }
      try {
        const response = await fetch('/api/processes/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rawContent, sourceType: 'manual' }),
        });
        const payload = await response.json();
        if (!response.ok) {
          result.innerText = payload.error || 'Procedure could not be imported.';
          return;
        }
        document.getElementById('process-import-content').value = '';
        closeModal('process-import-modal');
        await loadView('processes');
      } catch {
        result.innerText = 'Procedure could not be imported because the local service did not respond.';
      }
    }

    const taskDraftFields=['task-title','task-description','task-priority','task-project','task-agent','task-base-branch','task-base-sha','task-allowed-paths','task-protected-paths','task-test-command','task-build-command'];
    function saveTaskDraft(){
      try{const values={};for(const id of taskDraftFields)values[id]=document.getElementById(id).value;sessionStorage.setItem('agentforge-task-draft',JSON.stringify(values));}catch{}
    }
    async function openTaskModal(projectId) {
      const projects=document.getElementById('task-project'),selector=document.getElementById('task-agent'),result=document.getElementById('task-result');
      projects.replaceChildren(new Option('No project',''));selector.replaceChildren(new Option('Unassigned',''));result.innerText='Loading projects and teammates…';
      const outcomes=await Promise.allSettled([conversationRequest('/api/projects'),conversationRequest('/api/agents')]);
      const warnings=[];
      if(outcomes[0].status==='fulfilled'){
        for(const project of outcomes[0].value.filter(p=>!p.archived))projects.append(new Option(project.name,project.id));
        projects.value=typeof projectId==='string'?projectId:'';
        if(typeof projectId==='string'&&projectId&&!projects.value)warnings.push('This project is no longer available. Choose another project or save without one.');
      }else{
        warnings.push('Projects could not be loaded. Close and retry to link this task to a project.');
      }
      if(outcomes[1].status==='fulfilled'){
        for(const agent of outcomes[1].value)selector.append(new Option(agent.name+' · '+agent.role,agent.id));
      }else warnings.push('Teammates could not be loaded. This task can only be saved unassigned.');
      try{
        const draft=JSON.parse(sessionStorage.getItem('agentforge-task-draft')||'null');
        if(draft&&typeof draft==='object'){
          for(const id of taskDraftFields){
            const value=draft[id],field=document.getElementById(id);if(typeof value!=='string')continue;
            if(id==='task-project'&&typeof projectId==='string'&&projectId)continue;
            if(field.tagName==='SELECT'&&!Array.from(field.options).some(option=>option.value===value)){
              if(value)warnings.push(id==='task-agent'?'The draft teammate is unavailable. Choose another before saving.':'The draft project is unavailable. Choose another before saving.');continue;
            }
            field.value=value;
          }
          warnings.push('Unsent task draft restored in this browser tab.');
          if(draft['task-base-branch']||draft['task-base-sha']||draft['task-test-command'])document.querySelector('.task-boundary-editor').open=true;
        }
      }catch{}
      result.innerText=warnings.join(' ');openModal('task-modal');
      const modal=document.getElementById('task-modal');modal.oninput=saveTaskDraft;modal.onchange=saveTaskDraft;
    }
    let taskCreatePending=false;
    async function submitCreateTask() {
      if(taskCreatePending)return;
      const result = document.getElementById('task-result');
      const title = document.getElementById('task-title').value.trim();
      if (!title) {
        result.innerText = 'Enter a task name.';
        return;
      }
      const body = {
        title,
        description: document.getElementById('task-description').value,
        priority: document.getElementById('task-priority').value,
        status: 'ready',
      };
      const branch=document.getElementById('task-base-branch').value.trim(),sha=document.getElementById('task-base-sha').value.trim();
      const paths=document.getElementById('task-allowed-paths').value.split(/\\r?\\n/).map(value=>value.trim()).filter(Boolean);
      const testCommand=document.getElementById('task-test-command').value.trim(),buildCommand=document.getElementById('task-build-command').value.trim();
      if(branch||sha||paths.length||testCommand||buildCommand){
        if(!branch||!/^([a-fA-F0-9]{40}|[a-fA-F0-9]{64})$/.test(sha)||!paths.length||!testCommand){result.innerText='To prepare execution, supply a branch, full commit SHA, at least one allowed path, and a test command. Clear these fields to save an organizational task.';return;}
        const id='task-'+crypto.randomUUID();body.id=id;
        body.contract={id:'contract-'+id,taskId:id,version:1,repository:{baseBranch:branch,baseSha:sha},workspace:{requireIsolatedWorktree:true},scope:{allowedPaths:paths,protectedPaths:document.getElementById('task-protected-paths').value.split(/\\r?\\n/).map(value=>value.trim()).filter(Boolean)},authority:{externalMessage:false,productionWrite:false,deployment:false,forcePush:false,deleteFiles:false,networkOutbound:false},requiredChecks:[{type:'unit_tests',required:true,command:testCommand},...(buildCommand?[{type:'build',required:true,command:buildCommand}]:[])],completion:{requireEvidencePack:true,requireHumanApproval:true},createdAt:new Date().toISOString()};
      }
      const assignedAgentId = document.getElementById('task-agent').value;
      const projectId=document.getElementById('task-project').value;
      if(projectId)body.projectId=projectId;
      if (assignedAgentId) body.assignedAgentId = assignedAgentId;
      taskCreatePending=true;
      try {
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const payload = await response.json();
        if (!response.ok) {
          result.innerText = payload.error || 'Task could not be saved.';
          return;
        }
        document.getElementById('task-title').value = '';
        document.getElementById('task-description').value = '';
        for(const field of ['task-base-branch','task-base-sha','task-allowed-paths','task-test-command','task-build-command'])document.getElementById(field).value='';
        document.getElementById('task-protected-paths').value='.env\\n.env.*\\n.git/**';
        document.querySelector('.task-boundary-editor').open=false;
        try{sessionStorage.removeItem('agentforge-task-draft');}catch{}
        closeModal('task-modal');
        if(currentView==='projects')await showProjects();else await loadView('tasks');
      } catch {
        result.innerText = 'Task could not be saved because the local service did not respond.';
      } finally {
        taskCreatePending=false;
      }
    }

    async function createCompletionGoal() {
      const input = document.getElementById('completion-goal-input');
      const feedback = document.getElementById('completion-goal-feedback');
      const rawGoalText = input?.value?.trim();
      if (!rawGoalText) return;
      const submit = input.closest('form').querySelector('button[type=submit]');
      if (submit.disabled) return;
      submit.disabled = true;
      feedback.textContent = 'Saving the goal and preparing its requirement plan…';
      try {
        const response = await fetch('/api/completion/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rawGoalText }),
        });
        const result = await response.json();
        if (!response.ok) {
          feedback.textContent = result.error || 'The goal could not be saved.';
          return;
        }
        if (currentView === 'goals') await loadView('goals');
      } catch {
        feedback.textContent = 'The goal could not be saved because the local service did not respond.';
      } finally {
        submit.disabled = false;
      }
    }

    async function openAgentModal() {
      const selector = document.getElementById('wiz-process');
      selector.innerHTML = '<option value="">No procedure assigned</option>';
      try {
        const response = await fetch('/api/processes');
        const processes = await response.json();
        selector.innerHTML += processes.map(process => '<option value="' + escapeHtml(process.id) + '">' + escapeHtml(process.title) + ' · v' + escapeHtml(process.version) + '</option>').join('');
      } catch {
        document.getElementById('wiz-result').innerText = 'Could not load available procedures.';
      }
      openModal('agent-modal');
    }

    async function submitCreateAgent() {
      const name = document.getElementById('wiz-name').value.trim();
      const role = document.getElementById('wiz-role').value.trim();
      const desc = document.getElementById('wiz-desc').value;
      const harness = document.getElementById('wiz-harness').value;
      const tier = parseInt(document.getElementById('wiz-model').value);
      const compute = document.getElementById('wiz-compute').value;
      const processId = document.getElementById('wiz-process').value;
      const result = document.getElementById('wiz-result');

      if (!name || !role) {
        result.innerText = 'Enter both a teammate name and role.';
        return;
      }

      const submit = document.querySelector('#agent-modal button[onclick="submitCreateAgent()"]');
      if (submit.disabled) return;
      submit.disabled = true;
      result.textContent = 'Saving teammate…';
      let savedAgent = false;
      try {
      const agentResponse = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          role,
          description: desc,
          status: 'idle',
          harnessPolicy: { preferredHarnessId: harness, autoResume: false },
          // Choosing a tier records an intent, not a provider connection. A model and
          // provider remain explicitly unconfigured until a reviewed backend exists.
          modelPolicy: { preferredTier: tier, preferredModel: 'unconfigured', preferredProvider: 'unconfigured', allowCloudFallback: false },
          decisionPolicy: { useSystem1Router: true },
          computePolicy: { environment: compute },
          memoryNamespace: 'general',
          tools: [],
          permissions: ['workspace:read'],
        }),
      });
      const agent = await agentResponse.json();
      if (!agentResponse.ok) {
        result.innerText = agent.error || 'The teammate was not saved.';
        return;
      }
      savedAgent = true;
      if (processId) {
        const bindingResponse = await fetch('/api/process-bindings', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ processId, agentId: agent.id, assignedRole: role }),
        });
        const binding = await bindingResponse.json();
        if (!bindingResponse.ok) {
          closeModal('agent-modal');
          await loadView('agents');
          showToast('Teammate saved, but procedure assignment failed: ' + (binding.error || 'unknown error'));
          return;
        }
      }

      closeModal('agent-modal');
      await loadView('agents');
      } catch (error) {
        if (savedAgent) {
          closeModal('agent-modal');
          await loadView('agents');
          showToast('Teammate saved. Could not finish procedure assignment: ' + error.message);
        } else {
          result.textContent = 'Saving was interrupted. Check your team before retrying: ' + error.message;
        }
      } finally { submit.disabled = false; }
    }

    function switchView(view, clicked) {
      const target = clicked || Array.from(document.querySelectorAll('.nav-item')).find(el => (el.getAttribute('onclick') || '').startsWith("switchView('" + view + "'"));
      document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.remove('active');
        el.removeAttribute('aria-current');
      });
      if (target) {
        const group=target.closest('.nav-group');if(group)group.open=true;
        target.classList.add('active');
        target.setAttribute('aria-current', 'page');
      }
      document.querySelectorAll('.mobile-tabbar [data-mobile-view]').forEach(button=>{
        const isCurrent=button.dataset.mobileView===view;
        button.classList.toggle('active',isCurrent);
        if(isCurrent)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
      });
      // Each destination starts at its own heading instead of inheriting another view's scroll offset.
      const canvas=document.getElementById('view-content');if(canvas)canvas.scrollTop=0;
      // A destination choice should return the whole small-screen canvas to the selected work.
      if (matchMedia('(max-width:700px)').matches && document.body.classList.contains('nav-open')) closeWorkspaceNavigation(false);
      try{localStorage.setItem('agentforge-last-view',view);}catch{}
      loadView(view);
    }

    async function chooseWorkspaceExperience(experience, view) {
      const root=document.getElementById('view-content');
      root?.querySelectorAll('button').forEach(button=>button.disabled=true);
      try {
        const response=await fetch('/api/workspaces/ws-default',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({experience})});
        const result=await response.json();
        if(!response.ok)throw new Error(result.error||'Could not save your workspace experience.');
        await refreshWorkspaceExperience();
        switchView(view);
      } catch(error) {
        const feedback=document.createElement('p');feedback.className='pathway-error';feedback.setAttribute('role','alert');feedback.textContent=error.message||'Could not save your workspace experience.';root?.append(feedback);root?.querySelectorAll('button').forEach(button=>button.disabled=false);
      }
    }

    async function beginWithOutcome(event) {
      event.preventDefault();
      const input=document.getElementById('onboarding-goal');
      const feedback=document.getElementById('onboarding-goal-feedback');
      const goal=input?.value.trim();
      if(!goal)return;
      const form=input.closest('form');const submit=form.querySelector('[type=submit]');
      submit.disabled=true;feedback.textContent='Preparing your workspace…';
      try {
        const response=await fetch('/api/setup-guide/prepare',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rawGoalText:goal})});
        const result=await response.json();
        if(!response.ok)throw new Error(result.error||'Could not prepare the plan.');
        // The guide immediately checks this computer after organizing the
        // workspace. It observes readiness only; it never reads credentials
        // into the UI or connects a provider on the operator's behalf.
        let readyCount=0;
        try{const readinessResponse=await fetch('/api/setup/auto-detect',{method:'POST'});const readiness=await readinessResponse.json();if(readinessResponse.ok&&Array.isArray(readiness.capabilities))readyCount=readiness.capabilities.filter(item=>item.configured===true).length;}catch{}
        const missing=Array.isArray(result.missing)?result.missing.length:0;
        if(typeof showToast==='function')showToast('Setup Guide prepared your workspace and checked this computer.' + (readyCount ? ' ' + readyCount + ' runtime ' + (readyCount===1?'capability is':'capabilities are') + ' ready.' : '') + (missing ? ' ' + missing + ' decision' + (missing===1?' remains.':'s remain.') : ''));
        switchView('studio');
      } catch(error) {
        feedback.textContent=error.message||'Could not prepare the plan.';
        submit.disabled=false;
      }
    }

    async function completeProviderCallback() {
      const resultElement = document.getElementById('callback-result');
      const body = {
        provider: document.getElementById('callback-provider').value,
        recordId: document.getElementById('callback-connection-id').value.trim(),
        externalWorkspaceId: document.getElementById('callback-workspace-id').value.trim(),
        credentialReference: document.getElementById('callback-secret-reference').value.trim(),
        approved: document.getElementById('callback-approved').checked
      };
      resultElement.innerText = 'Recording callback…';
      const response = await fetch('/api/setup-guide/connections/callback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const result = await response.json();
      resultElement.innerText = response.ok ? ('Callback recorded: ' + result.record.state) : (result.error || 'Callback could not be recorded.');
    }

    async function startGuidedWorkspaceSetup() {
      const button=document.getElementById('command-start-guided-setup');
      const feedback=document.getElementById('command-guided-setup-feedback');
      if(!button||!feedback)return;
      button.disabled=true;
      feedback.textContent='The Setup Guide is organizing a reviewable workspace plan…';
      const rawGoalText='Set up AgentForge safely.\\n- Report model, isolation, verification, and evidence readiness using the runtime checks.\\n- Identify configuration gaps visible in this workspace.\\n- Prepare a short, reviewable checklist of owner decisions.\\n- Do not execute tasks, change credentials, expand permissions, or claim external connections are active.';
      try {
        const response=await fetch('/api/setup-guide/prepare',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rawGoalText})});
        const result=await response.json();
        if(!response.ok)throw new Error(result.error||'Could not prepare the workspace plan.');
        // Keep the first-run flow useful without asking the operator to visit
        // a second screen just to learn what is available locally.
        try{const readinessResponse=await fetch('/api/setup/auto-detect',{method:'POST'});const readiness=await readinessResponse.json();if(readinessResponse.ok&&Array.isArray(readiness.capabilities)){const ready=readiness.capabilities.filter(item=>item.configured===true).length;feedback.textContent='Workspace prepared. This computer has '+ready+' configured runtime '+(ready===1?'capability':'capabilities')+'; the guide will show the remaining decisions.';}}catch{}
        switchView('studio');
      } catch(error) {
        feedback.textContent=error.message||'Could not prepare the workspace plan.';
        button.disabled=false;
      }
    }

    async function saveSetupAnswer(event) {
      event.preventDefault();
      const form = event.currentTarget;
      const feedback = form.querySelector('.studio-guide-answer-feedback');
      const submit = form.querySelector('button[type="submit"]');
      const questionId = form.elements.questionId?.value?.trim();
      const answer = form.elements.answer?.value?.trim();
      if (!questionId || !answer) return;
      submit.disabled = true;
      feedback.textContent = 'Saving your answer…';
      try {
        const response = await fetch('/api/setup-guide/answers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ questionId, answer }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not save your answer.');
        feedback.textContent = 'Saved. The guide is ready for the next decision.';
        setTimeout(() => switchView('studio'), 300);
      } catch (error) {
        feedback.textContent = error.message || 'Could not save your answer.';
        submit.disabled = false;
      }
    }

    async function openSetupGuideConversation() {
      try {
        const threads=await conversationRequest('/api/threads');
        const setup=threads.find(thread=>thread.title==='Workspace setup'&&!thread.archived);
        if(!setup){showToast('The Setup Guide has not prepared a workspace conversation yet.');return;}
        conversationState.selected=setup.id;
        try{localStorage.setItem('agentforge-active-conversation',setup.id);}catch{}
        switchView('messages');
      } catch(error) {
        showToast(error.message||'Could not open the Setup Guide conversation.');
      }
    }

    // ── Record-driven Team Room map ───────────────────────────────
    // The active topology is rendered from saved agents and task assignments.
    // Decorative room motion is clearly labeled and never implies a live run;
    // execution signals remain tied to saved, process-backed tasks.
    let floorResizeObserver=null;
    let graphResizeObserver=null;
    function initFloorPhysics(agentList, runtime, tasks) {
      const canvas = document.getElementById('forge-floor-canvas');
      if (canvas) renderWorkspaceRoomMap(canvas, agentList, runtime, tasks || []);
    }

    // ── Measured benchmark and drift comparison functions ─────────
    function runLiveDriftEval() {
      const el = document.getElementById('drift-target');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }

    let driftEvaluationPending = false;
    async function executeDriftEvaluation() {
      if (driftEvaluationPending) return;
      const targetVal = document.getElementById('drift-target')?.value || '';
      const [targetId, targetType] = targetVal.split('|');
      const version = document.getElementById('drift-version')?.value?.trim() || '';
      const passRate = parseFloat(document.getElementById('drift-passrate')?.value || '');
      const latency = parseFloat(document.getElementById('drift-latency')?.value || '');
      const misuse = document.getElementById('drift-misuse')?.checked ? 1 : 0;
      const hallucination = document.getElementById('drift-hallucination')?.checked ? 1 : 0;
      let resultBox = document.getElementById('drift-eval-result');
      const submitButton = document.querySelector('.quality-form button');

      if (!targetId || !targetType || !version || !Number.isFinite(passRate) || passRate < 0 || passRate > 100 || !Number.isFinite(latency) || latency < 0) {
        if (resultBox) resultBox.innerHTML = '<span style="color:#f59e0b;">Select a measured baseline and enter the observed candidate version, pass rate, and latency.</span>';
        return;
      }

      if (resultBox) {
        resultBox.innerHTML = '<span style="color:#c4b5fd; font-family:monospace; font-size:11px;">Recording comparison against the measured baseline...</span>';
      }

      driftEvaluationPending = true;
      if (submitButton) submitButton.disabled = true;
      try {
        const res = await fetch('/api/drift/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetId,
            targetType,
            targetVersion: version,
            passRatePct: passRate,
            avgLatencyMs: latency,
            toolMisuseCount: misuse,
            hallucinatedClaimsCount: hallucination,
            testCaseResults: {}
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Comparison could not be recorded.');
        // Refresh persisted measurements without treating a refresh failure as a failed save.
        let refreshWarning = '';
        if (currentView === 'benchmarks') {
          try { await showPerformanceWorkspace(); }
          catch { refreshWarning = ' Saved successfully, but history could not refresh. Reopen Benchmarks to reload it.'; }
          resultBox = document.getElementById('drift-eval-result');
        } else { resultBox = null; }
        if (resultBox) renderComparisonReceipt(resultBox, data, refreshWarning);
      } catch (err) {
        if (resultBox) resultBox.innerHTML = '<span style="color:#ef4444;">Evaluation failed: ' + escapeHtml(err.message) + '</span>';
      } finally {
        driftEvaluationPending = false;
        if (submitButton) submitButton.disabled = false;
      }
    }

    // ── Specifications & Architecture Explorer Functions ──────
    let activeDocFilename = '';

    function renderDocListItems(docs) {
      if (!docs || docs.length === 0) {
        return '<div style="padding:12px; color:#64748b; font-size:12px;">No matching specifications found.</div>';
      }
      return docs.map(d => {
        const isMaster = d.isMasterSpec;
        const badgeColor = isMaster ? '#c4b5fd' : '#64748b';
        return '<div class="doc-item" data-filename="' + escapeHtml(d.name) + '" onclick="loadDocContent(this.dataset.filename)" style="padding:8px 10px; border-radius:6px; background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.06); cursor:pointer; transition:all 0.15s;">' +
          '<div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">' +
            '<strong style="font-size:11px; color:#f1f5f9; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + escapeHtml(d.name) + '</strong>' +
            '<span style="font-size:9px; font-family:monospace; color:' + badgeColor + ';">' + Math.round(d.sizeBytes/1024) + 'KB</span>' +
          '</div>' +
          '<div style="font-size:10px; color:#94a3b8; margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + escapeHtml(d.title) + '</div>' +
          '<div style="display:flex; gap:6px; margin-top:4px;">' +
            '<span style="font-size:9px; padding:1px 5px; border-radius:3px; background:rgba(255,255,255,0.06); color:#94a3b8;">' + escapeHtml(d.category) + '</span>' +
            (isMaster ? '<span style="font-size:9px; padding:1px 5px; border-radius:3px; background:rgba(196,181,253,0.15); color:#c4b5fd; font-weight:700;">MASTER</span>' : '') +
          '</div>' +
        '</div>';
      }).join('');
    }

    function filterDocs(cat, btn) {
      if (btn) {
        document.querySelectorAll('#view-content .btn-secondary').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      }
      const filtered = (cat === 'all')
        ? (window._allDocs || [])
        : (window._allDocs || []).filter(d => d.category === cat);
      const listPane = document.getElementById('docs-list-pane');
      if (listPane) listPane.innerHTML = renderDocListItems(filtered);
    }

    function searchDocs(query) {
      const q = (query || '').toLowerCase().trim();
      const filtered = (window._allDocs || []).filter(d =>
        d.name.toLowerCase().includes(q) ||
        d.title.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q) ||
        (d.snippet || '').toLowerCase().includes(q)
      );
      const listPane = document.getElementById('docs-list-pane');
      if (listPane) listPane.innerHTML = renderDocListItems(filtered);
    }

    async function loadDocContent(filename) {
      activeDocFilename = filename;
      document.querySelectorAll('.doc-item').forEach(el => {
        if (el.dataset.filename === filename) el.classList.add('active');
        else el.classList.remove('active');
      });
      const titleEl = document.getElementById('doc-reader-title');
      const metaEl = document.getElementById('doc-reader-meta');
      const bodyEl = document.getElementById('doc-reader-body');
      const copyBtn = document.getElementById('doc-copy-btn');

      if (titleEl) titleEl.textContent = filename;
      if (bodyEl) bodyEl.textContent = 'Loading specification document...';

      try {
        const res = await fetch('/api/docs/' + encodeURIComponent(filename));
        if (!res.ok) throw new Error('Could not load doc');
        const doc = await res.json();
        window._currentDocRaw = doc.content;
        if (titleEl) titleEl.textContent = doc.name;
        if (metaEl) metaEl.textContent = 'Size: ' + Math.round(doc.sizeBytes/1024) + ' KB · Last modified: ' + new Date(doc.modifiedAt).toLocaleString();
        if (bodyEl) bodyEl.textContent = doc.content;
        if (copyBtn) copyBtn.style.display = 'inline-block';
      } catch (err) {
        if (bodyEl) bodyEl.textContent = 'Error reading document: ' + err.message;
      }
    }

    function copyCurrentDoc() {
      if (window._currentDocRaw) {
        navigator.clipboard.writeText(window._currentDocRaw).then(() => {
          const btn = document.getElementById('doc-copy-btn');
          if (btn) {
            const orig = btn.textContent;
            btn.textContent = '✓ Copied!';
            setTimeout(() => { btn.textContent = orig; }, 1800);
          }
        });
      }
    }

    let workspaceSearchRecords = [];
    let workspaceSearchGeneration = 0;
    let workspaceSearchResultButtons = [];
    let workspaceSearchIndex = 0;
    function openWorkspaceSearch() {
      let dialog = document.getElementById('workspace-search-dialog');
      if (!dialog) {
        dialog = document.createElement('dialog'); dialog.id = 'workspace-search-dialog';
        dialog.innerHTML = '<form method="dialog"><button aria-label="Close search" class="search-close">×</button></form><div class="workspace-search-kicker">COMMAND CENTER</div><label for="workspace-query">Go to your workspace</label><input id="workspace-query" placeholder="Search projects, chats, tasks, or actions…" autocomplete="off"><p class="workspace-search-hint">↑ ↓ to choose · Enter to open · Esc to close</p><div id="workspace-search-results" role="listbox" aria-label="Workspace search results"></div>';
        document.body.appendChild(dialog);
        dialog.querySelector('input').addEventListener('input', updateWorkspaceSearch);
        dialog.querySelector('input').addEventListener('keydown', handleWorkspaceSearchKeys);
        dialog.addEventListener('click', e => { if(e.target === dialog) dialog.close(); });
      }
      dialog.showModal(); dialog.querySelector('input').value = ''; updateWorkspaceSearch(); dialog.querySelector('input').focus();
      const generation=++workspaceSearchGeneration;
      Promise.all([conversationRequest('/api/projects'),conversationRequest('/api/threads'),conversationRequest('/api/tasks')]).then(([projects,threads,tasks])=>{
        if(generation!==workspaceSearchGeneration)return;
        workspaceSearchRecords=[...projects.filter(p=>!p.archived).map(p=>({kind:'Project',title:p.name,open:()=>openProjectOverview(p.id)})),...threads.filter(t=>!t.archived).map(t=>({kind:'Conversation',title:t.title||'Untitled',open:()=>{conversationState.projectId=null;conversationState.selected=t.id;conversationState.archived=false;switchView('messages');}})),...tasks.map(t=>({kind:'Task',title:t.title,open:()=>{openWorkDetail(t);}}))];
        if(dialog.open)updateWorkspaceSearch();
      }).catch(()=>{workspaceSearchRecords=[];});
    }
    function handleWorkspaceSearchKeys(event) {
      if (!workspaceSearchResultButtons.length) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const direction = event.key === 'ArrowDown' ? 1 : -1;
        workspaceSearchIndex = (workspaceSearchIndex + direction + workspaceSearchResultButtons.length) % workspaceSearchResultButtons.length;
        applyWorkspaceSearchSelection();
      } else if (event.key === 'Enter') {
        event.preventDefault(); workspaceSearchResultButtons[workspaceSearchIndex]?.click();
      }
    }
    function applyWorkspaceSearchSelection() {
      workspaceSearchResultButtons.forEach((button, index) => {
        const selected = index === workspaceSearchIndex;
        button.setAttribute('aria-selected', String(selected));
        button.classList.toggle('is-selected', selected);
        if (selected) button.scrollIntoView({ block: 'nearest' });
      });
    }
    function updateWorkspaceSearch() {
      const query = document.getElementById('workspace-query').value.trim().toLowerCase();
      const results = document.getElementById('workspace-search-results'); results.replaceChildren();
      const appendResult=(label,kind,open,detail)=>{const button=document.createElement('button');button.type='button';button.className='workspace-search-result';button.setAttribute('role','option');const copy=document.createElement('span');copy.className='workspace-search-result-copy';const title=document.createElement('strong');title.textContent=label;copy.append(title);if(detail){const note=document.createElement('small');note.className='workspace-search-result-detail';note.textContent=detail;copy.append(note);}const tag=document.createElement('small');tag.textContent=kind;button.append(copy,tag);button.onclick=()=>{document.getElementById('workspace-search-dialog').close();open();};results.appendChild(button);return button;};
      const actions=[
        {label:'Create a task',keywords:'new work task',open:()=>openTaskModal()},
        {label:'Create a project',keywords:'new project workspace',open:()=>editProject()},
        {label:'Open review desk',keywords:'approvals decisions review',open:()=>switchView('approvals')},
        {label:'Open inbox',keywords:'attention alerts',open:()=>switchView('inbox')},
        {label:'Create a goal plan',keywords:'goal planning proof',open:()=>switchView('goals')},
      ];
      const visible=[];
      for(const action of actions.filter(item=>!query||(item.label+' '+item.keywords).toLowerCase().includes(query))){visible.push(appendResult(action.label,'Action',action.open,'Start a saved workspace workflow'));}
      document.querySelectorAll('.nav-item').forEach(link => {const label=link.getAttribute('aria-label')||link.textContent.trim();if(query&&!label.toLowerCase().includes(query))return;visible.push(appendResult(label,'View',()=>link.click(),'Open this workspace surface'));});
      for(const record of workspaceSearchRecords.filter(item=>item.title.toLowerCase().includes(query)).slice(0,30)){visible.push(appendResult(record.title,record.kind,record.open,'Saved workspace record'));}
      workspaceSearchResultButtons=visible;workspaceSearchIndex=0;applyWorkspaceSearchSelection();
      if(!results.children.length) results.textContent = 'No matching projects, conversations, tasks, views, or actions.';
    }
    function closeWorkspaceNavigation(restoreFocus=false){const wasOpen=document.body.classList.contains('nav-open');document.body.classList.remove('nav-open');const toggle=document.querySelector('.workspace-menu');toggle.setAttribute('aria-expanded','false');document.querySelector('[data-mobile-more]')?.setAttribute('aria-expanded','false');if(wasOpen&&restoreFocus)toggle.focus();}
    function toggleWorkspaceNavigation(){
      const more=document.querySelector('[data-mobile-more]');
      if(matchMedia('(min-width:701px)').matches){
        const compact=document.body.classList.toggle('nav-compact');
        const toggle=document.querySelector('.workspace-menu');
        toggle?.setAttribute('aria-expanded',String(!compact));
        toggle?.setAttribute('aria-label',compact?'Expand workspace navigation':'Collapse workspace navigation');
        toggle?.setAttribute('title',compact?'Expand workspace navigation':'Collapse workspace navigation');
        try{localStorage.setItem('agentforge-nav-compact',String(compact));}catch{}
        return;
      }
      if(document.body.classList.contains('nav-open')){closeWorkspaceNavigation(true);more?.setAttribute('aria-expanded','false');return;}
      document.body.classList.add('nav-open');document.querySelector('.workspace-menu').setAttribute('aria-expanded','true');more?.setAttribute('aria-expanded','true');const item=Array.from(document.querySelectorAll('#workspace-navigation .nav-item')).find(link=>link.classList.contains('active')&&link.getClientRects().length)||document.querySelector('#workspace-navigation summary');item?.focus();
    }
    document.addEventListener('click',event=>{if(document.body.classList.contains('nav-open')&&!event.target.closest('#workspace-navigation,.workspace-menu,[data-mobile-more]'))closeWorkspaceNavigation(false);});
    document.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); openWorkspaceSearch(); }
      if(event.key==='Escape'&&document.body.classList.contains('nav-open')){event.preventDefault();closeWorkspaceNavigation(true);}
      if(event.key==='Tab'&&document.body.classList.contains('nav-open')&&matchMedia('(max-width:700px)').matches){
        const items=[document.querySelector('.workspace-menu'),...document.querySelectorAll('#workspace-navigation summary,#workspace-navigation .nav-item')].filter(item=>item.getClientRects().length);
        const first=items[0],last=items[items.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
      }
    });
    document.querySelectorAll('.nav-item').forEach(link => {
      link.tabIndex = 0; link.setAttribute('role', 'button');
      link.addEventListener('keydown', event => { if(event.key === 'Enter' || event.key === ' ') {event.preventDefault(); link.click();} });
      link.addEventListener('click', () => closeWorkspaceNavigation(matchMedia('(max-width:700px)').matches));
    });
    ${messageClient}
    ${responseClient}
    ${draftClient}
${roomMapClient}
${conversationClient}
${projectFilesClient}
${projectClient}
${evidenceClient}
${workboardClient}
    ${teamClient}
    ${activityClient}
    ${preferencesClient}
    ${memoryClient}
    ${catalogClient}
    ${migrationClient}
    ${documentClient}
    ${performanceClient}
${goalClient}
    ${connectionsClient}
    // Preserve the user's navigation density independently of the active view.
    function setupNavigationGroups(){
      let preferences={};try{preferences=JSON.parse(localStorage.getItem('agentforge-nav-groups-v2')||'{}')||{};}catch{}
      let compact=false;try{compact=localStorage.getItem('agentforge-nav-compact')==='true';}catch{}
      if(compact)document.body.classList.add('nav-compact');
      for(const heading of Array.from(document.querySelectorAll('.nav-section'))){
        const name=heading.textContent.trim();const group=document.createElement('details');group.className='nav-group';const defaultOpen=name==='Team'||name==='Work';group.open=compact?true:(preferences[name]??defaultOpen);
        const summary=document.createElement('summary');summary.textContent=name;summary.className='nav-group-title';group.append(summary);heading.before(group);
        let next=heading.nextElementSibling;while(next&&!next.classList.contains('nav-section')){const following=next.nextElementSibling;group.append(next);next=following;}heading.remove();
        group.addEventListener('toggle',()=>{if(document.body.classList.contains('nav-compact'))return;preferences[name]=group.open;try{localStorage.setItem('agentforge-nav-groups-v2',JSON.stringify(preferences));}catch{}});
      }
      const navigationToggle=document.querySelector('.workspace-menu');
      if(compact){navigationToggle?.setAttribute('aria-expanded','false');navigationToggle?.setAttribute('aria-label','Expand workspace navigation');navigationToggle?.setAttribute('title','Expand workspace navigation');}
      navigationToggle?.addEventListener('click',()=>{
        if(matchMedia('(max-width:700px)').matches)return;
        const compactNow=document.body.classList.contains('nav-compact');
        document.querySelectorAll('.nav-group').forEach(group=>{group.open=compactNow?true:(preferences[group.querySelector('.nav-group-title')?.textContent.trim()||'']??['Team','Work'].includes(group.querySelector('.nav-group-title')?.textContent.trim()||''));});
      });
    }
    setupNavigationGroups();
    // Initial load waits for the explicit owner session when strict mode is
    // enabled. The same cookie then protects ordinary fetch requests and SSE.
    async function startAuthenticatedWorkspace() {
      initRealtime();
      await openInitialWorkspaceView();
    }
    async function startWorkspace() {
      try {
        const response = await fetch('/api/auth/me');
        const identity = await response.json();
        if (!response.ok || identity.accessMode === 'authentication_required') {
          openAuthenticationGate('setup');
          return;
        }
      } catch {
        // The normal workspace surfaces will show a connection error if the
        // local control plane is unavailable; do not invent a sign-in state.
      }
      await startAuthenticatedWorkspace();
    }
    async function openInitialWorkspaceView(){
      let initialView='home';
      let hasSavedView=false;
      try{const saved=localStorage.getItem('agentforge-last-view');if(Array.from(document.querySelectorAll('.nav-item')).some(link=>(link.getAttribute('onclick')||'').includes("'"+saved+"'"))){initialView=saved;hasSavedView=true;}}catch{}
      if(!hasSavedView){
        try{const workspaceState=await fetch('/api/workspace').then(response=>response.json());const experience=workspaceState.workspace?.experience;if(experience==='workspace')initialView='messages';else if(experience==='studio')initialView='studio';else if(!experience)initialView='onboarding';}catch{}
      }
      switchView(initialView);
    }
    void startWorkspace();
  </script>
</body>
</html>`;
  }






