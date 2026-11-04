FROM node:20-alpine AS frontend-builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy semua file manifest & config pnpm (termasuk .npmrc jika ada)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* .npmrc* ./

# Gunakan flag --config.ignore-scripts=true agar pnpm tidak mengeksekusi/memvalidasi build script
RUN pnpm install --frozen-lockfile --config.ignore-scripts=true

COPY . .
RUN pnpm run build

# Stage 2: Production Environment (PHP + Nginx + Python/yt-dlp + Supervisord)
FROM php:8.3-fpm-alpine

# Install Supervisor, Nginx, Python3, FFmpeg, dan yt-dlp
RUN apk add --no-cache \
    supervisor \
    nginx \
    python3 \
    py3-pip \
    ffmpeg \
    curl \
    && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /var/www/html

# Copy hasil build frontend ke dist/
COPY --from=frontend-builder /app/dist ./dist

# Copy backend Laravel & Konfigurasi Nginx & Supervisord
COPY backend ./backend
COPY nginx.conf /etc/nginx/nginx.conf
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Setup permission storage & cache Laravel
RUN chown -R www-data:www-data /var/www/html/backend/storage /var/www/html/backend/bootstrap/cache

EXPOSE 80

# Jalankan Supervisord sebagai PID 1
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
