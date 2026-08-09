FROM node:20-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    libvips-dev \
    git \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends libvips \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/app
ENV NODE_ENV=production

COPY --from=build /opt/app ./
RUN chown -R node:node /opt/app
USER node

EXPOSE 1337
CMD ["npm", "run", "start"]
