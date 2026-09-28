FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine AS runtime

ENV NODE_ENV=production
ENV PORT=8080

WORKDIR /app

COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/server.mjs ./server.mjs
COPY --from=build --chown=node:node /app/src/data/MODEL_FINAL_OUTPUT.json ./src/data/MODEL_FINAL_OUTPUT.json

USER node

EXPOSE 8080

CMD ["node", "server.mjs"]
