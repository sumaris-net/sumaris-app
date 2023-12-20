#!/bin/bash
# Get to the root project
if [[ "_" == "_${PROJECT_DIR}" ]]; then
  SCRIPT_DIR=$(dirname $0)
  PROJECT_DIR=$(cd "${SCRIPT_DIR}/.." && pwd)
  export PROJECT_DIR
fi;

# Preparing environment
. ${PROJECT_DIR}/scripts/env-android.sh
[[ $? -ne 0 ]] && exit 1

cd ${PROJECT_DIR}

# Read parameters
task=$1
version=$2
androidVersion=$3
release_description=$4

# Check version format
if [[ ! $task =~ ^(pre|rel)$ || ! $version =~ ^[0-9]+\.[0-9]+\.[0-9]+(-(alpha|beta|rc)[0-9]+)?$ || ! $androidVersion =~ ^[0-9]+$ ]]; then
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
if [[ ! "$branch" = "develop" ]]; then
  if [[ "$branch" =~ ^features?/.* ]]; then

    if [[ ! "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+-(alpha|beta|rc)[0-9]+$ ]]; then
      echo ">> Invalid version format - expected x.y.z-alpha*, x.x.x-beta*, x.x.x-rc*."
      exit 1
    fi

  elif [[ "$branch" = "release/$version" ]]; then
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
currentAndroid=`grep -oP "versionCode [0-9]+" android/app/build.gradle | grep -oP "\d+"`
if [[ "_$currentAndroid" == "_" ]]; then
  echo ">> Unable to read the current Android version in 'android/app/build.gradle'. Please check version format is an integer."
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

  if [[ "$branch" = "develop" ]]
  then
    git flow release start "$version"
  else
    # Release from a feature branch
    echo "--- Release from branch $branch"
    git checkout -b "release/$version"
  fi
  [[ $? -ne 0 ]] && exit 1
fi

case "$task" in
rel|pre)
    # Change the version in file: 'package.json'
    sed -i "s/version\": \"$current\"/version\": \"$version\"/g" package.json

    # Change versionCode and versionName in file: 'android/app/build.gradle'
    sed -i "s/ versionCode $currentAndroid/ versionCode $androidVersion/g" android/app/build.gradle
    currentVersionName=`grep -oP "versionName \"[^\"]+\"" android/app/build.gradle | grep -oP "\d+.\d+.\d+(-(alpha|beta|rc)[0-9]+)?"`
    sed -i "s/ versionName \"$currentVersionName\"/ versionName \"$version\"/g" android/app/build.gradle

    # Change versionCode in file: 'android/app/src/main/AndroidManifest.xml'
    currentAndroid=`grep -oP "versionCode=\"[0-9]+\"" android/app/src/main/AndroidManifest.xml | grep -oP "\d+"`
    sed -i "s/versionCode=\"$currentAndroid\"/versionCode=\"$androidVersion\"/g" android/app/src/main/AndroidManifest.xml
    currentVersionName=`grep -oP "versionName=\"[^\"]+\"" android/app/src/main/AndroidManifest.xml | grep -oP "\d+.\d+.\d+(-(alpha|beta|rc)[0-9]+)?"`
    sed -i "s/versionName=\"$currentVersionName\"/versionName=\"$version\"/g" android/app/src/main/AndroidManifest.xml

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
npm install --no-save --unsafe-perm --force
[[ $? -ne 0 ]] && exit 1

echo "-------------------------------------------"
echo "- Compiling sources..."
echo "-------------------------------------------"
npm run build.prod
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
  echo "Cannot create the archive for the web artifact"
  exit 1
fi

echo "- Creating web artifact [OK] at \'${ZIP_FILE}\'"
echo ""

echo "-------------------------------------------"
echo "- Compiling sources for Android platform..."
echo "-------------------------------------------"

# Removing previous APK..."
rm ${PROJECT_DIR}/android/app/build/outputs/apk/release/*.apk

# Copy generated i18n files, to make sure Android release will use it
cp ${PROJECT_DIR}/www/assets/i18n/*.json ${PROJECT_DIR}/src/assets/i18n/

# Launch the build script
PROJECT_DIR=${PROJECT_DIR}
cd ${PROJECT_DIR}/scripts || exit 1
./release-android.sh
[[ $? -ne 0 ]] && exit 1


echo "**********************************"
echo " /!\ You should now :"
echo " - Open Android Studio and Build the release APK..."
echo " - Then run: "
echo ""
echo "cd $PROJECT_DIR/scripts"
if [[ "$branch" =~ ^features?/.* ]]; then
  echo "./release-android-sign.sh && ./release-finish.sh $version $branch && ./release-to-github.sh $task $branch"
else
  echo "./release-android-sign.sh && ./release-finish.sh && ./release-to-github.sh $task"
fi

exit 1
