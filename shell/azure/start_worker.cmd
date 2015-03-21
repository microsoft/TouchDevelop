@echo off

SET THIS=%~dp0

echo %DATE% %TIME% Entering start_worker.cmd

"%programfiles(x86)%\nodejs\"node.exe server.js
echo %DATE% %TIME% server.js runtime terminated with code %ERRORLEVEL%

echo %DATE% %TIME% Killing any remaining node.exe processes...
%THIS%\kill.exe node

echo %DATE% %TIME% Exiting start_worker.cmd
