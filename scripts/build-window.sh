#!/bin/bash

source $(dirname $0)/inc-common.sh
source $(dirname $0)/inc-nwjs.sh

BUILD_DIR="${PROJECT_DIR}/target/windows/"
MK_PACKAGE_DIR="${BUILD_DIR}/mk_package/"

NWJS_VERSION="0.83.0"
NWJS_PLATFORM="win-x64"
NWJS_ARCHIVE="$(f_compute_nwjs_archive_name ${NWJS_VERSION} ${NWJS_PLATFORM})"
NWJS_DOWNLOAD_URL="$(f_compute_nwjs_download_url ${NWJS_VERSION} ${NWJS_ARCHIVE})"

NSIS_RESOURCES_DIR="${PROJECT_DIR}/resources/windows/nsis/"

f_check_deps() {
  local missing=0

  if [ -z "$(which curl)" ] ; then
    f_msg E "\"curl\" is missing : install it with \"apt install curl\""
    missing=1
  fi

  if [ -z "$(which unzip)" ] ; then
    f_msg E "\"unzip\" is missing : install it with \"apt install unzip\""
    missing=1
  fi

  if [ -z "$(which sed)" ] ; then
    f_msg E "\"sed\" is missing : install it with \"apt install sed\""
    missing=1
  fi

  if [ -z "$(which git)" ] ; then
    f_msg E "\"git\" is missing : install it with \"apt install git\""
    missing=1
  fi

  if [ -z "$(which npm)" ] ; then
    f_msg E "\"npm\" is missing : install it with \"apt install npm\""
    missing=1
  fi

  if [ -z "$(which makensis)" ] ; then
    f_msg E "\"makensis\" is missing : install it with \"apt install nsis\""
    missing=1
  fi

  [ "${missing}" -gt 0 ] && exit 1
}

f_prepare_package_dir() {
  set -e

  [ -d "${MK_PACKAGE_DIR}" ] && rm -r "${MK_PACKAGE_DIR}"
  mkdir -v "${MK_PACKAGE_DIR}"

  set +e

  f_setup_sumaris
  f_setup_splash_and_icons
  f_retrieve_nwjs
  f_setup_nwjs
  f_setup_nsis
}

f_setup_sumaris() {
  f_msg I "Setup SUMARiS"
  set -e
  if [ ! -d "${PROJECT_DIR}/www/" ] ; then
    npm run build:prod
  fi

  [ -d "${MK_PACKAGE_DIR}/www" ] && rm -r "${MK_PACKAGE_DIR}/www"

  cp -a "${PROJECT_DIR}/www/" "${MK_PACKAGE_DIR}/www/"
  sed -i "s/\(<base[[:space:]]\+href=\"\)\\/\(\"[[:space:]]*>\)/\1\\/www\\/\2/" "${MK_PACKAGE_DIR}/www/index.html"
  set +e
}

f_setup_splash_and_icons() {
  set -e
  cp "${SPLASH_IMG}" "${MK_PACKAGE_DIR}/splash.png"
  cp "${ICON_IMG}" "${MK_PACKAGE_DIR}/icon.png"
  set +e
}

f_retrieve_nwjs() {
  f_msg I "Setup nwjs"
  if [ ! -f "${BUILD_DIR}/${NWJS_ARCHIVE}" ] ; then
    f_msg I "Download nwjs archive : ${NWJS_ARCHIVE} ..."
    if ! curl --silent --show-error "${NWJS_DOWNLOAD_URL}" -o "${BUILD_DIR}/${NWJS_ARCHIVE}" ; then
      f_msg E "Can not download nwjs at \"${NWJS_DOWNLOAD_URL}\""
      exit 1
    fi
  else
    f_msg I "nwjs archive \"${NWJS_ARCHIVE}\" already present."
  fi

  if [ ! -d "${BUILD_DIR}/${NWJS_ARCHIVE%.zip}" ] ; then
    f_msg I "Extract nwjs archive : ${NWJS_ARCHIVE} ..."
    if ! unzip -q "${BUILD_DIR}/${NWJS_ARCHIVE}" -d "${BUILD_DIR}" ; then
      f_msg E "Can not extract nwjs archive \"${BUILD_DIR}/${NWJS_ARCHIVE}\" in \"${BUILD_DIR}\""
      exit 1
    fi
  else
    f_msg I "nwjs archive \"${NWJS_ARCHIVE}\" already extracted."
  fi
}

f_setup_nsis() {
  set -e
  f_msg I "Setup nsis"
  f_substitute_app_vars "${NSIS_RESOURCES_DIR}/installer-config.nsi" "${MK_PACKAGE_DIR}/installer-config.nsi"
  cp "${NSIS_RESOURCES_DIR}/icon.ico" "${MK_PACKAGE_DIR}"
  cp "${PROJECT_DIR}/LICENSE" "${MK_PACKAGE_DIR}/LICENSE.txt"
  set +e
}

f_create_package() {
  set -e
  pushd "${MK_PACKAGE_DIR}"
  f_msg I "Build exe installer"
  makensis installer-config.nsi
  popd
  set +e
}

[ -d "${BUILD_DIR}" ] || mkdir -p -v "${BUILD_DIR}"

f_check_deps
f_prepare_package_dir
f_create_package
