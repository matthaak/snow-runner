#!/bin/sh
PIPE="/var/tmp/org.snowlib.snow-runner-in"
if [ ! -z "$2" ]
then
  PIPE=$PIPE"."$2
fi
echo "$1" > $PIPE