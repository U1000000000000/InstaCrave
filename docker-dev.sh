#!/bin/bash

# ============================================
# InstaCrave Docker Development Scripts
# ============================================
# Quick commands for common Docker operations
# ============================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ============================================
# Commands
# ============================================

# Start development environment
dev_up() {
    info "Starting InstaCrave development environment..."
    docker-compose up -d
    info "Services started!"
    info "Frontend: http://localhost:5173"
    info "Backend: http://localhost:3000"
    info "API Docs: http://localhost:3000/docs"
    docker-compose ps
}

# Stop development environment
dev_down() {
    info "Stopping InstaCrave development environment..."
    docker-compose down
    info "Services stopped!"
}

# Restart development environment
dev_restart() {
    info "Restarting InstaCrave development environment..."
    docker-compose restart
    info "Services restarted!"
}

# View logs
dev_logs() {
    if [ -z "$1" ]; then
        docker-compose logs -f
    else
        docker-compose logs -f "$1"
    fi
}

# Rebuild services
dev_rebuild() {
    info "Rebuilding services..."
    if [ -z "$1" ]; then
        docker-compose up --build -d
    else
        docker-compose up --build -d "$1"
    fi
    info "Rebuild complete!"
}

# Clean up (remove volumes)
dev_clean() {
    warn "This will remove all data (MongoDB, Redis)!"
    read -p "Are you sure? (yes/no): " confirm
    if [ "$confirm" = "yes" ]; then
        info "Cleaning up..."
        docker-compose down -v
        docker system prune -f
        info "Cleanup complete!"
    else
        info "Cleanup cancelled."
    fi
}

# Execute command in container
dev_exec() {
    if [ -z "$1" ] || [ -z "$2" ]; then
        error "Usage: ./docker-dev.sh exec <service> <command>"
        exit 1
    fi
    docker-compose exec "$1" "${@:2}"
}

# Run tests
dev_test() {
    info "Running tests in backend container..."
    docker-compose exec backend npm test
}

# Access MongoDB shell
dev_mongo() {
    info "Accessing MongoDB shell..."
    docker-compose exec mongodb mongosh -u admin -p admin123 instacrave
}

# Access Redis CLI
dev_redis() {
    info "Accessing Redis CLI..."
    docker-compose exec redis redis-cli -a redis123
}

# Check service health
dev_health() {
    info "Checking service health..."
    echo ""
    echo "=== Docker Compose Services ==="
    docker-compose ps
    echo ""
    echo "=== Backend Health ==="
    if command -v jq >/dev/null 2>&1; then
        curl -s http://localhost:3000/health | jq '.' || echo "Backend not responding"
    else
        curl -s http://localhost:3000/health || echo "Backend not responding"
    fi
    echo ""
    echo "=== Frontend Health ==="
    curl -s -o /dev/null -w "%{http_code}" http://localhost:5173 && echo " - Frontend OK" || echo "Frontend not responding"
}

# View resource usage
dev_stats() {
    docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"
}

# Help
show_help() {
    cat << EOF
InstaCrave Docker Development Scripts

Usage: ./docker-dev.sh <command>

Commands:
  up              Start all services
  down            Stop all services
  restart         Restart all services
  logs [service]  View logs (optional: specify service)
  rebuild [svc]   Rebuild and restart (optional: specify service)
  clean           Stop and remove all data (⚠️  destructive)
  exec <svc> <cmd> Execute command in container
  test            Run backend tests
  mongo           Access MongoDB shell
  redis           Access Redis CLI
  health          Check service health
  stats           View resource usage
  help            Show this help

Examples:
  ./docker-dev.sh up
  ./docker-dev.sh logs backend
  ./docker-dev.sh rebuild backend
  ./docker-dev.sh exec backend npm install express
  ./docker-dev.sh test

EOF
}

# ============================================
# Main
# ============================================

case "$1" in
    up)
        dev_up
        ;;
    down)
        dev_down
        ;;
    restart)
        dev_restart
        ;;
    logs)
        dev_logs "$2"
        ;;
    rebuild)
        dev_rebuild "$2"
        ;;
    clean)
        dev_clean
        ;;
    exec)
        dev_exec "${@:2}"
        ;;
    test)
        dev_test
        ;;
    mongo)
        dev_mongo
        ;;
    redis)
        dev_redis
        ;;
    health)
        dev_health
        ;;
    stats)
        dev_stats
        ;;
    help|--help|-h|"")
        show_help
        ;;
    *)
        error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac
