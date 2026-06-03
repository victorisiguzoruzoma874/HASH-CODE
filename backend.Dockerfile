FROM node:20-slim

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies from backend package.json
COPY backend/package.json ./
RUN npm install

# Copy backend source
COPY backend/ ./

# Generate Prisma client and compile TypeScript
RUN npx prisma generate
RUN npm run build

EXPOSE 4000

CMD ["node", "dist/index.js"]
