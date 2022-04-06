ARG IMAGE_REGISTRY
ARG DOCKER_IMAGE="node:12-slim"
FROM $IMAGE_REGISTRY$DOCKER_IMAGE
ENV CACHE_DIR=/tmp/.build-cache

# Use a cache dir
WORKDIR ${CACHE_DIR}

# Copy need files, to check deps
COPY ./package.json ./
# COPY ./yarn.lock ./ FIXME : comment to fix pipeline
COPY ./scripts/ci/*.sh scripts/ci/

# Store disk usage (before install)
RUN du -s `find . -maxdepth 1 | egrep -v "^\.$"` > /tmp/before.txt
RUN du -s `find /tmp/.cache/yarn -maxdepth 1 | egrep -v "^\.$"` >> /tmp/before.txt

# Install global dependencies
RUN yarn global add @ionic/cli @angular/cli

# Install project dependencies
RUN yarn install

# Store disk usage (after install)
RUN du -s `find . -maxdepth 1 | egrep -v "^\.$"` > /tmp/after.txt
RUN du -s `find /tmp/.cache/yarn -maxdepth 1 | egrep -v "^\.$"` >> /tmp/after.txt

# Force docker to detect any changes
RUN diff /tmp/before.txt /tmp/after.txt || true

# Store dependencies (to be able to check it the 'build' task)
RUN cd scripts/ci && ./dependencies.sh store ${CACHE_DIR}

RUN apt update && \
    apt -y install git

WORKDIR /build
