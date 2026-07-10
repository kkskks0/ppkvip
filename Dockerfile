# 排排看 - 肝胆净化AI分析系统
FROM node:20-slim

WORKDIR /app

# Copy server
COPY server/package.json server/package-lock.json* ./server/
RUN cd server && npm install --production && npm install tsx @prisma/client

COPY server/prisma/ ./server/prisma/
COPY server/src/ ./server/src/
COPY server/tsconfig.json ./server/
COPY server/.env ./server/

# Generate Prisma client and copy existing database
RUN cd server && npx prisma generate

# Copy frontend dist (pre-built locally)
COPY dist/ ./dist/

# Expose port
EXPOSE 3001

# Start
CMD ["npx", "tsx", "server/src/index.ts"]
