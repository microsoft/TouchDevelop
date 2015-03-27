@echo off

SET THIS=%~dp0


cspack.exe %THIS%\tdshell.csdef /out:%THIS%\..\..\build\tdshell.cspkg /roleFiles:ShellRole;%THIS%\files.txt
if %ERRORLEVEL% NEQ 0 (
    echo Error building bootstrap.cspkg. Make sure cspack.exe from Windows Azure SDK is on the PATH.
    exit /b -1
)

exit /b 0
