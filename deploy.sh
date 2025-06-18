#!/bin/bash

# AV Gym System Deployment Script
# This script automates the deployment process for the gym management system

set -e  # Exit on any error

echo "🚀 Starting AV Gym System Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Load environment variables
if [ -f .env ]; then
    print_status "Loading environment variables from .env file..."
    export $(cat .env | grep -v '^#' | xargs)
else
    print_warning "No .env file found. Using default environment variables."
fi

# Set default environment variables if not set
export SECRET_KEY=${SECRET_KEY:-"your-secret-key-change-this-in-production"}
export DEBUG=${DEBUG:-"False"}
export ALLOWED_HOSTS=${ALLOWED_HOSTS:-"localhost,127.0.0.1"}
export DATABASE_URL=${DATABASE_URL:-"postgresql://gymapp_user:gymapp_password@db:5432/gymapp"}
export CELERY_BROKER_URL=${CELERY_BROKER_URL:-"redis://redis:6379/0"}
export CELERY_RESULT_BACKEND=${CELERY_RESULT_BACKEND:-"redis://redis:6379/0"}
export REDIS_URL=${REDIS_URL:-"redis://redis:6379/0"}

print_status "Environment variables configured:"
echo "  SECRET_KEY: ${SECRET_KEY:0:20}..."
echo "  DEBUG: $DEBUG"
echo "  ALLOWED_HOSTS: $ALLOWED_HOSTS"
echo "  DATABASE_URL: $DATABASE_URL"
echo "  CELERY_BROKER_URL: $CELERY_BROKER_URL"

# Stop existing containers
print_status "Stopping existing containers..."
docker-compose down --remove-orphans

# Build and start services
print_status "Building and starting services..."
docker-compose up -d --build

# Wait for services to be ready
print_status "Waiting for services to be ready..."
sleep 30

# Check if services are healthy
print_status "Checking service health..."

# Check database
if docker-compose exec -T db pg_isready -U gymapp_user -d gymapp > /dev/null 2>&1; then
    print_success "Database is ready"
else
    print_error "Database is not ready"
    exit 1
fi

# Check Redis
if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
    print_success "Redis is ready"
else
    print_error "Redis is not ready"
    exit 1
fi

# Check web application
if curl -f http://localhost:8000/health/ > /dev/null 2>&1; then
    print_success "Web application is ready"
else
    print_warning "Web application health check failed, but continuing..."
fi

# Run database migrations
print_status "Running database migrations..."
docker-compose exec -T web python manage.py migrate

# Create superuser if it doesn't exist
print_status "Checking for superuser..."
if ! docker-compose exec -T web python manage.py shell -c "from authentication.models import User; User.objects.filter(is_superuser=True).exists()" 2>/dev/null | grep -q "True"; then
    print_status "Creating superuser..."
    docker-compose exec -T web python manage.py createsuperuser --noinput || true
fi

# Collect static files
print_status "Collecting static files..."
docker-compose exec -T web python manage.py collectstatic --noinput

# Start Celery workers
print_status "Starting Celery workers..."
docker-compose up -d celery celery-beat

# Check Celery Flower
sleep 10
if curl -f http://localhost:5555/ > /dev/null 2>&1; then
    print_success "Celery Flower is ready"
else
    print_warning "Celery Flower is not accessible"
fi

# Final health check
print_status "Performing final health check..."
if curl -f http://localhost:8000/health/ > /dev/null 2>&1; then
    print_success "All services are healthy!"
else
    print_warning "Health check failed, but services may still be starting up"
fi

print_success "Deployment completed successfully!"
echo ""
echo "🌐 Application URLs:"
echo "  - Main Application: http://localhost:8000"
echo "  - Admin Interface: http://localhost:8000/admin/"
echo "  - Health Check: http://localhost:8000/health/"
echo "  - Celery Flower: http://localhost:5555"
echo ""
echo "📊 To monitor the application:"
echo "  - View logs: docker-compose logs -f"
echo "  - Check status: docker-compose ps"
echo "  - Stop services: docker-compose down"
echo ""
print_success "AV Gym System is now running! 🎉" 