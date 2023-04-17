#!/bin/bash
# Get to the root project
if [[ "_" == "_${PROJECT_DIR}" ]]; then
  cd ..
  PROJECT_DIR=`pwd`
  export PROJECT_DIR
fi;

# Preparing Android environment
. ${PROJECT_DIR}/scripts/env-global.sh
[[ $? -ne 0 ]] && exit 1

cd ${PROJECT_DIR}

echo "Updating Ionic..."
npm install -g ionic@latest

echo "Updating Capacitor..."
npm update -g capacitor@latest
[[ $? -ne 0 ]] && exit 1

echo "Updating Capacitor plugins..."
ionic capacitor platform update android --save
[[ $? -ne 0 ]] && exit 1
