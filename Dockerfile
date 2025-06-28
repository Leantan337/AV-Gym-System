# Multi-stage build for minimal runtime image
FROM python:3.11-slim as builder

# Install build dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libjpeg-dev \
    libpng-dev \
    libfreetype6-dev \
    liblcms2-dev \
    libwebp-dev \
    libharfbuzz-dev \
    libfribidi-dev \
    libxcb1-dev \
    pkg-config \
    gcc \
    g++ \
    make \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Install Python dependencies with user install to avoid system-wide packages
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Runtime stage - minimal image
FROM python:3.11-slim

# Install only runtime dependencies (much smaller)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    libjpeg62-turbo \
    libpng16-16 \
    libfreetype6 \
    liblcms2-2 \
    libwebp7 \
    libharfbuzz0b \
    libfribidi0 \
    libxcb1 \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean \
    && apt-get autoremove -y

# Copy Python packages from builder stage
COPY --from=builder /root/.local /root/.local

# Set environment variables for production
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/root/.local/lib/python3.11/site-packages \
    PATH=/root/.local/bin:$PATH \
    DJANGO_SETTINGS_MODULE=gymapp.settings

WORKDIR /app

# Create non-root user for security
RUN adduser --disabled-password --gecos '' --shell /bin/sh appuser

# Copy only necessary application files (not entire codebase due to .dockerignore)
COPY --chown=appuser:appuser . .

# Create necessary directories and collect static files
RUN mkdir -p /app/media /app/staticfiles \
    && python manage.py collectstatic --noinput \
    && chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

EXPOSE 8000

# Optimized Gunicorn configuration for small deployments
# - 1 worker with 4 threads (good for 2GB droplet)
# - Reduced timeout and keep-alive for memory efficiency
# - Limited max requests to prevent memory leaks
CMD ["gunicorn", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "1", \
     "--threads", "4", \
     "--timeout", "60", \
     "--keep-alive", "2", \
     "--max-requests", "1000", \
     "--max-requests-jitter", "50", \
     "--worker-class", "gthread", \
     "--worker-connections", "1000", \
     "--preload", \
     "gymapp.wsgi:application"] 