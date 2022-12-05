# PREPARE STAGE
ARG IMAGE_REGISTRY
ARG DOCKER_IMAGE="node:14-slim"
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
RUN npm install -g npm @ionic/cli @angular/cli
# Install project dependencies
RUN npm install --unsafe-perm

RUN ls -artl

RUN apt update && \
    apt -y install git zip curl

WORKDIR /build
