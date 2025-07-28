# Multi-stage build for React - Optimized for production
FROM node:18-alpine as builder

# Set working directory
WORKDIR /app

# Accept build arguments for React environment variables
ARG REACT_APP_API_BASE_URL
ARG REACT_APP_API_HOST
ARG REACT_APP_API_URL
ARG REACT_APP_WS_URL
ARG NODE_ENV=production

# Set environment variables from build args
ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL
ENV REACT_APP_API_HOST=$REACT_APP_API_HOST
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_WS_URL=$REACT_APP_WS_URL
ENV NODE_ENV=production
ENV GENERATE_SOURCEMAP=false

# Copy package files first for better Docker layer caching
COPY package*.json ./

# Install dependencies with npm ci for faster, reproducible builds
# Temporarily set NODE_ENV to development to install devDependencies
RUN NODE_ENV=development npm ci --only=production=false --silent \
    && npm cache clean --force

# Copy source code and environment files
COPY . .
COPY .env.production .env.production

# Build the React app with production optimizations
RUN npm run build \
    && rm -rf node_modules \
    && rm -rf src \
    && rm -rf public

# Stage 2: Minimal runtime with nginx
FROM nginx:alpine

# Install minimal tools for health checks
RUN apk add --no-cache wget curl

# Copy custom nginx configuration
COPY nginx.prod.conf /etc/nginx/nginx.conf

# Copy built React app from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Create non-root user for security
RUN addgroup -g 1001 -S nginxgroup \
    && adduser -S -D -H -u 1001 -h /var/cache/nginx -s /sbin/nologin -G nginxgroup -g nginxgroup nginxuser

# Set proper permissions
RUN chown -R nginxuser:nginxgroup /usr/share/nginx/html \
    && chown -R nginxuser:nginxgroup /var/cache/nginx \
    && chown -R nginxuser:nginxgroup /var/log/nginx \
    && chown -R nginxuser:nginxgroup /etc/nginx/conf.d \
    && chmod -R 755 /usr/share/nginx/html

# Enable non-root user (commented out to avoid permission issues)
# USER nginxuser

EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"] 