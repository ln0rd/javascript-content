FROM node:14.17.3-alpine

ARG GITHUB_TOKEN

RUN apk add --update --no-cache \
    tini

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

WORKDIR /home/node/app

COPY .npmrc ./
COPY package*.json ./
COPY tsconfig*.json ./
COPY src ./src
COPY config ./config

USER node

RUN npm install

RUN npm run build

RUN npm prune --production

COPY --chown=node:node . .

ENV NODE_PATH=dist/src

USER node

ENTRYPOINT ["/sbin/tini", "-g", "--"]
CMD ["node", "dist/src/index.js"]


