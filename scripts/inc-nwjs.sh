f_compute_nwjs_archive_name() {
  local version="${1}"
  local platforme="${2}"

  local file_ext=$([[ "${platforme}" =~ ^linux ]] && echo 'tar.gz' || echo 'zip')

  echo "nwjs-v${version}-${platforme}.${file_ext}"
}

f_compute_nwjs_download_url() {
  local version="${1}"
  local archive="${2}"

  echo "https://dl.nwjs.io/v${version}/${archive}"
}

f_setup_nwjs() {
  f_msg I "Setup nwjs"
  set -e
  cp -a "${BUILD_DIR}/${NWJS_ARCHIVE%.zip}/"* "${MK_PACKAGE_DIR}"

  f_substitute_app_vars "${DESKTOP_RESOURCES_DIR}/package.json" "${MK_PACKAGE_DIR}/package.json"
  f_substitute_app_vars "${DESKTOP_RESOURCES_DIR}/desktop.js" "${MK_PACKAGE_DIR}/desktop.js"
  f_substitute_app_vars "${DESKTOP_RESOURCES_DIR}/splash.html" "${MK_PACKAGE_DIR}/splash.html"

  if [ -f "${MK_PACKAGE_DIR}/nw.exe" ] ; then
    mv -v "${MK_PACKAGE_DIR}/nw.exe" "${MK_PACKAGE_DIR}/${APP_ID}.exe"
  else
    mv -v "${MK_PACKAGE_DIR}/nw" "${MK_PACKAGE_DIR}/${APP_ID}"
  fi

  pushd "${MK_PACKAGE_DIR}"
  npm install
  popd
  set +e
}
