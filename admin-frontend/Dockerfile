# Multi-stage build for React - Stage 1: Build
FROM node:18-alpine as builder

# Set working directory
WORKDIR /app


# Accept build arguments for React environment variables
ARG REACT_APP_API_BASE_URL
ARG REACT_APP_API_HOST

# Set environment variables from build args
ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL
ENV REACT_APP_API_HOST=$REACT_APP_API_HOST

# Copy package files first for better caching
COPY package*.json ./

# Set NODE_ENV=development to install devDependencies (react-scripts)
ENV NODE_ENV=development

# Install all dependencies (including devDependencies)
RUN npm ci --silent \
    && npm cache clean --force

# Copy source code
COPY . .

# Build the React app with production optimizations
RUN npm run build \
    && rm -rf node_modules

# Set NODE_ENV=production for runtime (in final image stage)

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
# USER nginx-user

EXPOSE 80

# Start nginx with minimal configuration
CMD ["nginx", "-g", "daemon off;"] 