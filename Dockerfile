# Stage 1: Build Frontend (Menggunakan Node.js 24)
FROM node:24-alpine AS frontend-builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy manifest & config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* .npmrc* ./

# Install dependencies tanpa running build scripts yang diblokir
RUN pnpm install --frozen-lockfile --config.ignore-scripts=true

COPY . .

# Jalankan build khusus web (tanpa cap sync) untuk deployment server
RUN pnpm run build:web

# Stage 2: Production Environment (PHP + Nginx + Python/yt-dlp + Supervisord)
FROM php:8.3-fpm-alpine

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

# Copy hasil build frontend dari stage 1 ke dist
COPY --from=frontend-builder /app/dist ./dist

# Copy backend Laravel & Konfigurasi
COPY backend ./backend
COPY nginx.conf /etc/nginx/nginx.conf
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

RUN chown -R www-data:www-data /var/www/html/backend/storage /var/www/html/backend/bootstrap/cache

EXPOSE 80

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
