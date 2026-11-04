FROM node:24-alpine AS builder
WORKDIR /app
COPY package.json ./
# Ubah npm ci menjadi npm install --no-package-lock
RUN npm install --no-package-lock
COPY . .
RUN npm run build:web

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
