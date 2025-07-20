#!/bin/bash

# ==========================================
# AV GYM SYSTEM - UNIFIED DEPLOYMENT SCRIPT
# ==========================================

set -e  # Exit on any error

echo "🏋️ AV Gym System - Unified Deployment"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if unified env file exists
if [ ! -f ".env.unified" ]; then
    print_error "Missing .env.unified file!"
    echo "Please ensure .env.unified exists before running deployment."
    exit 1
fi

print_status "Using unified environment configuration (.env.unified)"

# Clean up old environment files to avoid confusion
if [ -f ".env" ] && [ -f ".env.production" ]; then
    print_warning "Found old .env and .env.production files"
    echo "Backing them up and using .env.unified only..."
    mv .env .env.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
    mv .env.production .env.production.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
fi

# Copy unified env to standard location for docker-compose
cp .env.unified .env

# Step 1: Clean previous containers (optional)
read -p "🗑️  Do you want to clean existing Docker containers? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Stopping and removing existing containers..."
    docker-compose down --remove-orphans || true
    print_status "Existing containers cleaned"
fi

# Step 2: Build images
print_info "Building Docker images (this may take a while)..."
docker-compose build --no-cache

# Step 3: Start services
print_info "Starting all services..."
docker-compose up -d

# Step 4: Wait for services to be ready
print_info "Waiting for services to start..."
sleep 30

# Step 5: Run database migrations
print_info "Running database migrations..."
docker-compose exec -T web python manage.py migrate

# Step 6: Collect static files
print_info "Collecting static files..."
docker-compose exec -T web python manage.py collectstatic --noinput

# Step 7: Create superuser (optional)
read -p "👤 Do you want to create a superuser? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Creating superuser..."
    docker-compose exec web python manage.py createsuperuser
fi

# Step 8: Health checks
print_info "Running health checks..."

# Check if Django backend is running
if curl -f http://localhost:8000/health/ >/dev/null 2>&1; then
    print_status "Django backend health check passed"
else
    print_error "Django backend health check failed"
fi

# Check if frontend is running
if curl -f http://localhost:3000/ >/dev/null 2>&1; then
    print_status "Frontend health check passed"
else
    print_error "Frontend health check failed"
fi

# Step 9: Display deployment information
echo ""
echo "🎉 Deployment Complete!"
echo "======================"
echo ""
print_info "Service URLs:"
echo "   🌐 Frontend (React):     http://46.101.193.107:3000"
echo "   🔧 Backend API:          http://46.101.193.107:8000/api/"
echo "   👤 Django Admin:         http://46.101.193.107:8000/admin/"
echo "   💓 Health Check:         http://46.101.193.107:8000/health/"
echo ""
print_info "Default Admin Credentials:"
echo "   Username: leantna33"
echo "   Password: 45234523nn"
echo ""
print_info "Key Fixes Applied:"
echo "   ✅ Unified environment configuration"
echo "   ✅ Admin panel routed to backend port 8000 (not frontend)"
echo "   ✅ Static files properly handled by WhiteNoise"
echo "   ✅ CORS and security settings optimized"
echo "   ✅ Nginx configuration fixed for proper routing"
echo ""
print_warning "Important Notes:"
echo "   • Admin panel is accessible at :8000/admin (backend), NOT :3000/admin"
echo "   • Static files are served by Django/WhiteNoise, not Nginx"
echo "   • Use .env.unified for all environment changes"
echo "   • Frontend environment variables require rebuild when changed"
echo ""

# Step 10: Show container status
print_info "Container Status:"
docker-compose ps

# Step 11: Show logs preview
echo ""
print_info "Recent logs (last 20 lines):"
docker-compose logs --tail=20

echo ""
print_status "Deployment script completed successfully!"
print_info "Run 'docker-compose logs -f' to monitor real-time logs"
