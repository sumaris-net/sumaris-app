#!/bin/bash
# Get to the root project
if [[ "_" == "_${PROJECT_DIR}" ]]; then
  SCRIPT_DIR=$(dirname $0)
  PROJECT_DIR=$(cd "${SCRIPT_DIR}/.." && pwd)
  export PROJECT_DIR
fi;

cd ${PROJECT_DIR}

# Read parameters
version=$1
release_description=$2

PROJECT_DIR=`pwd`

# Check version format
if [[ ! $version =~ ^[0-9]+.[0-9]+.[0-9]+(-(alpha|beta|rc)[0-9]+)?$ ]]; then
  echo "Wrong version format"
  echo "Usage:"
  echo " > ./release-gitflow-finish.sh <version> <release_description>"
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

description="Release $version"
if [[ ! "_$release_description" == "_" ]]; then
  description="$description : $release_description"
fi

# finishing release
cd $PROJECT_DIR
rm src/assets/i18n/*-${version}.json
git add package.json src/assets/manifest.json config.xml install.sh
git commit -m "$description"
git flow release finish -p -n "$version"
if [[ $? -ne 0 ]]; then
    exit 1
fi
