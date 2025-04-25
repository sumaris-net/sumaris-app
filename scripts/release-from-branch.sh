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

### Control that the script is run on valid branch
branch=$(git rev-parse --abbrev-ref HEAD)
if [[ "$branch" = "develop" ]] || [[ "$branch" = "master" ]];
then
  echo ">> This script must NOT be run under a \`master\` or \`develop\`, but under any other branch"
  exit 1
fi

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

# OS detection for compatibility
if [[ "$OSTYPE" == "darwin"* ]]; then
  # MacOS
  SED_OPTS="-i ''"
  GREP_CMD="perl -nle"
else
  # Linux
  SED_OPTS="-i"
  GREP_CMD="grep -oP"
fi

### Get current version (package.json)
if [[ "$OSTYPE" == "darwin"* ]]; then
  current=$(perl -nle 'print $1 if /"version":\s*"([\d\.]+(-(?:alpha|beta|rc)\d+)?)"/' package.json | head -1)
else
  current=$(grep -oP 'version": "\d+.\d+.\d+(-(?:alpha|beta|rc)[0-9]+)?' package.json | grep -m 1 -oP '\d+.\d+.\d+(-(?:alpha|beta|rc)[0-9]+)?')
fi

if [[ "_$current" == "_" ]]; then
  echo ">> Unable to read the current version in 'package.json'. Please check version format is: x.y.z (x and y should be an integer)."
  exit 1;
fi
echo "Current version: $current"

### Get current version for Android
if [[ "$OSTYPE" == "darwin"* ]]; then
  currentAndroid=$(perl -nle 'print $1 if /versionCode\s+(\d+)/' android/app/build.gradle)
else
  currentAndroid=$(grep -oP "versionCode [0-9]+" android/app/build.gradle | grep -oP "\d+")
fi

if [[ "_$currentAndroid" == "_" ]]; then
  echo ">> Unable to read the current Android version in 'android/app/build.gradle'. Please check version format is an integer."
  exit 1;
fi
echo "Current Android version: $currentAndroid"

echo "**********************************"
echo "* Starting release..."
echo "**********************************"
echo "* new build version: $version"
echo "* new build android version: $androidVersion"
echo "**********************************"

read -r -p "Is these new versions correct ? [y/N] " response
if [[ "$OSTYPE" == "darwin"* ]]; then
  response=$(echo "$response" | tr '[:upper:]' '[:lower:]')
else
  response=${response,,}    # tolower
fi
[[ ! "$response" =~ ^(yes|y)$ ]] && exit 1

# Removing existing release branche
git branch -D "release/$version" || true

case "$task" in
rel|pre)
    # Change the version in file: 'package.json'
    sed $SED_OPTS "s/version\": \"$current\"/version\": \"$version\"/g" package.json

    # Change versionCode and versionName in file: 'android/app/build.gradle'
    sed $SED_OPTS "s/ versionCode $currentAndroid/ versionCode $androidVersion/g" android/app/build.gradle

    if [[ "$OSTYPE" == "darwin"* ]]; then
      currentVersionName=$(perl -nle 'print $1 if /versionName\s+"([\d\.]+(-(?:alpha|beta|rc)\d+)?)"/' android/app/build.gradle)
    else
      currentVersionName=$(grep -oP 'versionName "[^"]+"' android/app/build.gradle | grep -oP '\d+.\d+.\d+(-(?:alpha|beta|rc)[0-9]+)?')
    fi

    sed $SED_OPTS "s/ versionName \"$currentVersionName\"/ versionName \"$version\"/g" android/app/build.gradle

    # Change versionCode in file: 'android/app/src/main/AndroidManifest.xml'
    if [[ "$OSTYPE" == "darwin"* ]]; then
      currentAndroid=$(perl -nle 'print $1 if /versionCode="(\d+)"/' android/app/src/main/AndroidManifest.xml)
    else
      currentAndroid=$(grep -oP 'versionCode="[0-9]+"' android/app/src/main/AndroidManifest.xml | grep -oP '\d+')
    fi

    sed $SED_OPTS "s/versionCode=\"$currentAndroid\"/versionCode=\"$androidVersion\"/g" android/app/src/main/AndroidManifest.xml

    if [[ "$OSTYPE" == "darwin"* ]]; then
      currentVersionName=$(perl -nle 'print $1 if /versionName="([\d\.]+(-(?:alpha|beta|rc)\d+)?)"/' android/app/src/main/AndroidManifest.xml)
    else
      currentVersionName=$(grep -oP 'versionName="[^"]+"' android/app/src/main/AndroidManifest.xml | grep -oP '\d+.\d+.\d+(-(?:alpha|beta|rc)[0-9]+)?')
    fi

    sed $SED_OPTS "s/versionName=\"$currentVersionName\"/versionName=\"$version\"/g" android/app/src/main/AndroidManifest.xml

    # Change version in file: 'src/assets/manifest.json'
    if [[ "$OSTYPE" == "darwin"* ]]; then
      currentManifestJsonVersion=$(perl -nle 'print $1 if /"version":\s*"([\d\.]+(-(?:alpha|beta|rc)\d+)?)"/' src/assets/manifest.json)
    else
      currentManifestJsonVersion=$(grep -oP 'version": "\d+.\d+.\d+(-(?:alpha|beta|rc)[0-9]+)?"' src/assets/manifest.json | grep -oP '\d+.\d+.\d+(-(?:alpha|beta|rc)[0-9]+)?')
    fi

    sed $SED_OPTS "s/version\": \"$currentManifestJsonVersion\"/version\": \"$version\"/g" src/assets/manifest.json

    # Bump the install.sh
    sed $SED_OPTS "s/echo \".*\" #lastest/echo \"$version\" #lastest/g" install.sh
    ;;
*)
    echo "No task given"
    ;;
esac

git checkout -B "release/$version" || exit 1

echo "-------------------------------------------"
echo "- Refresh dependencies..."
echo "-------------------------------------------"
npm install --no-save --unsafe-perm --force
[[ $? -ne 0 ]] && exit 1

echo "-------------------------------------------"
echo "- Compiling sources..."
echo "-------------------------------------------"
npm run build:prod
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

echo "- Creating web artifact [OK] at ${ZIP_FILE}"
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

description="$release_description"
if [[ "_$description" == "_" ]]; then
    description="Release $version"
fi

echo "**********************************"
echo "* Finishing release"
echo "**********************************"

echo "---- Push changes to branch..."
cd ${PROJECT_DIR} || exit 1
git commit -a -m "Release $version\n$release_description" && git status
git checkout "${branch}" || exit 1
git merge --no-ff --no-edit -m "Release ${version}" "release/${version}" || exit 1
git tag -a "${version}" -m "${version}" || exit 1
git push origin "${branch}" || exit 1
git push origin "refs/tags/${version}" || exit 1

echo "---- Push changes to branch [OK]"
echo ""

echo "---- Removing local release branch ..."
echo ""
git branch -d "release/$version" || true
# NOTE: can fail, but continue

# Pause (if propagation is need between hosted git server and github)
echo " Waiting 40s, for propagation to github..."
sleep 40s

echo "**********************************"
echo "* Uploading artifacts to Github..."
echo "**********************************"
cd ${PROJECT_DIR}/scripts || exit 1
./release-to-github.sh $task $version ''"$description"'' $branch
[[ $? -ne 0 ]] && exit 1

echo "**********************************"
echo "* Build release succeed !"
echo "**********************************"

