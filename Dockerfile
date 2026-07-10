# 排排看 - 肝胆净化AI分析系统
FROM node:20-bullseye-slim

WORKDIR /app

# Copy server
COPY server/package.json server/package-lock.json* ./server/
RUN cd server && npm install --production && npm install tsx @prisma/client

COPY server/prisma/ ./server/prisma/
COPY server/src/ ./server/src/
COPY server/tsconfig.json ./server/
COPY server/.env ./server/

# Copy database to Prisma's expected location (./dev.db relative to schema)
COPY server/dev.db ./server/prisma/dev.db

# Generate Prisma client
RUN cd server && npx prisma generate

# Copy frontend dist (pre-built locally)
COPY dist/ ./dist/

# Expose port
EXPOSE 3001

# Start - tsx is installed in server/node_modules
CMD ["./server/node_modules/.bin/tsx", "server/src/index.ts"]
