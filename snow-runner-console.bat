@echo off
set RUNNER_HOME=%~dp0
set PIPE=%TEMP%\org.snowlib.snow-runner-in
if [%2]==[] goto main
set PIPE=%PIPE%.%2
:main
set PIPE=%PIPE%.tmp
echo. > %PIPE%
node %RUNNER_HOME%\tailf.js %PIPE% | node %RUNNER_HOME%\run.js %1 -i
