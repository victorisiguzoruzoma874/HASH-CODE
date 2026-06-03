FROM node:20-slim

WORKDIR /app

# Install dependencies (including devDeps for TypeScript build)
COPY package.json package-lock.json* ./
RUN npm install

# Copy source and compile
COPY . .
RUN npx prisma generate
RUN npm run build

# Expose and start
EXPOSE 4000
CMD ["node", "dist/index.js"]
