FROM nginx:alpine

# Build arg
ARG NGINX_CONF=site.conf
ARG HTML=www
ARG USERNAME="nginx"
ARG GROUPNAME="nginx"

# nginx conf
COPY ${NGINX_CONF} /etc/nginx/conf.d/default.conf
RUN touch /var/run/nginx.pid && \
    chown -R ${USERNAME}:${GROUPNAME} /var/run/nginx.pid && \
    chown -R ${USERNAME}:${GROUPNAME} /var/cache/nginx

# Copy files
COPY --chown=${USERNAME}:${GROUPNAME} ${HTML} /usr/share/nginx/html

USER ${USERNAME}

# Port 80 is reserved for root user
EXPOSE 8080
