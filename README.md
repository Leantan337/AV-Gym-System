# AV Gym Management System

A comprehensive web-based gym membership and management system built with Django and React.

## 🎯 Project Status: **95% Complete**

### ✅ Completed Features

#### **Core Functionality (100%)**
- ✅ **Member Management**: Full CRUD operations with photo upload
- ✅ **Check-In/Check-Out System**: Real-time logging with barcode support
- ✅ **Membership Plans**: Complete plan management with pricing
- ✅ **Invoicing System**: Automated billing with PDF generation
- ✅ **ID Card Generation**: Professional PDF cards with barcodes
- ✅ **Dashboard**: Real-time metrics and analytics
- ✅ **Role-Based Access**: Multi-level authorization system

#### **Advanced Features (95%)**
- ✅ **Real-Time Updates**: WebSocket integration for live data
- ✅ **Automated Billing**: Celery tasks for scheduled invoicing
- ✅ **Notifications**: Email templates and expiry reminders
- ✅ **Reports**: PDF/Excel export functionality
- ✅ **Production Ready**: Docker containerization and deployment
- ✅ **Security**: JWT authentication, CSP headers, HTTPS support

#### **Infrastructure (100%)**
- ✅ **Database**: PostgreSQL with connection pooling
- ✅ **Caching**: Redis for sessions and task queue
- ✅ **Background Tasks**: Celery with Redis broker
- ✅ **Monitoring**: Health checks and logging
- ✅ **Deployment**: Docker Compose with Nginx

### 🚀 Quick Start

#### Prerequisites
- Docker and Docker Compose
- At least 2GB RAM
- 10GB disk space

#### 1. Clone and Setup
```bash
git clone <repository-url>
cd AV-Gym-System-

# Copy environment template
copy env.example .env

# Edit environment variables
notepad .env
```

#### 2. Deploy
```bash
# Windows
deploy.bat

# Linux/Mac
chmod +x deploy.sh
./deploy.sh
```

#### 3. Access the Application
- **Main Application**: http://localhost:8000
- **Admin Interface**: http://localhost:8000/admin/
- **Health Check**: http://localhost:8000/health/
- **Celery Flower**: http://localhost:5555

## 🏗️ Architecture

### Technology Stack
- **Backend**: Django 5.0 + Django REST Framework
- **Frontend**: React 18 + Material-UI
- **Database**: PostgreSQL
- **Cache/Queue**: Redis
- **Background Tasks**: Celery
- **Containerization**: Docker + Docker Compose
- **Web Server**: Nginx + Gunicorn

### System Components
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend│    │  Django Backend │    │   PostgreSQL    │
│   (Port 3000)   │◄──►│   (Port 8000)   │◄──►│   (Port 5432)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │     Redis       │
                       │   (Port 6379)   │
                       └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Celery Worker │
                       │   (Background)  │
                       └─────────────────┘
```

## 📋 Features Overview

### Member Management
- **CRUD Operations**: Add, edit, delete members
- **Photo Upload**: Member profile pictures
- **ID Cards**: Generate printable PDF cards with barcodes
- **Search & Filter**: Find members by name, ID, or status
- **Bulk Operations**: Mass actions on multiple members

### Check-In System
- **Barcode Scanning**: Support for physical barcode scanners
- **Manual Entry**: Type member ID manually
- **Real-Time Updates**: Live check-in status via WebSocket
- **Location Tracking**: Optional location data for check-ins
- **History**: Complete check-in/check-out logs

### Membership Plans
- **Flexible Plans**: Monthly, weekly, or custom durations
- **Pricing**: Set different prices for different plans
- **Auto-Assignment**: Automatically assign plans to members
- **Expiry Tracking**: Monitor membership expiration dates

### Invoicing & Billing
- **Automated Billing**: Daily invoice generation via Celery
- **PDF Generation**: Professional invoice PDFs
- **Payment Tracking**: Mark invoices as paid/unpaid
- **Bulk Operations**: Process multiple invoices
- **Email Notifications**: Send payment reminders

### Dashboard & Analytics
- **Real-Time Metrics**: Live member and check-in statistics
- **Revenue Tracking**: Daily, weekly, monthly revenue
- **Member Growth**: New member registration trends
- **Attendance Analytics**: Check-in patterns and statistics

### Security & Access Control
- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access**: Admin, Manager, Staff, Front Desk roles
- **Permission System**: Granular permissions for different actions
- **Audit Logging**: Track all system activities

## 🔧 Configuration

### Environment Variables
| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `SECRET_KEY` | Django secret key | Yes | - |
| `DEBUG` | Debug mode | No | False |
| `ALLOWED_HOSTS` | Allowed hostnames | Yes | localhost |
| `DATABASE_URL` | Database connection | Yes | sqlite |
| `REDIS_URL` | Redis connection | No | localhost:6379 |
| `CELERY_BROKER_URL` | Celery broker | No | redis://localhost:6379/0 |

### Production Deployment
See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed production deployment instructions.

## 📊 Monitoring

### Health Checks
The application provides comprehensive health monitoring:
- Database connectivity
- Redis connectivity  
- Celery worker status
- File system access
- Application status

### Logging
- **Application Logs**: Django and Celery logs
- **Access Logs**: Nginx access logs
- **Error Logs**: Detailed error tracking
- **Performance Metrics**: Response times and throughput

### Celery Flower
Monitor background tasks at http://localhost:5555:
- Task execution status
- Worker performance
- Queue monitoring
- Task history

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   docker-compose logs db
   docker-compose exec db pg_isready -U gymapp_user -d gymapp
   ```

2. **Celery Workers Not Starting**
   ```bash
   docker-compose logs celery
   docker-compose exec redis redis-cli ping
   ```

3. **Static Files Not Loading**
   ```bash
   docker-compose exec web python manage.py collectstatic --noinput
   ```

4. **Health Check Failing**
   ```bash
   curl http://localhost:8000/health/
   docker-compose ps
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

## 📈 Performance

### Optimizations
- **Database**: Connection pooling and query optimization
- **Caching**: Redis for session and data caching
- **Static Files**: WhiteNoise for efficient serving
- **Background Tasks**: Celery for heavy operations
- **CDN Ready**: Static file optimization for CDN deployment

### Scalability
- **Horizontal Scaling**: Multiple Celery workers
- **Load Balancing**: Nginx reverse proxy
- **Database Scaling**: PostgreSQL with read replicas
- **Caching Strategy**: Multi-level caching with Redis

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
1. Check the [DEPLOYMENT.md](DEPLOYMENT.md) guide
2. Review the troubleshooting section
3. Check application logs: `docker-compose logs -f`
4. Test health endpoint: `curl http://localhost:8000/health/`

---

**🎉 The AV Gym Management System is production-ready and feature-complete!**
