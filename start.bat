@echo off
cd /d C:\Users\mscott\AI_Workspace\AgentForge-Staging
set AGENTFORGE_PORT=3000
node --import tsx src/server.ts
