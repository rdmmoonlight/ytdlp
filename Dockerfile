# Stage 1: Build Frontend (Node.js 24)
FROM node:24-alpine AS frontend-builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy manifest & config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* .npmrc* ./

# Install dependencies frontend
RUN pnpm install --frozen-lockfile --config.ignore-scripts=true

COPY . .
RUN pnpm run build:web

# Stage 2: Production Environment (PHP 8.4 + Nginx + Python/yt-dlp + Composer + Supervisord)
FROM php:8.4-fpm-alpine

# Install tools, Composer, Nginx, Python3, FFmpeg, dan yt-dlp
RUN apk add --no-cache \
    supervisor \
    nginx \
    python3 \
    py3-pip \
    ffmpeg \
    curl \
    git \
    unzip \
    && curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer \
    && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /var/www/html

# Copy hasil build frontend ke dist/
COPY --from=frontend-builder /app/dist ./dist

# Copy backend Laravel & Konfigurasi
COPY backend ./backend
COPY nginx.conf /etc/nginx/nginx.conf
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Install dependensi Laravel (Composer)
RUN cd /var/www/html/backend && \
    composer install --no-dev --optimize-autoloader --no-interaction

# Setup permission storage & cache Laravel
RUN chown -R www-data:www-data /var/www/html/backend/storage /var/www/html/backend/bootstrap/cache

EXPOSE 80

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
