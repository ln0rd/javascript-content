FROM node:10.24.1-slim AS build
LABEL maintainer="devs@hash.com.br"
ARG GITHUB_TOKEN
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get autoremove -y && \
    apt-get install -y --no-install-recommends make python tzdata g++ && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
WORKDIR /build
COPY . .
RUN yarn config set workspaces-experimental true && \
    yarn install --production --cache-folder .cache/ && \
    rm -rf .cache && script/build

FROM node:10.24.1-slim
ENV NODE_ENV production
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get autoremove -y && \
    apt-get install -y --no-install-recommends tzdata make procps && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
ADD https://github.com/krallin/tini/releases/download/v0.19.0/tini /tini
RUN chmod +x /tini
EXPOSE 4000
USER node
WORKDIR /home/node
COPY --from=build --chown=node:node /build .
ENTRYPOINT ["/tini", "-g", "--"]
CMD ["script/start"]
