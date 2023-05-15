#!/bin/bash

# Get to the root project
if [[ "_" == "_${PROJECT_DIR}" ]]; then
  SCRIPT_DIR=$(dirname $0)
  PROJECT_DIR=$(cd ${SCRIPT_DIR}/.. && pwd)
  export PROJECT_DIR
fi;

# Preparing Android environment
cd ${PROJECT_DIR}
source ${PROJECT_DIR}/scripts/env-global.sh

### Variables
task=$1
release_description=$2

### Control that the script is run on `dev` branch
branch=$(git rev-parse --abbrev-ref HEAD)
if [[ ! "$branch" = "master" ]] && [[ ! "$branch" = "develop" ]] && [[ ! "$branch" =~ ^release/[0-9]+.[0-9]+.[0-9]+(-(alpha|beta|rc)[0-9]+)?$ ]];
then
  echo ">> This script must be run under \`master\` or a \`release\` branch"
  exit 1
fi

### Get version to release
version=$(grep -m1 -P "version\": \"\d+.\d+.\d+(-\w+[0-9]+)?" package.json | grep -oP "\d+.\d+.\d+(-\w+[0-9]+)?")
if [[ "_$version" == "_" ]]; then
  echo "ERROR: Unable to read 'version' in the file 'package.json'."
  echo " - Make sure the file 'package.json' exists and is readable."
  echo " - Check version format is: x.y.z (x and y should be an integer)"
  exit 1
fi

# Compute description, if missing
description=`echo $release_description` # force quote interpretation
if [[ "_${description}" == "_" ]]; then
    description="Release $version"
fi

echo "Sending v$version extension to Github..."

###  get auth token
if [[ "_${GITHUB_TOKEN}" == "_" ]]; then
    # Get it from user config dir
    GITHUB_TOKEN=$(cat ~/.config/${PROJECT_NAME}/.github)
fi
if [[ "_${GITHUB_TOKEN}" != "_" ]]; then
    GITHUT_AUTH="Authorization: token ${GITHUB_TOKEN}"
else
    echo "ERROR: Unable to find github authentication token file: "
    echo " - You can create such a token at https://github.com/settings/tokens > 'Generate a new token'."
    echo " - [if CI] Add a pipeline variable named 'GITHUB_TOKEN';"
    echo " - [else] Or copy/paste the token into the file '~/.config/${PROJECT_NAME}/.github'."
    exit 1
fi

