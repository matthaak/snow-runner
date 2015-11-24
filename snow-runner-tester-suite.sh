#!/bin/sh
RUNNER_HOME="`dirname "$0"`"
RUNNER_JS="gs.include('SnowLib.Tester.Suite');SnowLib.Tester.Suite.getByName('$1').run();"
$RUNNER_HOME/snow-runner-eval.sh "$RUNNER_JS" $2