@echo off
cd /d "%~dp0"
set AGENTFORGE_PORT=3000
node --import tsx src/server.ts