### check arguments
case "$task" in
  del)
    result=`curl -i "$REPO_API_URL/releases/tags/$version"`
    release_url=`echo "$result" | grep -P "\"url\": \"[^\"]+"  | grep -oP "$REPO_API_URL/releases/\d+"`
    if [[ $release_url != "" ]]; then
        echo "Deleting existing release..."
        curl -H ''"$GITHUT_AUTH"'' -XDELETE $release_url
    fi
    exit 0;
  ;;

  pre|rel)

    if [[ "${task}" = "pre" ]]; then
      prerelease="true"
    else
      prerelease="false"
    fi

    result=$(curl -s -H ''"$GITHUT_AUTH"'' "$REPO_API_URL/releases/tags/$version")
    release_url=$(echo "$result" | grep -P "\"url\": \"[^\"]+" | grep -oP "https://[A-Za-z0-9/.-]+/releases/\d+")
    if [[ "_$release_url" != "_" ]]; then
      echo "Deleting existing release... $release_url"
      result=$(curl -H ''"$GITHUT_AUTH"'' -s -XDELETE $release_url)
      if [[ "_$result" != "_" ]]; then
          error_message=$(echo "$result" | grep -P "\"message\": \"[^\"]+" | grep -oP ": \"[^\"]+\"")
          echo "Delete existing release failed with error $error_message"
          exit 1
      fi
    else
      echo "Release not exists yet on github."
    fi

    echo "Creating new release..."
    echo " - tag: $version"
    echo " - description: $description"
    result=`curl -X POST -H ''"$GITHUT_AUTH"'' -s $REPO_API_URL/releases -d '{"tag_name": "'"$version"'","target_commitish": "master","name": "'"$version"'","body": "'"$description"'","draft": false,"prerelease": '"$prerelease"'}'`
    upload_url=`echo "$result" | grep -P "\"upload_url\": \"[^\"]+"  | grep -oP "https://[A-Za-z0-9/.-]+"`

    if [[ "_$upload_url" = "_" ]]; then
      echo "Failed to create new release for repo $REPO."
      echo "Server response:"
      echo "$result"
      exit 1
    fi

    ###  Sending files
    echo "Uploading files to ${upload_url} ..."

    ZIP_FILE="${PROJECT_DIR}/dist/${PROJECT_NAME}.zip"
    if [[ -f "${ZIP_FILE}" ]]; then
      artifact_name="${PROJECT_NAME}-${version}-web.zip"
      result=$(curl -s -H ''"$GITHUT_AUTH"'' -H 'Content-Type: application/zip' -T "${ZIP_FILE}" "${upload_url}?name=${artifact_name}")
      browser_download_url=$(echo "$result" | grep -P "\"browser_download_url\":[ ]?\"[^\"]+" | grep -oP "\"browser_download_url\":[ ]?\"[^\"]+"  | grep -oP "https://[A-Za-z0-9/.-]+")
      ZIP_SHA256=$(sha256sum "${ZIP_FILE}" | sed 's/ /\n/gi' | head -n 1)
      echo " - ${browser_download_url}  | SHA256 Checksum: ${ZIP_SHA256}"
      echo "${ZIP_SHA256}  ${artifact_name}" > "${ZIP_FILE}.sha256"
      result=$(curl -s -H ''"$GITHUT_AUTH"'' -H 'Content-Type: text/plain' -T "${ZIP_FILE}.sha256" "${upload_url}?name=${artifact_name}.sha256")
    else
      echo " - ERROR: Web release (ZIP) not found! Skipping."
      missing_file=true
    fi

    APK_FILE="${ANDROID_OUTPUT_APK_RELEASE}/${ANDROID_OUTPUT_APK_PREFIX}-release-signed.apk"
    if [[ -f "${APK_FILE}" ]]; then
      artifact_name="${PROJECT_NAME}-${version}-android.apk"
      result=$(curl -s -H ''"$GITHUT_AUTH"'' -H 'Content-Type: application/vnd.android.package-archive' -T "${APK_FILE}" "${upload_url}?name=${artifact_name}")
      browser_download_url=$(echo "$result" | grep -P "\"browser_download_url\":[ ]?\"[^\"]+" | grep -oP "\"browser_download_url\":[ ]?\"[^\"]+"  | grep -oP "https://[A-Za-z0-9/.-]+")
      APK_SHA256=$(sha256sum "${APK_FILE}" | sed 's/ /\n/gi' | head -n 1)
      echo " - ${browser_download_url}  | SHA256 Checksum: ${APK_SHA256}"
      echo "${APK_SHA256}  ${artifact_name}" > "${APK_FILE}.sha256"
      result=$(curl -s -H ''"$GITHUT_AUTH"'' -H 'Content-Type: text/plain' -T "${APK_FILE}.sha256" "${upload_url}?name=${artifact_name}.sha256")
    else
      echo "- ERROR: Android release (APK) not found! Skipping."
      missing_file=true
    fi

    if [[ ${missing_file} == true ]]; then
      echo "-------------------------------------------"
      echo "ERROR: missing some artifacts (see logs)"
      echo " -> Release url: ${REPO_PUBLIC_URL}/releases/tag/${version}"
      exit 1
    else
      echo "-------------------------------------------"
      echo "Successfully uploading files !"
      echo " -> Release url: ${REPO_PUBLIC_URL}/releases/tag/${version}"
      exit 0
    fi

    ;;
  *)
    echo "Wrong arguments"
    echo "Usage:"
    echo " > ./release-to-github.sh del|pre|rel <release_description>"
    echo "With:"
    echo " - del: delete existing release"
    echo " - pre: use for pre-release"
    echo " - rel: for full release"
    exit 1
    ;;
esac
