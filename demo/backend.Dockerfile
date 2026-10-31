# Demo (local): the backend built from its repository (build context = the backend checkout), plus its simulators.
FROM node:26-slim
RUN npm install -g pnpm@12.16.1
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json tsconfig.build.json ./
RUN pnpm install --frozen-lockfile
COPY src ./src
COPY mocks ./mocks
COPY deploy ./deploy
RUN pnpm build
ENV NODE_ENV=production
CMD ["node", "dist/main.js"]
