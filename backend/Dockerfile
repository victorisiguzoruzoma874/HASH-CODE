FROM node:20-bullseye-slim

# Install OpenSSL 1.1.x (available on Debian 11 bullseye)
RUN apt-get update && apt-get install -y openssl libssl-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install

# Copy source with prisma schema that has binaryTargets
COPY . .

# Generate Prisma client with correct engine binary
RUN npx prisma generate

# Compile TypeScript
RUN npm run build

EXPOSE 4000

CMD ["node", "dist/index.js"]
