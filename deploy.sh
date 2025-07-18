#!/bin/bash

# AV Gym System - Production Deployment Script
# Run this script after cloning the repository and setting up your .env file

set -e  # Exit on any error

echo "🚀 Starting AV Gym System deployment..."

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found! Copying from .env.example..."
    cp .env.example .env
    echo "📝 Please edit .env file with your production settings before continuing."
    echo "   Pay special attention to:"
    echo "   - SECRET_KEY (generate a new one)"
    echo "   - ALLOWED_HOSTS (add your domain/IP)"
    echo "   - EMAIL_HOST_USER and EMAIL_HOST_PASSWORD"
    echo ""
    read -p "Press Enter after updating .env file..."
fi

echo "📦 Building Docker images..."
docker-compose build --no-cache

echo "🔧 Starting services..."
docker-compose up -d

echo "⏳ Waiting for services to start..."
sleep 15

echo "🗄️  Running database migrations..."
docker-compose exec web python manage.py migrate

echo "📊 Collecting static files..."
docker-compose exec web python manage.py collectstatic --noinput

echo "👤 Creating superuser..."
echo "Please create an admin user:"
docker-compose exec web python manage.py createsuperuser

echo "🔍 Running health check..."
if curl -f http://localhost:8000/health/ > /dev/null 2>&1; then
    echo "✅ Health check passed!"
else
    echo "❌ Health check failed. Check logs with: docker-compose logs web"
    exit 1
fi

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "📱 Your services are available at:"
echo "   • Django Admin: http://localhost:8000/admin/"
echo "   • API: http://localhost:8000/api/"
echo "   • Frontend: http://localhost:3000/"
echo "   • Health Check: http://localhost:8000/health/"
echo ""
echo "📝 Useful commands:"
echo "   • View logs: docker-compose logs -f"
echo "   • Stop services: docker-compose down"
echo "   • Restart services: docker-compose restart"
echo ""
