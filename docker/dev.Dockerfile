# Imagem de desenvolvimento: Node 22 + pnpm. O código entra por volume.
FROM node:22-alpine
RUN npm install -g pnpm@9.15.0
WORKDIR /app
USER node
