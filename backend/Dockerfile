FROM node:22-slim

# Install FFmpeg for audio conversion, OpenSSL for Prisma, wget for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    openssl \
    wget \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Copy prisma schema for generation
COPY prisma ./prisma/

# Install dependencies
RUN pnpm install

# Generate Prisma client
RUN pnpm prisma generate

# Copy source code
COPY . .

# Create data directories (legacy)
RUN mkdir -p data/shares data/rate-limits

EXPOSE 3000

# Build for production if NODE_ENV=production, otherwise just run dev
CMD ["sh", "-c", "pnpm prisma migrate deploy && if [ \"$NODE_ENV\" = 'production' ]; then pnpm run build && pnpm run start:prod; else pnpm run start:dev; fi"]
