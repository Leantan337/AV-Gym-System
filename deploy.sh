#!/bin/bash

# =================================================================
# AV-GYM-SYSTEM DEPLOYMENT SCRIPT (Clean Slate Strategy)
# =================================================================
# This script ensures a reliable deployment by tearing down the old
# stack and performing a safe prune before building and launching
# the new version.
#
# IT WILL NOT DELETE YOUR DATABASE VOLUME (`postgres_data`).
#
# USAGE:
# 1. Make the script executable: chmod +x deploy.sh
# 2. Run the script: ./deploy.sh
# =================================================================

# Exit immediately if a command exits with a non-zero status.
set -e

# --- 1. Tear Down the Existing Stack ---
echo "Stopping and removing existing application containers and networks..."
# Using --remove-orphans cleans up any containers left from previous configs.
docker-compose down --remove-orphans

# --- 2. Perform a Safe Prune ---
echo "Pruning unused Docker objects (stopped containers, old networks, dangling images)..."
# This is safe and will NOT remove your named volumes like the database.
# The -f flag forces the prune without asking for confirmation.
docker system prune -f

# --- 3. Build Fresh Docker Images ---
echo "Building fresh Docker images for all services..."
docker-compose build

# --- 4. Launch the New Stack ---
echo "Starting all services from a clean slate..."
# No --force-recreate needed, as everything was already down.
docker-compose up -d

# --- 5. Wait for the Database ---
echo "Waiting for the database service to be healthy..."
# This loop checks the health status of the 'db' container every 5 seconds.
while [ "$(docker-compose ps -q db | xargs docker inspect -f '{{.State.Health.Status}}')" != "healthy" ]; do
    echo -n "."
    sleep 5
done
echo "Database is ready!"

# --- 6. Run Post-Deploy Commands ---
echo "Running database migrations..."
docker-compose exec web python manage.py migrate --noinput

echo "Collecting static files..."
docker-compose exec web python manage.py collectstatic --noinput

# --- 7. Final Nginx Restart (Good Practice) ---
echo "Restarting Nginx to ensure all changes are applied..."
docker-compose restart nginx

# --- Deployment Complete ---
echo "✅ Deployment successful!"
echo "Current status of all services:"
docker-compose ps
