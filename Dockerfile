FROM node:20-bookworm-slim AS build
WORKDIR /app

# Vite bakt VITE_-Variablen zur BUILD-Zeit in den Bundle ein, nicht erst beim
# Container-Start – deshalb hier als Build-Arg statt als Laufzeit-Umgebungsvariable.
ARG VITE_STRAPI_URL
ENV VITE_STRAPI_URL=$VITE_STRAPI_URL

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
