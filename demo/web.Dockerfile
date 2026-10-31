# Demo (local): the web client built and served by nginx, which also proxies /api to the backend (same origin).
FROM node:26-slim AS build
RUN npm install -g pnpm@12.16.1
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY index.html tsconfig.json vite.config.ts ./
COPY src ./src
RUN pnpm build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY demo/nginx.conf /etc/nginx/conf.d/default.conf
