# PREPARE STAGE
ARG IMAGE_REGISTRY
ARG DOCKER_IMAGE="node:16-slim"
ARG IONIC_CLI_VERSION="~7.1.1"
ARG ANGULAR_CLI_VERSION="~14.2.12"
ARG NPM_VERSION="~9.6.6"
FROM $IMAGE_REGISTRY$DOCKER_IMAGE AS prepare
FROM $DOCKER_IMAGE AS prepare
ARG CACHE_DIR=/tmp/.build-cache

# Use a cache dir
WORKDIR $CACHE_DIR
# Copy need files, to check deps
COPY package.json .
# set version to 0.0.0 in order not to upload dependencies if only version change
RUN sed -i 's/version\": \".*\"/version\": \"0.0.0\"/g' package.json

# BUILD STAGE
FROM $IMAGE_REGISTRY$DOCKER_IMAGE AS build
ARG CACHE_DIR=/tmp/.build-cache
WORKDIR $CACHE_DIR

# Caching npm depedencies
COPY --from=prepare $CACHE_DIR/package.json .
# Install global dependencies
RUN npm install -g npm@$NPM_VERSION @ionic/cli@$IONIC_CLI_VERSION @angular/cli@$ANGULAR_CLI_VERSION
# Install project dependencies
RUN npm install --unsafe-perm --force

RUN ls -artl

RUN apt update && \
    apt -y install git zip curl

WORKDIR /build
