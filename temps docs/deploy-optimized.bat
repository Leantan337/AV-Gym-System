@echo off
REM AV-Gym System - Optimized Deployment Script for Windows
REM Target: 2GB DigitalOcean Droplet
REM Goal: <300MB total memory usage

echo 🚀 Starting AV-Gym System Optimized Deployment...

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running. Please start Docker first.
    exit /b 1
)

REM Stop existing containers
echo [INFO] Stopping existing containers...
docker-compose -f docker-compose.yml down 2>nul
docker-compose -f docker-compose.optimized.yml down 2>nul

REM Clean up unused images and containers
echo [INFO] Cleaning up Docker system...
docker system prune -f

REM Build optimized images
echo [INFO] Building optimized images...
docker-compose -f docker-compose.optimized.yml build --no-cache

REM Deploy with resource limits
echo [INFO] Deploying optimized stack...
docker-compose -f docker-compose.optimized.yml up -d

REM Wait for services to start
echo [INFO] Waiting for services to start...
timeout /t 30 /nobreak >nul

REM Check service health
echo [INFO] Checking service health...
docker-compose -f docker-compose.optimized.yml ps

REM Monitor memory usage
echo [INFO] Current memory usage:
echo ==================================
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"

echo ==================================
echo [INFO] Deployment complete! 🎉
echo [INFO] Use 'docker-compose -f docker-compose.optimized.yml logs -f' to monitor logs
echo [INFO] Use 'docker stats' to monitor resource usage

REM Show service URLs
echo.
echo [INFO] Service URLs:
echo ==================================
echo Frontend: http://localhost:3000
echo Backend API: http://localhost:8000
echo Database: localhost:5432
echo Redis: localhost:6379

pause 