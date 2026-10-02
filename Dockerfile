# Builds the React client and the Express API into one production image.
FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci
COPY backend/package*.json ./backend/
RUN npm --prefix backend ci
COPY . .
RUN npm --prefix backend run prisma:generate && npm run build && npm --prefix backend run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/backend/package*.json ./backend/
COPY --from=build /app/backend/node_modules ./backend/node_modules
COPY --from=build /app/backend/prisma ./backend/prisma
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/dist ./dist
WORKDIR /app/backend
EXPOSE 3001
CMD ["node", "dist/server.js"]
