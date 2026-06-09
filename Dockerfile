FROM ngosang/amule:3.0.0-1 AS amule
ENV PUID=1000
ENV PGID=1000
ENV GUI_PWD=secret
ENV WEBUI_PWD=secret
ENV MOD_AUTO_RESTART_ENABLED=true
ENV MOD_AUTO_RESTART_CRON="0 6 * * *"
ENV MOD_AUTO_SHARE_ENABLED=true
ENV MOD_AUTO_SHARE_DIRECTORIES=/shared;/downloads/complete
RUN mkdir -p /shared
RUN mkdir -p /downloads/complete
RUN mkdir -p /config-base/amule
COPY ./src/amule/api.php /usr/share/amule/webserver/default/api.php
COPY ./src/amule/amule.conf /config-base/amule/amule.conf
RUN mkdir -p /config/amule
RUN ln -s /config/amule /home/amule/.aMule

FROM node:23-bookworm AS build
RUN mkdir /app
WORKDIR /app
ADD ./src/package.json ./src/package-lock.json ./
RUN npm ci --production=false
ADD ./src ./
RUN npm run build

FROM amule
ARG IMG_VER
ENV IMG_VER=${IMG_VER}
USER root
RUN apt-get update && apt-get install -y --no-install-recommends \
    nodejs npm python3 \
    && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
ENV PORT=3000
ENV ED2K_PORT=4662
ENV LOG_LEVEL=info
ENV PASSWORD=
RUN mkdir -p /emulerr
WORKDIR /emulerr
ADD ./src/package.json ./src/package-lock.json ./
RUN npm ci --production=true
COPY --from=build /app/build ./build
COPY --from=build /app/server.js ./server.js
COPY ./src/entrypoint.sh /home/entrypoint.sh
ENTRYPOINT ["/bin/bash", "/home/entrypoint.sh"]
COPY ./src/healthcheck.sh /home/healthcheck.sh
HEALTHCHECK --interval=20s CMD bash "/home/healthcheck.sh"
