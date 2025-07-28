#!/bin/bash

echo "🔧 Fixing deployment issue by clearing Docker cache..."

# Stop all containers
echo "🛑 Stopping all containers..."
docker-compose down

# Remove all containers, networks, and images
echo "🧹 Cleaning up Docker cache..."
docker system prune -a -f

# Remove any orphaned volumes
echo "🗑️  Removing volumes..."
docker volume prune -f

# Rebuild everything from scratch
echo "🏗️  Rebuilding containers without cache..."
docker-compose build --no-cache

# Start the services
echo "▶️  Starting services..."
docker-compose up -d

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 30

# Run migrations
echo "📊 Running database migrations..."
docker-compose exec web python manage.py migrate

# Collect static files
echo "📁 Collecting static files..."
docker-compose exec web python manage.py collectstatic --noinput

# Check status
echo "📋 Checking service status..."
docker-compose ps

echo "✅ Deployment fixed! Services should now be running properly."