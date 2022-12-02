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

cd ${PROJECT_DIR}

# Remove existing builds
if [[ -f "${APK_SIGNED_FILE}" ]]; then
  rm -f ${APK_SIGNED_FILE}
fi;
if [[ -f "${APK_UNSIGNED_FILE}" ]]; then
  rm -f ${APK_UNSIGNED_FILE}
fi;

# Run the build
echo "--- Running Android build..."
echo ""

ionic run android-build
[[ $? -ne 0 ]] && exit 1

if [[ ! -f "${APK_SIGNED_FILE}" ]]; then

  if [[ ! -f "${APK_UNSIGNED_FILE}" ]]; then
    echo "APK file not found at: ${APK_UNSIGNED_FILE}"
    exit 1
  fi

  # Sign APK file
  . ${PROJECT_DIR}/scripts/release-android-sign.sh
  [[ $? -ne 0 ]] && exit 1
else
  echo "Successfully generated signed APK at: ${APK_SIGNED_FILE}"
fi

echo "--- Running Android build [OK]"

exit 0
