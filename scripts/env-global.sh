#!/bin/bash
# Get to the root project
if [[ "_" == "_${PROJECT_DIR}" ]]; then
  SCRIPT_DIR=$(dirname $0)
  PROJECT_DIR=$(cd ${SCRIPT_DIR}/.. && pwd)
  export PROJECT_DIR
fi;

if [[ ! -f "${PROJECT_DIR}/package.json" ]]; then
  echo "Invalid project dir: file 'package.json' not found in ${PROJECT_DIR}"
  echo "-> Make sure to run the script inside his directory, or export env variable 'PROJECT_DIR'"
  exit 1
fi;

echo "Preparing project environment.."
NODEJS_VERSION=10

#ANDROID_NDK_VERSION=r19c
ANDROID_SDK_VERSION=r29.0.2
ANDROID_SDK_TOOLS_VERSION=4333796
ANDROID_SDK_ROOT=/usr/lib/android-sdk
ANDROID_ALTERNATIVE_SDK_ROOT="${HOME}/Android/Sdk"
ANDROID_SDK_TOOLS_ROOT=${ANDROID_SDK_ROOT}/build-tools
ANDROID_OUTPUT_APK=${PROJECT_DIR}/platforms/android/app/build/outputs/apk
ANDROID_OUTPUT_APK_DEBUG=${ANDROID_OUTPUT_APK}/debug
ANDROID_OUTPUT_APK_RELEASE=${ANDROID_OUTPUT_APK}/release
ANDROID_OUTPUT_APK_PREFIX=app

# /!\ WARN can be define in your <project>/.local/env.sh file
#JAVA_HOME=

GRADLE_VERSION=4.10.3
GRADLE_HOME=${HOME}/.gradle/${GRADLE_VERSION}
CORDOVA_ANDROID_GRADLE_DISTRIBUTION_URL=https://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-all.zip

# Override with a local file, if any
if [[ -f "${PROJECT_DIR}/.local/env.sh" ]]; then
  echo "Loading environment variables from: '.local/env.sh'"
  source ${PROJECT_DIR}/.local/env.sh
  [[ $? -ne 0 ]] && exit 1
else
  echo "No file '${PROJECT_DIR}/.local/env.sh' found. Will use defaults"
fi

# Checking Java installed
if [[ "_" == "_${JAVA_HOME}" ]]; then
  JAVA_CMD=`which java`
  if [[ "_" == "_${JAVA_CMD}" ]]; then
    echo "No Java installed. Please install java, or set env variable JAVA_HOME "
    exit 1
  fi

  # Check the Java version
  JAVA_VERSION=`java -version 2>&1 | egrep "(java|openjdk) version" | awk '{print $3}' | tr -d \"`
  if [[ $? -ne 0 ]]; then
    echo "No Java JRE 1.8 found in machine. This is required for Android artifacts."
    exit 1
  fi
  JAVA_MAJOR_VERSION=`echo ${JAVA_VERSION} | awk '{split($0, array, ".")} END{print array[1]}'`
  JAVA_MINOR_VERSION=`echo ${JAVA_VERSION} | awk '{split($0, array, ".")} END{print array[2]}'`
  if [[ ${JAVA_MAJOR_VERSION} -ne 1 ]] || [[ ${JAVA_MINOR_VERSION} -ne 8 ]]; then
    echo "Require a Java JRE in version 1.8, but found ${JAVA_VERSION}. You can override your default JAVA_HOME in '.local/env.sh'."
    exit 1
  fi
fi

# Check Android SDK root path
if [[ "_" == "_${ANDROID_SDK_ROOT}" || ! -d "${ANDROID_SDK_ROOT}" ]]; then
  if [[ -d "${ANDROID_ALTERNATIVE_SDK_ROOT}" ]]; then
    export ANDROID_SDK_ROOT="${ANDROID_ALTERNATIVE_SDK_ROOT}"
  else
    echo "Please set env variable ANDROID_SDK_ROOT to an existing directory"
    exit 1
  fi
fi

# Add Java, Android SDK tools to path
PATH=${ANDROID_SDK_TOOLS_ROOT}/bin:${GRADLE_HOME}/bin:${JAVA_HOME}/bin$:$PATH

# Export useful variables
export PATH \
  PROJECT_DIR \
  JAVA_HOME \
  ANDROID_SDK_ROOT \
  ANDROID_SDK_TOOLS_ROOT \
  CORDOVA_ANDROID_GRADLE_DISTRIBUTION_URL


# Node JS
export NVM_DIR="$HOME/.nvm"
if [[ -d "${NVM_DIR}" ]]; then

    # Load NVM
    . ${NVM_DIR}/nvm.sh

    # Switch to expected version
    nvm use ${NODEJS_VERSION}

    # Or install it
    if [[ $? -ne 0 ]]; then
        nvm install ${NODEJS_VERSION}
        [[ $? -ne 0 ]] && exit 1
    fi
else
    echo "nvm (Node version manager) not found (directory ${NVM_DIR} not found). Please install, and retry"
    exit -1
fi

# Install global dependencies
YARN_PATH=`which yarn`
IONIC_PATH=`which ionic`
CORDOVA_PATH=`which cordova`
CORDOVA_RES_PATH=`which cordova-res`
NATIVE_RUN_PATH=`which native-run`
if [[ "_" == "_${YARN_PATH}" || "_" == "_${IONIC_PATH}" || "_" == "_${CORDOVA_PATH}" || "_" == "_${CORDOVA_RES_PATH}" ]]; then
  echo "Installing global dependencies..."
  npm install -g yarn cordova cordova-res @ionic/cli native-run
  [[ $? -ne 0 ]] && exit 1

  # Make sure Ionic use yarn
  ionic config set -g yarn true
fi

# Install project dependencies
if [[ ! -d "${PROJECT_DIR}/node_modules" ]]; then
    echo "Installing project dependencies..."
    cd ${PROJECT_DIR}
    yarn install
fi
