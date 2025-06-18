# AV Gym System - Production Deployment Guide

This guide provides step-by-step instructions for deploying the AV Gym Management System to production.

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose installed
- At least 2GB RAM available
- 10GB disk space
- Domain name (optional but recommended)

### 1. Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
cd AV-Gym-System-

# Copy environment template
cp env.example .env

# Edit environment variables
nano .env
```

### 2. Configure Environment Variables

Edit the `.env` file with your production settings:

```bash
# Required: Change the secret key
SECRET_KEY=your-super-secret-key-change-this-in-production

# Required: Set your domain
ALLOWED_HOSTS=your-domain.com,www.your-domain.com

# Required: Database configuration
DATABASE_URL=postgresql://gymapp_user:gymapp_password@db:5432/gymapp

# Optional: Email configuration for notifications
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
```

### 3. Deploy

```bash
# Make deployment script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

The deployment script will:
- Build and start all services
- Run database migrations
- Create a superuser account
- Collect static files
- Start Celery workers
- Perform health checks

### 4. Access the Application

Once deployment is complete, you can access:

- **Main Application**: http://your-domain.com
- **Admin Interface**: http://your-domain.com/admin/
- **Health Check**: http://your-domain.com/health/
- **Celery Flower**: http://your-domain.com:5555

## 📋 Manual Deployment Steps

If you prefer to deploy manually:

### 1. Start Services

```bash
# Build and start all services
docker-compose up -d --build

# Check service status
docker-compose ps
```

### 2. Database Setup

```bash
# Run migrations
docker-compose exec web python manage.py migrate

# Create superuser
docker-compose exec web python manage.py createsuperuser

# Collect static files
docker-compose exec web python manage.py collectstatic --noinput
```

### 3. Start Background Workers

```bash
# Start Celery worker
docker-compose up -d celery

# Start Celery Beat (scheduler)
docker-compose up -d celery-beat
```

## 🔧 Configuration

### Production Settings

The application uses `gymapp/settings_production.py` for production configuration. Key settings include:

- **Security**: HTTPS redirect, HSTS, CSP headers
- **Database**: PostgreSQL with connection pooling
- **Caching**: Redis for sessions and Celery
- **Logging**: File and console logging
- **Static Files**: WhiteNoise for serving

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `SECRET_KEY` | Django secret key | Yes | - |
| `DEBUG` | Debug mode | No | False |
| `ALLOWED_HOSTS` | Allowed hostnames | Yes | localhost |
| `DATABASE_URL` | Database connection | Yes | sqlite |
| `REDIS_URL` | Redis connection | No | localhost:6379 |
| `CELERY_BROKER_URL` | Celery broker | No | redis://localhost:6379/0 |
| `CORS_ALLOWED_ORIGINS` | CORS origins | No | localhost:3000 |

### Database Configuration

The application supports PostgreSQL in production:

```bash
# PostgreSQL connection string format
DATABASE_URL=postgresql://username:password@host:port/database

# Example
DATABASE_URL=postgresql://gymapp_user:gymapp_password@db:5432/gymapp
```

## 📊 Monitoring

### Health Checks

The application provides a health check endpoint at `/health/` that monitors:

- Database connectivity
- Redis connectivity
- Celery worker status
- File system access

### Logs

View application logs:

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f web
docker-compose logs -f celery
docker-compose logs -f db
```

### Celery Flower

Monitor Celery tasks at http://your-domain.com:5555

## 🔒 Security

### SSL/HTTPS

For production, configure SSL certificates:

1. **Using Let's Encrypt**:
   ```bash
   # Add to docker-compose.yml
   volumes:
     - ./certbot/conf:/etc/letsencrypt
     - ./certbot/www:/var/www/certbot
   ```

2. **Using reverse proxy** (recommended):
   - Configure Nginx with SSL
   - Use Cloudflare or similar CDN

### Security Headers

The application includes security headers:
- HSTS (HTTP Strict Transport Security)
- CSP (Content Security Policy)
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check database status
   docker-compose exec db pg_isready -U gymapp_user -d gymapp
   
   # View database logs
   docker-compose logs db
   ```

2. **Celery Workers Not Starting**
   ```bash
   # Check Redis connection
   docker-compose exec redis redis-cli ping
   
   # View Celery logs
   docker-compose logs celery
   ```

3. **Static Files Not Loading**
   ```bash
   # Recollect static files
   docker-compose exec web python manage.py collectstatic --noinput
   ```

4. **Health Check Failing**
   ```bash
   # Check all services
   docker-compose ps
   
   # View health check response
   curl http://localhost:8000/health/
   ```

### Performance Optimization

1. **Database Optimization**:
   ```bash
   # Add database indexes
   docker-compose exec web python manage.py dbshell
   ```

2. **Caching**:
   - Redis is already configured for caching
   - Consider adding CDN for static files

3. **Worker Scaling**:
   ```bash
   # Scale Celery workers
   docker-compose up -d --scale celery=3
   ```

## 🔄 Updates

### Updating the Application

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up -d --build

# Run migrations
docker-compose exec web python manage.py migrate
```

### Backup and Restore

```bash
# Backup database
docker-compose exec db pg_dump -U gymapp_user gymapp > backup.sql

# Restore database
docker-compose exec -T db psql -U gymapp_user gymapp < backup.sql
```

## 📞 Support

For deployment issues:

1. Check the logs: `docker-compose logs -f`
2. Verify environment variables: `docker-compose config`
3. Test health endpoint: `curl http://localhost:8000/health/`
4. Check service status: `docker-compose ps`

## 🎯 Next Steps

After successful deployment:

1. **Configure Email**: Set up email notifications
2. **Set up Monitoring**: Configure external monitoring (e.g., Sentry)
3. **Backup Strategy**: Implement automated backups
4. **SSL Certificate**: Configure HTTPS
5. **Domain Configuration**: Point your domain to the server

---

**Note**: This deployment guide assumes a Linux environment. For Windows or macOS, some commands may need to be adjusted. 