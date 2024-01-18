f_msg() {
  local type=${1}
  local msg=${2}

  local result

  case "${type}" in
    'I'|'i')
      result="[INFO]"
      ;;
    'W'|'w')
      result="[WARN]"
      ;;
    'E'|'r')
      result="[ERR]"
      ;;
  esac

  echo -e "${result} ${msg}"
}

f_substitute_app_vars() {
  local src="${1}"
  local dest="${2}"
  sed -e "s/##APP_NAME##/${APP_NAME}/g" \
      -e "s/##APP_ID##/${APP_ID}/g" \
      -e "s/##APP_VERSION##/${APP_VERSION}/g" \
      "${src}" > "${dest}"
}

# Set PROJECT_DIR to root of git project if not already set
PROJECT_DIR=${PROJECT_DIR:-"$(git rev-parse --show-toplevel)"}

# Set common app infos
APP_ID="sumaris"
APP_NAME="SUMARiS"
APP_VERSION=$(grep -oP "version\": \"\d+.\d+.\d+(-(alpha|beta|rc)[0-9]+)?" package.json | grep -m 1 -oP "\d+.\d+.\d+(-(alpha|beta|rc)[0-9]+)?")
DESKTOP_RESOURCES_DIR="${PROJECT_DIR}/resources/desktop/"
SPLASH_IMG="${PROJECT_DIR}/resources/desktop/splash.png"
ICON_IMG="${PROJECT_DIR}/resources/desktop/icon.png"
