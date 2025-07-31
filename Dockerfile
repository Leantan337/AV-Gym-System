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

# Create non-root user early
RUN adduser --disabled-password --gecos '' --shell /bin/sh appuser

# Install Python dependencies as appuser
USER appuser
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Runtime stage - minimal image
FROM python:3.11-slim

# Install only runtime dependencies
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
    netcat-traditional \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean \
    && apt-get autoremove -y

# Create non-root user
RUN adduser --disabled-password --gecos '' --shell /bin/sh appuser

# Copy Python packages from builder stage to appuser home
COPY --from=builder --chown=appuser:appuser /home/appuser/.local /home/appuser/.local

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/home/appuser/.local/lib/python3.11/site-packages \
    PATH=/home/appuser/.local/bin:$PATH \
    DJANGO_SETTINGS_MODULE=gymapp.settings

WORKDIR /app

# Copy application files
COPY --chown=appuser:appuser . .

# Copy and set permissions for entrypoint
COPY --chown=appuser:appuser entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Ensure appuser owns /app
RUN chown -R appuser:appuser /app

# Create necessary directories (collectstatic moved to entrypoint)
RUN mkdir -p /app/media /app/staticfiles

# Switch to non-root user
USER appuser

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:8000/health/ || exit 1

# Use entrypoint script
ENTRYPOINT ["/entrypoint.sh"]

# ASGI server for WebSocket support - using Daphne
CMD ["daphne", \
     "-b", "0.0.0.0", \
     "-p", "8000", \
     "--access-log", "-", \
     "--proxy-headers", \
     "gymapp.asgi:application"]