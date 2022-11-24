#!/bin/bash

BUILD_CONFIGURATION=development

# Get to the root project
if [[ "_" == "_${PROJECT_DIR}" ]]; then
  SCRIPT_DIR=$(dirname $0)
  PROJECT_DIR=$(cd ${SCRIPT_DIR}/.. && pwd)
  export PROJECT_DIR
fi;

# Preparing Android environment
. ${PROJECT_DIR}/scripts/env-android.sh
[[ $? -ne 0 ]] && exit 1

# Ask user, before cleaning old APK
if [[ -f ${ANDROID_OUTPUT_APK_RELEASE}/${ANDROID_OUTPUT_APK_PREFIX}-release.apk ]] ||
   [[ -f "${ANDROID_OUTPUT_APK_RELEASE}/${ANDROID_OUTPUT_APK_PREFIX}-release-unsigned.apk" ]] ||
   [[ -f "${ANDROID_OUTPUT_APK_DEBUG}/${ANDROID_OUTPUT_APK_PREFIX}-debug.apk" ]]; then

  echo "-------------------------------------------"
  echo "--- There is existing APK files!"
  read -r -p "> Would you like to recompile ? [y/N] " response
  response=${response,,}    # tolower

  # Use confirm: Clean old APK files
  if [[ "$response" =~ ^(yes|y)$ ]]; then

    if [[ -d "${ANDROID_OUTPUT_APK_RELEASE}" ]]; then
      rm -f ${ANDROID_OUTPUT_APK_RELEASE}/*.apk
    fi
    if [[ -d "${ANDROID_OUTPUT_APK_DEBUG}" ]]; then
      rm -f ${ANDROID_OUTPUT_APK_DEBUG}/*.apk
    fi
  fi
fi

# Building APK file
if [[ ! -f ${ANDROID_OUTPUT_APK_RELEASE}/${ANDROID_OUTPUT_APK_PREFIX}-release.apk ]] &&
   [[ ! -f "${ANDROID_OUTPUT_APK_RELEASE}/${ANDROID_OUTPUT_APK_PREFIX}-release-unsigned.apk" ]] &&
   [[ ! -f "${ANDROID_OUTPUT_APK_DEBUG}/${ANDROID_OUTPUT_APK_PREFIX}-debug.apk" ]]; then
  echo "-------------------------------------------"
  echo "--- Building Android APK..."
  cd ${PROJECT_DIR}
  npx jetifier && ionic capacitor build android --configuration ${BUILD_CONFIGURATION}
  [[ $? -ne 0 ]] && exit 1
fi

echo "-------------------------------------------"
echo "--- Running Android application..."
if [[ -f "${ANDROID_OUTPUT_APK_RELEASE}/${ANDROID_OUTPUT_APK_PREFIX}-release.apk" ]]; then
  native-run android --app ${ANDROID_OUTPUT_APK_RELEASE}/${ANDROID_OUTPUT_APK_PREFIX}-release.apk
elif [[ -f "${ANDROID_OUTPUT_APK_RELEASE}/${ANDROID_OUTPUT_APK_PREFIX}-release-unsigned.apk" ]]; then
  native-run android --app ${ANDROID_OUTPUT_APK_RELEASE}/${ANDROID_OUTPUT_APK_PREFIX}-release-unsigned.apk
else
  native-run android --app ${ANDROID_OUTPUT_APK_DEBUG}/${ANDROID_OUTPUT_APK_PREFIX}-debug.apk
fi

