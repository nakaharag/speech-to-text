FROM node:22-alpine

# Install FFmpeg for audio conversion
RUN apk add --no-cache ffmpeg

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile || pnpm install

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Create data directories
RUN mkdir -p data/shares data/rate-limits

EXPOSE 3000

CMD ["pnpm", "run", "start:prod"]
