#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to print colored messages
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to check if a command exists
check_command() {
    if ! command -v $1 &> /dev/null; then
        print_message $RED "Error: $1 is required but not installed."
        exit 1
    fi
}

# Check required commands
check_command "docker"
check_command "docker-compose"
check_command "openssl"

# Create required directories
print_message $YELLOW "Creating required directories..."
mkdir -p logs data/blocks data/state certs
chmod 755 logs data/blocks data/state

# Generate self-signed certificates for development
if [ ! -f certs/server.crt ] || [ ! -f certs/server.key ]; then
    print_message $YELLOW "Generating self-signed certificates..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout certs/server.key \
        -out certs/server.crt \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    print_message $YELLOW "Creating .env file..."
    cat > .env << EOF
NODE_ENV=production
PORT=10000
HOST=0.0.0.0
MONGODB_URI=mongodb://mongo:27017/integr8
REDIS_URL=redis://redis:6379
SEED_PEERS=
MAX_PEERS=10
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
LOG_LEVEL=info
EOF
fi

# Start services
print_message $YELLOW "Starting services..."
docker-compose up -d

# Wait for services to be healthy
print_message $YELLOW "Waiting for services to be ready..."
sleep 10

# Check service health
check_service() {
    local service=$1
    if docker-compose ps $service | grep -q "Up"; then
        print_message $GREEN "$service is running"
    else
        print_message $RED "$service failed to start"
        exit 1
    fi
}

services=("node" "mongo" "redis" "nginx" "prometheus" "grafana")
for service in "${services[@]}"; do
    check_service $service
done

print_message $GREEN "Deployment complete! Services are running."
print_message $YELLOW "
Access points:
- API: https://localhost
- Metrics: http://localhost:9090
- Monitoring: http://localhost:3000
"