#!/bin/bash

# Get to the root project
if [[ "_" == "_${PROJECT_DIR}" ]]; then
  SCRIPT_DIR=$(dirname $0)
  PROJECT_DIR=$(cd ${SCRIPT_DIR}/.. && pwd)
  export PROJECT_DIR
fi;

# Default env variables (can be override in '.local/env.sh' file)
KEYSTORE_FILE=${PROJECT_DIR}/.local/android/Sumaris.keystore
KEY_ALIAS=Sumaris
KEYSTORE_PWD=

# Preparing Android environment
. ${PROJECT_DIR}/scripts/env-android.sh
[[ $? -ne 0 ]] && exit 1

APK_SIGNED_FILE=${ANDROID_OUTPUT_APK_RELEASE}/${ANDROID_OUTPUT_APK_PREFIX}-release-signed.apk
APK_UNSIGNED_FILE=${ANDROID_OUTPUT_APK_RELEASE}/${ANDROID_OUTPUT_APK_PREFIX}-release-unsigned.apk

echo "--- Cleaning previous Android APK ..."
if [[ -f "${APK_SIGNED_FILE}" ]]; then
  rm -f ${APK_SIGNED_FILE}
fi;
if [[ -f "${APK_UNSIGNED_FILE}" ]]; then
  rm -f ${APK_UNSIGNED_FILE}
fi;
echo "--- Cleaning previous Android APK [OK]"
echo ""

# Run the build
echo "--- Building Capacitor App..."
echo ""
cd ${PROJECT_DIR}
npm run android:build:prod
[[ $? -ne 0 ]] && exit 1

echo "--- Building Capacitor App [OK]"

# Run the packaging
echo "--- Packaging Android APK..."
echo ""
npm run android:package:prod
[[ $? -ne 0 ]] && exit 1

echo "--- Packaging Android APK [OK]"
