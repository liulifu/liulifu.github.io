# Static site image for liulifu.github.io
FROM nginx:alpine
LABEL maintainer="augment-agent" org.opencontainers.image.title="liulifu.github.io"
# Copy static assets
COPY . /usr/share/nginx/html
# Healthcheck for index.html
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

