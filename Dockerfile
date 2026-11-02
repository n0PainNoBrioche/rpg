# --- Build : frontend (Vite) + backend (tsc)
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- Runtime
FROM node:22-alpine
ENV NODE_ENV=production \
    PORT=8080 \
    SAVES_DIR=/app/data/saves
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server
RUN mkdir -p /app/data/saves
VOLUME /app/data/saves
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://127.0.0.1:8080/api/health || exit 1
CMD ["node", "dist-server/server/index.js"]
