@echo off

echo %DATE% %TIME% Entering setup_worker.cmd

SET NODE_URL=https://nodejs.org/dist/v0.12.0/node-v0.12.0-x86.msi

SET THIS=%~dp0

echo %DATE% %TIME% Granting permissions for all users to the deployment directory...
icacls %THIS% /grant "Users":(OI)(CI)F
if %ERRORLEVEL% NEQ 0 (
   echo %DATE% %TIME% ERROR Granting permission
   exit /b -9
)
echo %DATE% %TIME% Permissions granted

:install_node

echo %DATE% %TIME% Downloading node.js...
powershell -c "Invoke-WebRequest %NODE_URL% -OutFile %THIS%\node.msi"

echo %DATE% %TIME% Installing node.js...
msiexec /i %THIS%\node.msi /q
echo %ERRORLEVEL%
if %ERRORLEVEL% NEQ 0 if %ERRORLEVEL% NEQ 1603 (
   echo %DATE% %TIME% ERROR installing node.js %ERRORLEVEL%
   exit /b -2
)
rem echo %DATE% %TIME% Node.js installed


:end

echo %DATE% %TIME% Exiting setup_worker.cmd (success)

exit /b 0
