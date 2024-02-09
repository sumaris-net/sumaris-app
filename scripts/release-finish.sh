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
# Get the version, if missing
if [[ "_${version}" == "_" ]]; then
  version=$(grep -oP "version\": \"\d+.\d+.\d+(-(alpha|beta|rc)[0-9]+)?" package.json | grep -m 1 -oP "\d+.\d+.\d+(-(alpha|beta|rc)[0-9]+)?")
fi

if [[ -n $2 ]]; then
    release_branch=$2
else
    release_branch="develop"
fi

# Check version format
if [[ ! $version =~ ^[0-9]+\.[0-9]+\.[0-9]+(-(alpha|beta|rc)[0-9]+)?$ ]]; then
  echo "Wrong version format"
  echo "Usage:"
  echo " > ./release-finish.sh <version> <release_branch>"
  echo "with:"
  echo " - version: x.y.z"
  echo " - release_branch: source branch"
  exit 1
fi

### Control that the script is run on `release` branch
branch=`git rev-parse --abbrev-ref HEAD`
if [[ ! "$branch" = "release/$version" ]]
then
  echo ">> This script must be run under \`release/$version\` branch"
  exit 1
fi

cd $PROJECT_DIR
rm src/assets/i18n/*-${version}.json

# Add updated files
git add .
git commit -m "Prepare release ${version}"

# Finish using git flow
if [[ "$branch" = "develop" ]]; then
  # finishing release with:
  # -F: fetch master & develop before
  # -m: use default message
  # -p: push all tags after finish
  export GIT_MERGE_AUTOEDIT=no
  git flow release finish -F -p "${version}" -m "Release ${version}"
  unset GIT_MERGE_AUTOEDIT
  # Finish from a feature branch (do NOT use git flow)
elif [[ "$release_branch" =~ ^features?/.* ]]; then
  git checkout "$release_branch"
  git merge --no-ff --no-edit -m "Release ${version}" "release/${version}"
  git tag -a "${version}" -m "${version}"
  git push origin "$release_branch"
  git push --tags
  git branch -D "release/${version}"
fi

