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

if [[ ! -d "${ANDROID_SDK_CLI_ROOT}/bin" ]]; then
  echo "Failed to find the Android SDK CLI. Please run first:  \`scripts/install-android-sdk-tools.sh\`"
  exit 1
fi

# Run the build
echo "--- Building Capacitor App..."
cd ${PROJECT_DIR}
npx jetifier && ionic capacitor build android --configuration ${BUILD_CONFIGURATION}
