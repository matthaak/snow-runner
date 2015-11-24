@echo off
set PIPE=%TEMP%\org.snowlib.snow-runner-in
if [%2]==[] goto main
set PIPE=%PIPE%.%2
:main
set PIPE=%PIPE%.tmp
set RUNNER_JS=gs.include('SnowLib.Tester.Suite');SnowLib.Tester.Suite.getByName('%~1').run();
echo %RUNNER_JS%>> %PIPE%