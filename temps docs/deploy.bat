@echo off
REM AV Gym System Deployment Script for Windows
REM This script automates the deployment process for the gym management system

echo 🚀 Starting AV Gym System Deployment...

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not installed. Please install Docker Desktop first.
    exit /b 1
)

REM Check if Docker Compose is installed
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker Compose is not installed. Please install Docker Compose first.
    exit /b 1
)

REM Load environment variables from .env file if it exists
if exist .env (
    echo [INFO] Loading environment variables from .env file...
    for /f "tokens=1,* delims==" %%a in (.env) do (
        if not "%%a"=="" if not "%%a:~0,1%"=="#" set "%%a=%%b"
    )
) else (
    echo [WARNING] No .env file found. Using default environment variables.
)

REM Set default environment variables if not set
if not defined SECRET_KEY set "SECRET_KEY=your-secret-key-change-this-in-production"
if not defined DEBUG set "DEBUG=False"
if not defined ALLOWED_HOSTS set "ALLOWED_HOSTS=localhost,127.0.0.1"
if not defined DATABASE_URL set "DATABASE_URL=postgresql://gymapp_user:gymapp_password@db:5432/gymapp"
if not defined CELERY_BROKER_URL set "CELERY_BROKER_URL=redis://redis:6379/0"
if not defined CELERY_RESULT_BACKEND set "CELERY_RESULT_BACKEND=redis://redis:6379/0"
if not defined REDIS_URL set "REDIS_URL=redis://redis:6379/0"

echo [INFO] Environment variables configured:
echo   SECRET_KEY: %SECRET_KEY:~0,20%...
echo   DEBUG: %DEBUG%
echo   ALLOWED_HOSTS: %ALLOWED_HOSTS%
echo   DATABASE_URL: %DATABASE_URL%
echo   CELERY_BROKER_URL: %CELERY_BROKER_URL%

REM Stop existing containers
echo [INFO] Stopping existing containers...
docker-compose down --remove-orphans

REM Build and start services
echo [INFO] Building and starting services...
docker-compose up -d --build

REM Wait for services to be ready
echo [INFO] Waiting for services to be ready...
timeout /t 30 /nobreak >nul

REM Check if services are healthy
echo [INFO] Checking service health...

REM Check database
docker-compose exec -T db pg_isready -U gymapp_user -d gymapp >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Database is not ready
    exit /b 1
) else (
    echo [SUCCESS] Database is ready
)

REM Check Redis
docker-compose exec -T redis redis-cli ping >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Redis is not ready
    exit /b 1
) else (
    echo [SUCCESS] Redis is ready
)

REM Check web application
curl -f http://localhost:8000/health/ >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Web application health check failed, but continuing...
) else (
    echo [SUCCESS] Web application is ready
)

REM Run database migrations
echo [INFO] Running database migrations...
docker-compose exec -T web python manage.py migrate

REM Create superuser if it doesn't exist
echo [INFO] Checking for superuser...
docker-compose exec -T web python manage.py shell -c "from authentication.models import User; exit(0 if User.objects.filter(is_superuser=True).exists() else 1)" >nul 2>&1
if errorlevel 1 (
    echo [INFO] Creating superuser...
    docker-compose exec -T web python manage.py createsuperuser --noinput
)

REM Collect static files
echo [INFO] Collecting static files...
docker-compose exec -T web python manage.py collectstatic --noinput

REM Start Celery workers
echo [INFO] Starting Celery workers...
docker-compose up -d celery celery-beat

REM Check Celery Flower
timeout /t 10 /nobreak >nul
curl -f http://localhost:5555/ >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Celery Flower is not accessible
) else (
    echo [SUCCESS] Celery Flower is ready
)

REM Final health check
echo [INFO] Performing final health check...
curl -f http://localhost:8000/health/ >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Health check failed, but services may still be starting up
) else (
    echo [SUCCESS] All services are healthy!
)

echo [SUCCESS] Deployment completed successfully!
echo.
echo 🌐 Application URLs:
echo   - Main Application: http://localhost:8000
echo   - Admin Interface: http://localhost:8000/admin/
echo   - Health Check: http://localhost:8000/health/
echo   - Celery Flower: http://localhost:5555
echo.
echo 📊 To monitor the application:
echo   - View logs: docker-compose logs -f
echo   - Check status: docker-compose ps
echo   - Stop services: docker-compose down
echo.
echo [SUCCESS] AV Gym System is now running! 🎉
pause 