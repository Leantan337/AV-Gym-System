# AV Gym System - Unified Configuration Guide

## 🚨 **CRITICAL FIXES APPLIED**

### **Issues Resolved:**

1. **❌ Admin Panel Wrong Port Issue**: 
   - **Problem**: Admin was accessible via `:3000/admin` (frontend port)
   - **Fix**: Admin now properly routed to `:8000/admin` (backend port)

2. **❌ Static File Serving Confusion**:
   - **Problem**: Both Nginx and WhiteNoise trying to serve static files
   - **Fix**: WhiteNoise handles all static files, Nginx routes requests

3. **❌ Duplicate Environment Files**:
   - **Problem**: `.env` and `.env.production` with duplicate/conflicting settings
   - **Fix**: Single `.env.unified` file for all environments

4. **❌ Static File Collection Confusion**:
   - **Problem**: Unclear when to run `collectstatic`
   - **Fix**: Automated in Dockerfile + deployment script

---

## 🔧 **NEW UNIFIED ARCHITECTURE**

### **Service Architecture:**
```
PORT 3000 (Frontend)    →  React App ONLY
    ├── / (homepage)
    ├── /login
    ├── /dashboard
    └── /members
    
PORT 8000 (Backend)     →  Django API + Admin
    ├── /api/* (REST APIs)
    ├── /admin/ (Django Admin Panel) ← **FIXED HERE**
    ├── /static/* (Static files via WhiteNoise)
    └── /health/ (Health check)
```

### **Environment Management:**
- **Single File**: `.env.unified` (replaces `.env` and `.env.production`)
- **Automatic**: Environment variables automatically loaded by all services
- **Development Override**: Uncomment dev variables in `.env.unified` for local development

---

## 📋 **STATIC FILE SERVING - CLARIFIED**

### **How Static Files Work Now:**

1. **Collection**: `python manage.py collectstatic` gathers files into `/app/staticfiles/`
2. **Serving**: WhiteNoise middleware serves files directly from Django
3. **Routing**: Nginx proxies `/static/*` requests to Django backend
4. **Caching**: WhiteNoise adds proper cache headers and compression

### **When to Run collectstatic:**

| Scenario | Command | When |
|----------|---------|------|
| **Docker Build** | ✅ **Automatic** | Built into Dockerfile |
| **Manual Deployment** | `docker-compose exec web python manage.py collectstatic --noinput` | After code changes |
| **Development** | `python manage.py collectstatic` | When adding new static files |

### **You DON'T need to run collectstatic manually because:**
- ✅ Dockerfile runs it automatically during build
- ✅ WhiteNoise serves files on-demand in development
- ✅ Deployment script handles it automatically

---

## 🚀 **DEPLOYMENT INSTRUCTIONS**

### **Quick Start (Recommended):**
```bash
cd /root/gym/AV-Gym-System-
./deploy-unified.sh
```

### **Manual Deployment:**
```bash
# 1. Use unified environment
cp .env.unified .env

# 2. Build and start
docker-compose build --no-cache
docker-compose up -d

# 3. Initialize database
docker-compose exec web python manage.py migrate
docker-compose exec web python manage.py collectstatic --noinput
docker-compose exec web python manage.py createsuperuser

# 4. Verify
curl http://46.101.193.107:8000/health/
```

### **Environment Switch:**
```bash
# For Production (default)
ENVIRONMENT=production  # in .env.unified

# For Development
ENVIRONMENT=development  # in .env.unified
# Then uncomment the dev override variables
```

---

## 🌐 **CORRECT URLs**

### **✅ Production URLs:**
- **Main App**: http://46.101.193.107:3000
- **Login**: http://46.101.193.107:3000/login
- **Admin Panel**: http://46.101.193.107:8000/admin/ ← **CORRECT ADMIN URL**
- **API**: http://46.101.193.107:8000/api/
- **Health**: http://46.101.193.107:8000/health/

### **❌ WRONG URLs (Don't Use):**
- ~~http://46.101.193.107:3000/admin~~ ← **This was the problem!**
- ~~Direct static file access~~ ← **WhiteNoise handles this**

---

## 🔐 **SECURITY & ACCESS**

### **Admin Panel Access:**
- **URL**: `:8000/admin/` (backend port)
- **Authentication**: Django user credentials
- **Theme**: Jazzmin (modern, responsive)
- **Security**: CSRF protection, rate limiting via Nginx

