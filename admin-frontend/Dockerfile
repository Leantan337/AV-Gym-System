# Multi-stage build for React - Stage 1: Build
FROM node:18-alpine as builder

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies with production flag and clean cache
RUN npm ci --only=production --silent \
    && npm cache clean --force

# Copy source code
COPY . .

# Build the React app with production optimizations
RUN npm run build \
    && rm -rf node_modules

# Stage 2: Minimal runtime with nginx
FROM nginx:alpine

# Install minimal tools for health checks
RUN apk add --no-cache wget

# Copy custom nginx configuration for optimization
COPY nginx.prod.conf /etc/nginx/nginx.conf

# Copy built React app from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Create non-root user for security
RUN addgroup -g 1001 -S nginx-user \
    && adduser -S -D -H -u 1001 -h /var/cache/nginx -s /sbin/nologin -G nginx-user -g nginx-user nginx-user

# Set proper permissions
RUN chown -R nginx-user:nginx-user /usr/share/nginx/html \
    && chown -R nginx-user:nginx-user /var/cache/nginx \
    && chown -R nginx-user:nginx-user /var/log/nginx \
    && chown -R nginx-user:nginx-user /etc/nginx/conf.d

# Switch to non-root user
USER nginx-user

EXPOSE 80

# Start nginx with minimal configuration
CMD ["nginx", "-g", "daemon off;"] 