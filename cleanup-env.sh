#!/bin/bash

# ==========================================
# CLEANUP OLD ENVIRONMENT FILES
# ==========================================

echo "🧹 Cleaning up old environment files..."

# Backup existing files
if [ -f ".env" ]; then
    echo "📦 Backing up .env to .env.backup.$(date +%Y%m%d_%H%M%S)"
    mv .env .env.backup.$(date +%Y%m%d_%H%M%S)
fi

if [ -f ".env.production" ]; then
    echo "📦 Backing up .env.production to .env.production.backup.$(date +%Y%m%d_%H%M%S)"
    mv .env.production .env.production.backup.$(date +%Y%m%d_%H%M%S)
fi

# Copy unified environment as the main .env
if [ -f ".env.unified" ]; then
    echo "✅ Setting up .env.unified as main environment file"
    cp .env.unified .env
    echo "✅ Environment unified successfully!"
else
    echo "❌ .env.unified not found!"
    exit 1
fi

echo ""
echo "🎉 Environment cleanup complete!"
echo "Now using single .env.unified file for all environments."
