@echo off

SET THIS=%~dp0

echo %DATE% %TIME% Entering start_worker.cmd

"%programfiles(x86)%\nodejs\"node.exe shell.js
echo %DATE% %TIME% shell.js runtime terminated with code %ERRORLEVEL%

rem "%programfiles(x86)%\nodejs\"node.exe showlog.js
rem echo %DATE% %TIME% showlog.js runtime terminated with code %ERRORLEVEL%

echo %DATE% %TIME% Exiting start_worker.cmd
