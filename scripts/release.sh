#!/bin/bash
# Get to the root project
if [[ "_" == "_${PROJECT_DIR}" ]]; then
  SCRIPT_DIR=$(dirname $0)
  PROJECT_DIR=$(cd "${SCRIPT_DIR}/.." && pwd)
  export PROJECT_DIR
fi;

# Preparing Android environment
. ${PROJECT_DIR}/scripts/env-android.sh
[[ $? -ne 0 ]] && exit 1

cd ${PROJECT_DIR}

# Read parameters
task=$1
version=$2
androidVersion=$3
release_description=$4

# Check version format
if [[ ! $task =~ ^(pre|rel)$ || ! $version =~ ^[0-9]+.[0-9]+.[0-9]+(-(alpha|beta|rc)[0-9]+)?$ || ! $androidVersion =~ ^[0-9]+$ ]]; then
  echo "Wrong version format"
  echo "Usage:"
  echo " > $0 pre|rel <version> <android-version> <release_description>"
  echo "with:"
  echo " - pre: use for pre-release"
  echo " - rel: for full release"
  echo " - version: x.y.z"
  echo " - android-version: xxyyzz"
  echo " - release_description: a comment on release"
  exit 1
fi

### Control that the script is run on `dev` branch
resumeRelease=0
branch=`git rev-parse --abbrev-ref HEAD`
if [[ ! "$branch" = "develop" ]]
then
  if [[ "$branch" = "release/$version" ]]
  then
    echo "Resuming release ..."
    resumeRelease=1
  else
    echo ">> This script must be run under \`develop\` or \`release/$version\` branch"
    exit 1
  fi
fi

PROJECT_DIR=`pwd`

### Get current version (package.json)
current=`grep -oP "version\": \"\d+.\d+.\d+(-(alpha|beta|rc)[0-9]+)?" package.json | grep -m 1 -oP "\d+.\d+.\d+(-(alpha|beta|rc)[0-9]+)?"`
if [[ "_$current" == "_" ]]; then
  echo ">> Unable to read the current version in 'package.json'. Please check version format is: x.y.z (x and y should be an integer)."
  exit 1;
fi
echo "Current version: $current"

### Get current version for Android
currentAndroid=`grep -oP "android-versionCode=\"[0-9]+\"" config.xml | grep -oP "\d+"`
if [[ "_$currentAndroid" == "_" ]]; then
  echo ">> Unable to read the current Android version in 'config.xml'. Please check version format is an integer."
  exit 1;
fi
echo "Current Android version: $currentAndroid"

echo "**********************************"
if [[ $resumeRelease = 0 ]]
then
  echo "* Starting release..."
else
  echo "* Resuming release..."
fi
echo "**********************************"
echo "* new build version: $version"
echo "* new build android version: $androidVersion"
echo "**********************************"

if [[ $resumeRelease = 0 ]]
then
  read -r -p "Is these new versions correct ? [y/N] " response
  response=${response,,}    # tolower
  [[ ! "$response" =~ ^(yes|y)$ ]] && exit 1
  git flow release start "$version"
  [[ $? -ne 0 ]] && exit 1
fi

case "$task" in
rel|pre)
    # Change the version in files: 'package.json' and 'config.xml'
    sed -i "s/version\": \"$current\"/version\": \"$version\"/g" package.json
    currentConfigXmlVersion=`grep -oP "version=\"\d+.\d+.\d+(-(alpha|beta|rc)[0-9]+)?\"" config.xml | grep -oP "\d+.\d+.\d+(-(alpha|beta|rc)[0-9]+)?"`
    sed -i "s/ version=\"$currentConfigXmlVersion\"/ version=\"$version\"/g" config.xml
    sed -i "s/ android-versionCode=\"$currentAndroid\"/ android-versionCode=\"$androidVersion\"/g" config.xml

    # Change version in file: 'src/assets/manifest.json'
    currentManifestJsonVersion=`grep -oP "version\": \"\d+.\d+.\d+(-(alpha|beta|rc)[0-9]+)?\"" src/assets/manifest.json | grep -oP "\d+.\d+.\d+(-(alpha|beta|rc)[0-9]+)?"`
    sed -i "s/version\": \"$currentManifestJsonVersion\"/version\": \"$version\"/g" src/assets/manifest.json

    # Bump the install.sh
    sed -i "s/echo \".*\" #lastest/echo \"$version\" #lastest/g" install.sh
    ;;
*)
    echo "No task given"
    ;;
esac

echo "-------------------------------------------"
echo "- Refresh dependencies..."
echo "-------------------------------------------"
yarn
[[ $? -ne 0 ]] && exit 1

echo "-------------------------------------------"
echo "- Compiling sources..."
echo "-------------------------------------------"
yarn run build.prod
[[ $? -ne 0 ]] && exit 1

echo "-------------------------------------------"
echo "- Creating web artifact..."
echo "-------------------------------------------"
mkdir -p "${PROJECT_DIR}/dist"
ZIP_FILE=${PROJECT_DIR}/dist/${PROJECT_NAME}.zip
if [[ -f "$ZIP_FILE" ]]; then
  rm $ZIP_FILE
fi
cd $PROJECT_DIR/www
zip -q -r $ZIP_FILE .
if [[ $? -ne 0 ]]; then
  echo "Connot create the archive for the web artifact"
  exit 1
fi

echo "-------------------------------------------"
echo "- Compiling sources for Android platform..."
echo "-------------------------------------------"

# Removing previous APK..."
rm ${PROJECT_DIR}/platforms/android/app/build/outputs/apk/release/*.apk

# Copy generated i18n files, to make sure Android release will use it
cp ${PROJECT_DIR}/www/assets/i18n/*.json ${PROJECT_DIR}/src/assets/i18n/

# Launch the build script
PROJECT_DIR=${PROJECT_DIR}
cd ${PROJECT_DIR}/scripts || exit 1
./release-android.sh
[[ $? -ne 0 ]] && exit 1

description="$release_description"
if [[ "_$description" == "_" ]]; then
    description="Release $version"
fi


echo "**********************************"
echo "* Finishing release"
echo "**********************************"

cd ${PROJECT_DIR}/scripts || exit 1
./release-finish.sh "$version" ''"$release_description"''
[[ $? -ne 0 ]] && exit 1
# Pause (if propagation is need between hosted git server and github)
sleep 40s

echo "**********************************"
echo "* Uploading artifacts to Github..."
echo "**********************************"
cd $PROJECT_DIR/scripts
./release-to-github.sh "$task" ''"$description"''
[[ $? -ne 0 ]] && exit 1

#echo "-------------------------------------------"
#echo "- Building desktop artifacts..."
#echo "-------------------------------------------"

#git submodule init
#git submodule sync
#git submodule update --remote --merge

#if [[ -d "$PROJECT_DIR/platforms/desktop" ]]; then
#  cd platforms/desktop

#  # Build desktop assets
#  ./release.sh $version
#  if [[ $? -ne 0 ]]; then
#      exit 1
#  fi
#else
#  echo "WARN: platform/desktop not found -> Skipping desktop build!"
#fi;

echo "**********************************"
echo "* Build release succeed !"
echo "**********************************"

