# API em produção: build com pnpm e imagem final só com o necessário, rodando sem root.
FROM node:22-alpine AS build
RUN npm install -g pnpm@9.15.0
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile \
 && pnpm --filter api build \
 && pnpm --filter api deploy --prod /out \
 && cp -r apps/api/dist /out/dist

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /out ./
# Pasta do save do jogo: criada do node para o volume nomeado herdar o dono.
RUN mkdir -p /data/saves && chown node:node /data/saves
ENV SAVE_DIR=/data/saves
USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
