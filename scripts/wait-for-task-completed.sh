#!/bin/bash

# invoque the checkTaskStatus function with the taskId
taskId=$1

# wait for the task to be completed
while true; do
  taskStatus=$(npx serverless invoke -f checkTaskStatus --data "{\"taskId\": \"$taskId\"}")
  echo "Task status: $taskStatus"
  if [ "$taskStatus" == '"completed"' ]; then
    break
  fi
  sleep 4
done
