#!/bin/bash

# Get to the root project
if [[ "_" == "_${PROJECT_DIR}" ]]; then
  SCRIPT_DIR=$(dirname $0)
  PROJECT_DIR=$(cd ${SCRIPT_DIR}/.. && pwd)
  export PROJECT_DIR
fi;


# Preparing Android environment
. ${PROJECT_DIR}/scripts/env-global.sh
[[ $? -ne 0 ]] && exit 1


echo "--- Cleaning previous Desktop App ..."
#if [[ -f "${APK_SIGNED_FILE}" ]]; then
#  rm -f ${APK_SIGNED_FILE}
#fi;
#if [[ -f "${APK_UNSIGNED_FILE}" ]]; then
#  rm -f ${APK_UNSIGNED_FILE}
#fi;
echo "--- Cleaning previous Desktop App [OK]"
echo ""

# Run the build
echo "--- Building Desktop App..."
echo ""
cd ${PROJECT_DIR}
# TODO
[[ $? -ne 0 ]] && exit 1

echo "--- Building Desktop App [OK]"
