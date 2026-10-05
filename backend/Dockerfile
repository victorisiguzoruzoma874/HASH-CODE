FROM node:20-bookworm-slim

# Debian 11 (bullseye) is EOL and its security repo 404s; bookworm ships OpenSSL 3,
# which matches the debian-openssl-3.0.x binaryTarget in prisma/schema.prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

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

CMD ["npm", "start"]
