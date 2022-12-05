#!/bin/bash

# Get to the root project
if [[ "_" == "_${PROJECT_DIR}" ]]; then
  SCRIPT_DIR=$(dirname $0)
  PROJECT_DIR=$(cd "${SCRIPT_DIR}/.." && pwd)
  export PROJECT_DIR
fi;

# Preparing environment
. ${PROJECT_DIR}/scripts/env-global.sh
[[ $? -ne 0 ]] && exit 1

if [[ "_" == "_${CORDOVA_ANDROID_GRADLE_DISTRIBUTION_URL}" ]]; then
  echo "Missing Gradle distribution URL - please export env variable 'CORDOVA_ANDROID_GRADLE_DISTRIBUTION_URL'"
  exit 1
fi

echo "--- Preparing Android environment:"
echo "        Root: ${PROJECT_DIR}"
echo "      NodeJS: version ${NODE_VERSION} with options: ${NODE_OPTIONS}"
echo " Android SDK: ${ANDROID_SDK_ROOT}"
echo " Android CLI: ${ANDROID_SDK_CLI_ROOT}"
echo " Build Tools: ${ANDROID_BUILD_TOOLS_ROOT}"
echo "      Gradle: ${GRADLE_HOME} with options: ${GRADLE_OPTS}"
echo "        Java: ${JAVA_HOME}"

# Make sure javac exists
JAVAC_PATH=$(which javac)
if [[ "_" == "_${JAVAC_PATH}" ]]; then
  echo "ERROR: 'javac' executable not found in PATH. Make sure you have installed a complete Java JDK, and not only a JRE."
  exit 1
fi

# Prepare Android SDK tools
if [[ ! -d "${ANDROID_SDK_CLI_ROOT}" ]]; then
  cd "${PROJECT_DIR}/scripts"
  ./install-android-sdk-tools.sh
  [[ $? -ne 0 ]] && exit 1
else
  # Add SDK CLI to path
  export PATH=${ANDROID_SDK_CLI_ROOT}/bin:$PATH
fi

# Install Gradle
if [[ "_" == "_$(which gradle)" || ! -d "${GRADLE_HOME}" ]]; then
  cd "${PROJECT_DIR}/scripts"
  echo "--- Installing gradle...  ${GRADLE_HOME}"
  test -e "gradle-${GRADLE_VERSION}-all.zip" || wget -kL ${CORDOVA_ANDROID_GRADLE_DISTRIBUTION_URL}
  GRADLE_PARENT=$(dirname $GRADLE_HOME)
  test -e "${GRADLE_PARENT}" || mkdir -p ${GRADLE_PARENT}
  test -e "${GRADLE_PARENT}/gradle-${GRADLE_VERSION}" || unzip -qq gradle-${GRADLE_VERSION}-all.zip -d "${GRADLE_PARENT}"
  [[ $? -ne 0 ]] && exit 1
  test -e "${GRADLE_HOME}" || mv "${GRADLE_PARENT}/gradle-${GRADLE_VERSION}" "${GRADLE_HOME}"
  [[ $? -ne 0 ]] && exit 1
  test -e "${GRADLE_PARENT}/gradle-${GRADLE_VERSION}" && rm "${GRADLE_PARENT}/gradle-${GRADLE_VERSION}"
  test -e "gradle-${GRADLE_VERSION}-all.zip" && rm "gradle-${GRADLE_VERSION}-all.zip"
fi


# Prepare Android platform
if [[ ! -d "${PROJECT_DIR}/android" ]]; then
  echo "--- Adding Capacitor Android platform..."
  cd "${PROJECT_DIR}"
  npx cap add android
  [[ $? -ne 0 ]] && exit 1
fi

# Copy local files
if [[ -d "${PROJECT_DIR}/.local/android" ]]; then
  echo "Copying files from directory '${PROJECT_DIR}/.local/android' into '${PROJECT_DIR}/android'..."
  cp -rf ${PROJECT_DIR}/.local/android/* ${PROJECT_DIR}/android
  [[ $? -ne 0 ]] && exit 1
else
  echo "No directory '${PROJECT_DIR}/.local/android' found. Please create it, with a file 'release-signing.properties' for release signing"
fi

  echo

cd "${PROJECT_DIR}"
#echo "--- Synchronizing..."
#npx jetifier && npx cap sync android
#[[ $? -ne 0 ]] && exit 1

echo "--- Android environment is ready!"

