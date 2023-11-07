#!/bin/bash

SCRIPT_DIR=$(dirname $0)
BASEDIR=$(cd "${SCRIPT_DIR}" && pwd -P)

VERSION=$1
PORT=$2
DEFAULT_VERSION=develop
DEFAULT_PORT=8182
CONFIG_DIR=${BASEDIR}/config
ENV_DIR=${CONFIG_DIR}/environments

[[ "_${VERSION}" = "_" ]] && VERSION=${DEFAULT_VERSION}
[[ "_${PORT}" = "_" && "${VERSION}" = "${DEFAULT_VERSION}" ]] && PORT=${DEFAULT_PORT}

CI_REGISTRY=gitlab-registry.ifremer.fr
CI_PROJECT_NAME=sumaris-app
CI_PROJECT_PATH=sih-public/sumaris/sumaris-app
CI_REGISTRY_IMAGE_PATH=${CI_REGISTRY}/${CI_PROJECT_PATH}
CI_REGISTER_USER=gitlab+deploy-token
CI_REGISTER_PWD=# TODO <REPLACE_WITH_DEPLOY_TOKEN>
CI_REGISTRY_IMAGE=${CI_REGISTRY_IMAGE_PATH}:${VERSION}
CONTAINER_PREFIX="${CI_PROJECT_NAME}-${PORT}"
CONTAINER_NAME="${CONTAINER_PREFIX}-${VERSION}"

# Check arguments
#if [[ (! $VERSION =~ ^[0-9]+.[0-9]+.[0-9]+(-(alpha|beta|rc|SNAPSHOT)[-0-9]*)?$ && $VERSION != 'imagine' ) ]]; then
#  echo "ERROR: Invalid version"
#  echo " Usage: $0 <version> <port>"
#  exit 1
#fi
if [[ (! $PORT =~ ^[0-9]+$ ) ]]; then
  echo "ERROR: Invalid port"
  echo " Usage: $0 <version> <port>"
  exit 1
fi
# Check if config exists
if [[ ! -d "${CONFIG_DIR}" ]]; then
  echo "ERROR: Config directory not found: '${CONFIG}'"
  exit 1
fi
if [[ ! -d "${ENV_DIR}" ]]; then
  echo "ERROR: Environments directory not found: '${ENV_DIR}'"
  exit 1
fi
if [[ ! -f "${ENV_DIR}/environment.json" ]]; then
  echo "ERROR: Environments directory not found: '${ENV_DIR}'"
  exit 1
fi
echo "---- Starting ${CI_PROJECT_NAME} v${APP_VERSION} on port ${PORT}"
echo ""

## Login to container registry
echo "Login to ${CI_REGISTRY}..."
docker login -u "${CI_REGISTER_USER}" -p "${CI_REGISTER_PWD}" ${CI_REGISTRY}
[[ $? -ne 0 ]] && exit 1

# Pull the expected image
echo "Pulling image ${CI_REGISTRY_IMAGE}"
docker pull ${CI_REGISTRY_IMAGE}
[[ $? -ne 0 ]] && exit 1

# Logout from container registry
docker logout ${CI_REGISTRY}

# Stop existing container
if [[ ! -z  $(docker ps -f name=${CONTAINER_PREFIX} -q) ]]; then
  echo "Stopping running instance..."
  docker stop $(docker ps -f name=${CONTAINER_PREFIX} -q)
fi

# Waiting container really removed
sleep 2

docker run -it -d --rm \
           --name "${CONTAINER_NAME}" \
           --memory 512m \
           -p ${PORT}:8080 \
           -v ${ENV_DIR}:/usr/share/nginx/html/assets/environments \
           -e PORT=${PORT} \
           -e TZ=Europe/Paris \
           ${CI_REGISTRY_IMAGE}

echo "---- ${CI_PROJECT_NAME} is running !"
echo ""
echo " Available commands:"
echo "    logs: docker logs -f ${CONTAINER_NAME}"
echo "    bash: docker exec -it ${CONTAINER_NAME} bash"
echo "    stop: docker stop ${CONTAINER_NAME}"
echo "  status: docker ps -a ${CONTAINER_NAME}"
