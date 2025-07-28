#!/bin/bash

# WebSocket Docker Testing Script
# ===============================
# Tests WebSocket functionality in your Docker environment

set -e

echo "🚀 WebSocket Docker Environment Testing"
echo "======================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
HOST=${HOST:-localhost}
NGINX_PORT=${NGINX_PORT:-80}
BACKEND_PORT=${BACKEND_PORT:-8000}
FRONTEND_PORT=${FRONTEND_PORT:-3000}

# Function to print status
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to test HTTP endpoint
test_http() {
    local url=$1
    local description=$2
    
    print_status "Testing $description: $url"
    
    if curl -s -f -m 10 "$url" > /dev/null; then
        print_success "$description is responding"
        return 0
    else
        print_error "$description is not responding"
        return 1
    fi
}

# Function to test WebSocket with wscat
test_websocket() {
    local ws_url=$1
    local description=$2
    
    print_status "Testing $description: $ws_url"
    
    # Check if wscat is installed
    if ! command -v wscat &> /dev/null; then
        print_warning "wscat not found. Installing..."
        npm install -g wscat 2>/dev/null || {
            print_error "Failed to install wscat. Please install Node.js and npm"
            return 1
        }
    fi
    
    # Test WebSocket connection
    timeout 10 wscat -c "$ws_url" --execute 'echo {"type":"ping"}' 2>/dev/null && {
        print_success "$description WebSocket connection successful"
        return 0
    } || {
        print_error "$description WebSocket connection failed"
        return 1
    }
}

# Function to check Docker containers
check_docker_containers() {
    print_status "Checking Docker containers..."
    
    # Check if containers are running
    containers=("web" "frontend" "nginx" "redis" "db")
    
    for container in "${containers[@]}"; do
        if docker-compose ps | grep -q "$container.*Up"; then
            print_success "Container $container is running"
        else
            print_error "Container $container is not running"
        fi
    done
}

# Function to check service health
check_service_health() {
    print_status "Checking service health..."
    
    # Test backend health
    test_http "http://$HOST:$BACKEND_PORT/health/" "Backend Health (Direct)"
    
    # Test frontend
    test_http "http://$HOST:$FRONTEND_PORT" "Frontend (Direct)"
    
    # Test nginx proxy
    test_http "http://$HOST:$NGINX_PORT/health/" "Backend Health (via Nginx)"
    test_http "http://$HOST:$NGINX_PORT" "Frontend (via Nginx)"
}

# Function to test WebSocket connections
test_websocket_connections() {
    print_status "Testing WebSocket connections..."
    
    # Test direct backend WebSocket
    print_status "Testing direct backend WebSocket..."
    test_websocket "ws://$HOST:$BACKEND_PORT/ws/checkins/?token=test" "Direct Backend WebSocket"
    
    # Test nginx-proxied WebSocket
    print_status "Testing nginx-proxied WebSocket..."
    test_websocket "ws://$HOST:$NGINX_PORT/ws/checkins/?token=test" "Nginx-Proxied WebSocket"
}

# Function to check network connectivity
check_network() {
    print_status "Checking network connectivity..."
    
    # Check if ports are accessible
    ports=($NGINX_PORT $BACKEND_PORT $FRONTEND_PORT)
    
    for port in "${ports[@]}"; do
        if nc -z "$HOST" "$port" 2>/dev/null; then
            print_success "Port $port is accessible"
        else
            print_error "Port $port is not accessible"
        fi
    done
}

# Function to check logs for errors
check_logs() {
    print_status "Checking recent logs for errors..."
    
    # Check web service logs
    print_status "Web service logs (last 20 lines):"
    docker-compose logs --tail=20 web | grep -E "(ERROR|CRITICAL|WebSocket)" || print_warning "No recent errors in web logs"
    
    # Check nginx logs
    print_status "Nginx logs (last 20 lines):"
    docker-compose logs --tail=20 nginx | grep -E "(error|ERROR)" || print_warning "No recent errors in nginx logs"
}

# Function to run Python WebSocket debugging
run_python_debug() {
    print_status "Running Python WebSocket debugging..."
    
    if [ -f "debug-websocket.py" ]; then
        python3 debug-websocket.py --host "$HOST" --port "$NGINX_PORT" || {
            print_error "Python debugging script failed"
        }
    else
        print_warning "debug-websocket.py not found, skipping Python tests"
    fi
}

# Function to generate recommendations
generate_recommendations() {
    print_status "Generating recommendations..."
    
    echo ""
    echo "🔧 TROUBLESHOOTING RECOMMENDATIONS"
    echo "=================================="
    
    echo "If WebSocket connections are failing:"
    echo "1. Restart Docker containers: docker-compose restart"
    echo "2. Check nginx configuration: docker-compose logs nginx"
    echo "3. Verify WebSocket proxy settings in nginx.conf"
    echo "4. Check Django Channels configuration in settings.py"
    echo "5. Ensure Redis is running for Django Channels"
    echo ""
    
    echo "For development with hot-reload:"
    echo "1. Use: docker-compose -f docker-compose.dev.yml up"
    echo "2. This enables live code changes without rebuilds"
    echo ""
    
    echo "For production deployment:"
    echo "1. Use: docker-compose up -d --build"
    echo "2. Check SSL certificates if using HTTPS"
    echo ""
    
    echo "Common issues and fixes:"
    echo "- Port conflicts: Check if ports 80, 3000, 8000 are available"
    echo "- Network issues: Verify Docker network settings"
    echo "- Authentication: Check JWT token generation and validation"
    echo "- CORS issues: Verify CORS settings in Django settings.py"
}

# Main testing flow
main() {
    echo "Starting comprehensive WebSocket testing..."
    echo "Host: $HOST"
    echo "Nginx Port: $NGINX_PORT"
    echo "Backend Port: $BACKEND_PORT"
    echo "Frontend Port: $FRONTEND_PORT"
    echo ""
    
    # Run all tests
    check_docker_containers
    echo ""
    
    check_network
    echo ""
    
    check_service_health
    echo ""
    
    test_websocket_connections
    echo ""
    
    check_logs
    echo ""
    
    run_python_debug
    echo ""
    
    generate_recommendations
    
    print_success "WebSocket testing completed!"
    echo "Check websocket_diagnostic_report.json for detailed results"
}

# Handle command line arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [options]"
        echo "Options:"
        echo "  --help, -h          Show this help message"
        echo "  --host HOST         Set host (default: localhost)"
        echo "  --nginx-port PORT   Set nginx port (default: 80)"
        echo "  --backend-port PORT Set backend port (default: 8000)"
        echo "  --frontend-port PORT Set frontend port (default: 3000)"
        echo ""
        echo "Environment variables:"
        echo "  HOST, NGINX_PORT, BACKEND_PORT, FRONTEND_PORT"
        exit 0
        ;;
    --host)
        HOST="$2"
        shift 2
        ;;
    --nginx-port)
        NGINX_PORT="$2"
        shift 2
        ;;
    --backend-port)
        BACKEND_PORT="$2"
        shift 2
        ;;
    --frontend-port)
        FRONTEND_PORT="$2"
        shift 2
        ;;
esac

# Make sure we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    print_error "docker-compose.yml not found. Please run this script from the project root."
    exit 1
fi

# Install dependencies if needed
if ! command -v nc &> /dev/null; then
    print_warning "netcat not found. Some network tests may fail."
fi

if ! command -v curl &> /dev/null; then
    print_error "curl not found. Please install curl to run HTTP tests."
    exit 1
fi

# Run main testing
main "$@" 