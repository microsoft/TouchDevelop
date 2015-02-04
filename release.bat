@echo off
setlocal
call compile.bat
call minify.bat runtime.js
call minify.bat main.js
rem if %errorlevel% neq 0 exit /b %errorlevel%
rem call prepeditor.bat
rem if %errorlevel% neq 0 exit /b %errorlevel%
call prepapp.bat
rem if %errorlevel% neq 0 exit /b %errorlevel%
rem call compileapp.bat
rem if %errorlevel% neq 0 exit /b %errorlevel%