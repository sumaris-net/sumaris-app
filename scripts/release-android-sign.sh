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

# Sign files
echo "Signing APK file..."
if [[ ! -f "${APK_UNSIGNED_FILE}" ]]; then
  echo "APK file not found: ${APK_UNSIGNED_FILE}"
  exit 1
fi
if [[ ! -f "${KEYSTORE_FILE}" ]]; then
  echo "Keystore file not found: ${KEYSTORE_FILE}"
  exit 1
fi

# Remove previous version
if [[ -f "${APK_SIGNED_FILE}" ]]; then
  echo "Delete previous signed APK file: ${APK_SIGNED_FILE}"
  rm -f ${APK_SIGNED_FILE}.*
fi
if [[ -f "${APK_UNSIGNED_FILE}.align" ]]; then
  rm -f ${APK_UNSIGNED_FILE}.align
fi

cd ${ANDROID_BUILD_TOOLS_ROOT}
echo ${ANDROID_BUILD_TOOLS_ROOT}
[[ $? -ne 0 ]] && exit 1

echo "Executing zipalign..."
./zipalign -v 4 ${APK_UNSIGNED_FILE} ${APK_UNSIGNED_FILE}.align
[[ $? -ne 0 ]] && exit 1
echo "Executing zipalign [OK]"

echo "Executing apksigner..."
./apksigner sign --ks ${KEYSTORE_FILE} --ks-pass "pass:${KEYSTORE_PWD}" --ks-key-alias ${KEY_ALIAS} \
  --min-sdk-version 22 --v1-signing-enabled true \
  --out ${APK_SIGNED_FILE} ${APK_UNSIGNED_FILE}.align
[[ $? -ne 0 ]] && exit 1
echo "Executing apksigner [OK]"

echo "Verify APK signature..."
./apksigner verify ${APK_SIGNED_FILE}
[[ $? -ne 0 ]] && exit 1
echo "Verify APK signature [OK]"

echo "Successfully generated signed APK at: ${APK_SIGNED_FILE}"
exit 0
