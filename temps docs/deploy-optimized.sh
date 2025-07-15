#!/bin/bash

# AV-Gym System - Optimized Deployment Script
# Target: 2GB DigitalOcean Droplet
# Goal: <300MB total memory usage

set -e

echo "🚀 Starting AV-Gym System Optimized Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

# Stop existing containers
print_status "Stopping existing containers..."
docker-compose -f docker-compose.yml down 2>/dev/null || true
docker-compose -f docker-compose.optimized.yml down 2>/dev/null || true

# Clean up unused images and containers
print_status "Cleaning up Docker system..."
docker system prune -f

# Build optimized images
print_status "Building optimized images..."
docker-compose -f docker-compose.optimized.yml build --no-cache

# Deploy with resource limits
print_status "Deploying optimized stack..."
docker-compose -f docker-compose.optimized.yml up -d

# Wait for services to start
print_status "Waiting for services to start..."
sleep 30

# Check service health
print_status "Checking service health..."
docker-compose -f docker-compose.optimized.yml ps

# Monitor memory usage
print_status "Current memory usage:"
echo "=================================="
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"

# Calculate total memory usage
TOTAL_MEMORY=$(docker stats --no-stream --format "{{.MemUsage}}" | grep -o '^[0-9.]*' | awk '{sum += $1} END {print sum}')
TOTAL_MEMORY_MB=$(echo "$TOTAL_MEMORY" | awk '{printf "%.0f", $1}')

echo "=================================="
print_status "Total memory usage: ${TOTAL_MEMORY_MB}MB"

if [ "$TOTAL_MEMORY_MB" -lt 300 ]; then
    print_status "✅ SUCCESS: Memory usage is under 300MB target!"
else
    print_warning "⚠️  Memory usage is above 300MB target. Consider further optimizations."
fi

# Show service URLs
echo ""
print_status "Service URLs:"
echo "=================================="
echo "Frontend: http://localhost:3000"
echo "Backend API: http://localhost:8000"
echo "Database: localhost:5432"
echo "Redis: localhost:6379"

# Optional: Show logs
echo ""
print_status "Recent logs (last 10 lines):"
echo "=================================="
docker-compose -f docker-compose.optimized.yml logs --tail=10

echo ""
print_status "Deployment complete! 🎉"
print_status "Use 'docker-compose -f docker-compose.optimized.yml logs -f' to monitor logs"
print_status "Use 'docker stats' to monitor resource usage" 