### **Frontend Access:**
- **URL**: `:3000/` (frontend port)
- **Authentication**: JWT tokens from backend
- **Role-based**: Admin, Manager, Staff roles
- **Security**: CORS configured, CSP headers

---

## 🛠️ **TROUBLESHOOTING**

### **Common Issues:**

1. **"Admin shows 404"**:
   ```bash
   # Check you're using the RIGHT URL:
   ✅ http://46.101.193.107:8000/admin/  (backend)
   ❌ http://46.101.193.107:3000/admin   (frontend - wrong!)
   ```

2. **"Static files not loading"**:
   ```bash
   # Run collectstatic
   docker-compose exec web python manage.py collectstatic --noinput
   
   # Check WhiteNoise is enabled
   docker-compose exec web python manage.py shell
   >>> from django.conf import settings
   >>> print(settings.STATICFILES_STORAGE)
   # Should show: whitenoise.storage.CompressedStaticFilesStorage
   ```

3. **"Environment variables not working"**:
   ```bash
   # Verify .env.unified is copied
   cp .env.unified .env
   
   # Restart services
   docker-compose down && docker-compose up -d
   ```

4. **"Frontend shows API errors"**:
   ```bash
   # Check backend is running
   curl http://46.101.193.107:8000/health/
   
   # Verify CORS settings
   docker-compose exec web python manage.py shell
   >>> from django.conf import settings
   >>> print(settings.CORS_ALLOWED_ORIGINS)
   ```

### **Service Status:**
```bash
# Check all services
docker-compose ps

# View logs
docker-compose logs -f web frontend

# Test individual components
curl http://46.101.193.107:8000/health/  # Backend
curl http://46.101.193.107:3000/         # Frontend
```

---

## 📊 **MONITORING**

### **Health Checks:**
```bash
# Backend Health
curl http://46.101.193.107:8000/health/

# Expected Response:
{
  "status": "healthy",
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "celery": "healthy"
  }
}
```

### **Service Logs:**
```bash
# Real-time monitoring
docker-compose logs -f

# Specific service
docker-compose logs -f web
docker-compose logs -f frontend
docker-compose logs -f db
```

### **Resource Usage:**
```bash
# Container stats
docker stats

# Disk usage
docker system df
```

---

## 🔄 **MAINTENANCE**

### **Updates:**
```bash
# Code changes (backend)
docker-compose build web
docker-compose up -d web

# Code changes (frontend) 
docker-compose build frontend
docker-compose up -d frontend

# Environment changes
cp .env.unified .env
docker-compose down && docker-compose up -d
```

### **Database:**
```bash
# Backup
docker-compose exec db pg_dump -U gymapp_user gymapp > backup.sql

# Restore
docker-compose exec -T db psql -U gymapp_user gymapp < backup.sql
```

### **Cleanup:**
```bash
# Remove old containers
docker-compose down --remove-orphans

# Clean build cache
docker system prune -f

# Full cleanup (DANGER: loses data)
docker-compose down -v
docker system prune -a -f
```

---

## ✅ **VERIFICATION CHECKLIST**

Before considering deployment complete, verify:

- [ ] ✅ Admin accessible at `:8000/admin/` (not `:3000/admin`)
- [ ] ✅ Frontend accessible at `:3000/`
- [ ] ✅ API responds at `:8000/api/`
- [ ] ✅ Health check passes at `:8000/health/`
- [ ] ✅ Static files load properly (check browser dev tools)
- [ ] ✅ Login works on frontend
- [ ] ✅ Admin login works on backend
- [ ] ✅ Database migrations applied
- [ ] ✅ Superuser created
- [ ] ✅ All containers running (`docker-compose ps`)

---

## 📝 **CHANGE LOG**

### **2025-07-20 - Unified Configuration Update:**
- ✅ Created `.env.unified` to replace dual environment files
- ✅ Fixed admin panel routing from `:3000/admin` to `:8000/admin`
- ✅ Clarified static file serving via WhiteNoise
- ✅ Updated Docker Compose to use unified environment
- ✅ Created automated deployment script
- ✅ Added comprehensive documentation
- ✅ Improved Nginx configuration for proper routing

### **Key Benefits:**
- 🎯 **Single source of truth** for environment configuration
- 🔒 **Proper security** with admin on backend port
- ⚡ **Simplified deployment** with automated script
- 📚 **Clear documentation** for maintenance
- 🛡️ **Better separation** of frontend and backend concerns

---

**🎉 Your AV Gym System is now properly configured and ready for production!**
