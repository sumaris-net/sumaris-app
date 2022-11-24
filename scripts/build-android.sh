#!/bin/bash
BUILD_CONFIGURATION=production

# Get to the root project
if [[ "_" == "_${PROJECT_DIR}" ]]; then
  cd ..
  PROJECT_DIR=`pwd`
  export PROJECT_DIR
fi;

# Preparing Android environment
. ${PROJECT_DIR}/scripts/env-android.sh
[[ $? -ne 0 ]] && exit 1

# Run the build
echo "--- Building Android APK..."
cd ${PROJECT_DIR}
npx jetifier && ionic capacitor build android --configuration ${BUILD_CONFIGURATION}
