#!/bin/sh
RUNNER_HOME="`dirname "$0"`"
PIPE="/var/tmp/org.snowlib.snow-runner-in"
if [ ! -z "$2" ]
then
  PIPE=$PIPE"."$2
fi
rm -f $PIPE
mkfifo $PIPE
(tail -f $PIPE) | node $RUNNER_HOME/run.js $1 -i