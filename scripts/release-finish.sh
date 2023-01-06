#!/bin/bash
# Get to the root project
if [[ "_" == "_${PROJECT_DIR}" ]]; then
  SCRIPT_DIR=$(dirname $0)
  PROJECT_DIR=$(cd "${SCRIPT_DIR}/.." && pwd)
  export PROJECT_DIR
fi;

cd ${PROJECT_DIR}
PROJECT_DIR=`pwd`

# Read arguments
version=$1
release_description=$2

# Get the version, if missing
if [[ "_${version}" == "_" ]]; then
  version=`grep -oP "version\": \"\d+.\d+.\d+(-(alpha|beta|rc)[0-9]+)?" package.json | grep -m 1 -oP "\d+.\d+.\d+(-(alpha|beta|rc)[0-9]+)?"`
fi

# Compute description, if missing
description=`echo $release_description` # force quote interpretation
if [[ "_${description}" == "_" ]]; then
    description="Release $version"
fi

# Check version format
if [[ ! $version =~ ^[0-9]+.[0-9]+.[0-9]+(-(alpha|beta|rc)[0-9]*)?$ ]]; then
  echo "Wrong version format"
  echo "Usage:"
  echo " > ./release-finish.sh <version> <release_description>"
  echo "with:"
  echo " - version: x.y.z"
  echo " - release_description: a comment on release"
  exit 1
fi

### Control that the script is run on `release` branch
branch=`git rev-parse --abbrev-ref HEAD`
if [[ ! "$branch" = "release/$version" ]]
then
  echo ">> This script must be run under \`develop\` or \`release/$version\` branch"
  exit 1
fi


cd $PROJECT_DIR
rm src/assets/i18n/*-${version}.json
git add package.json src/assets/manifest.json android/app/build.gradle android/app/src/main/AndroidManifest.xml install.sh
git commit -m ''"$description"''
# finishing release with:
# -F: fetch master & develop before
# -m: use default message
# -p: push all tags after finish
export GIT_MERGE_AUTOEDIT=no
git flow release finish -F -p "$version" -m ''"$description"''
unset GIT_MERGE_AUTOEDIT
