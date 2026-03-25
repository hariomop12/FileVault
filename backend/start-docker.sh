#!/bin/bash

# FileVault Docker Startup Script
# This script helps you start the FileVault project with Docker

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored message
print_message() {
    echo -e "${2}${1}${NC}"
}

# Print header
print_header() {
    echo ""
    print_message "========================================" "$BLUE"
    print_message "$1" "$BLUE"
    print_message "========================================" "$BLUE"
    echo ""
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_message "❌ Docker is not installed!" "$RED"
        print_message "Please install Docker from: https://docs.docker.com/get-docker/" "$YELLOW"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_message "❌ Docker Compose is not installed!" "$RED"
        print_message "Please install Docker Compose from: https://docs.docker.com/compose/install/" "$YELLOW"
        exit 1
    fi
    
    print_message "✅ Docker is installed" "$GREEN"
}

# Check if .env file exists
check_env() {
    if [ ! -f .env ]; then
        print_message "⚠️  .env file not found!" "$YELLOW"
        if [ -f .env.example ]; then
            print_message "Creating .env from .env.example..." "$BLUE"
            cp .env.example .env
            print_message "✅ .env file created. Please edit it with your credentials!" "$GREEN"
            print_message "Opening .env file for editing..." "$BLUE"
            ${EDITOR:-nano} .env
        else
            print_message "❌ .env.example not found. Please create .env manually!" "$RED"
            exit 1
        fi
    else
        print_message "✅ .env file found" "$GREEN"
    fi
}

# Show menu
show_menu() {
    print_header "🐳 FileVault Docker Manager"
    echo "Select an option:"
    echo ""
    echo "1) Start Development Mode (with hot reload)"
    echo "2) Start Production Mode (optimized)"
    echo "3) Stop All Services"
    echo "4) View Logs"
    echo "5) Rebuild All Services"
    echo "6) Clean Everything (⚠️  removes all data)"
    echo "7) Check Service Status"
    echo "8) Access Database Shell"
    echo "9) Run Database Migrations"
    echo "0) Exit"
    echo ""
}

# Start development mode
start_dev() {
    print_header "🚀 Starting Development Mode"
    print_message "This will start PostgreSQL + Backend + Frontend with hot reload..." "$BLUE"
    docker-compose -f docker-compose.dev.yml up -d
    print_message "✅ Services started!" "$GREEN"
    echo ""
    print_message "Access the application at:" "$BLUE"
    print_message "  Frontend: http://localhost:3001" "$GREEN"
    print_message "  Backend:  http://localhost:3000" "$GREEN"
    print_message "  Database: localhost:5432" "$GREEN"
    echo ""
    print_message "View logs with: docker-compose -f docker-compose.dev.yml logs -f" "$YELLOW"
}

# Start production mode
start_prod() {
    print_header "🚀 Starting Production Mode"
    print_message "This will start PostgreSQL + Backend + Frontend (optimized)..." "$BLUE"
    docker-compose -f docker-compose.prod.yml up -d
    print_message "✅ Services started!" "$GREEN"
    echo ""
    print_message "Access the application at:" "$BLUE"
    print_message "  Frontend: http://localhost" "$GREEN"
    print_message "  Backend:  http://localhost:3000" "$GREEN"
    print_message "  Database: localhost:5432" "$GREEN"
    echo ""
    print_message "View logs with: docker-compose -f docker-compose.prod.yml logs -f" "$YELLOW"
}

# Stop services
stop_services() {
    print_header "🛑 Stopping Services"
    if docker-compose -f docker-compose.dev.yml ps -q 2>/dev/null | grep -q .; then
        print_message "Stopping development services..." "$BLUE"
        docker-compose -f docker-compose.dev.yml down
    fi
    if docker-compose -f docker-compose.prod.yml ps -q 2>/dev/null | grep -q .; then
        print_message "Stopping production services..." "$BLUE"
        docker-compose -f docker-compose.prod.yml down
    fi
    print_message "✅ All services stopped!" "$GREEN"
}

# View logs
view_logs() {
    print_header "📋 View Logs"
    echo "Select which logs to view:"
    echo "1) Development logs"
    echo "2) Production logs"
    read -p "Enter choice: " log_choice
    
    case $log_choice in
        1)
            docker-compose -f docker-compose.dev.yml logs -f
            ;;
        2)
            docker-compose -f docker-compose.prod.yml logs -f
            ;;
        *)
            print_message "Invalid choice!" "$RED"
            ;;
    esac
}

# Rebuild services
rebuild_services() {
    print_header "🔨 Rebuild Services"
    echo "Select which environment to rebuild:"
    echo "1) Development"
    echo "2) Production"
    read -p "Enter choice: " rebuild_choice
    
    case $rebuild_choice in
        1)
            print_message "Rebuilding development services..." "$BLUE"
            docker-compose -f docker-compose.dev.yml build
            docker-compose -f docker-compose.dev.yml up -d
            print_message "✅ Development services rebuilt!" "$GREEN"
            ;;
        2)
            print_message "Rebuilding production services..." "$BLUE"
            docker-compose -f docker-compose.prod.yml build
            docker-compose -f docker-compose.prod.yml up -d
            print_message "✅ Production services rebuilt!" "$GREEN"
            ;;
        *)
            print_message "Invalid choice!" "$RED"
            ;;
    esac
}

# Clean everything
clean_all() {
    print_header "🧹 Clean Everything"
    print_message "⚠️  WARNING: This will remove all containers, volumes, and data!" "$RED"
    read -p "Are you sure? (yes/no): " confirm
    
    if [ "$confirm" = "yes" ]; then
        print_message "Cleaning development environment..." "$BLUE"
        docker-compose -f docker-compose.dev.yml down -v 2>/dev/null || true
        print_message "Cleaning production environment..." "$BLUE"
        docker-compose -f docker-compose.prod.yml down -v 2>/dev/null || true
        print_message "Removing FileVault images..." "$BLUE"
        docker images | grep filevault | awk '{print $3}' | xargs docker rmi -f 2>/dev/null || true
        print_message "✅ Everything cleaned!" "$GREEN"
    else
        print_message "Cancelled." "$YELLOW"
    fi
}

# Check status
check_status() {
    print_header "📊 Service Status"
    print_message "Development Services:" "$BLUE"
    docker-compose -f docker-compose.dev.yml ps 2>/dev/null || print_message "No development services running" "$YELLOW"
    echo ""
    print_message "Production Services:" "$BLUE"
    docker-compose -f docker-compose.prod.yml ps 2>/dev/null || print_message "No production services running" "$YELLOW"
}

# Access database
access_db() {
    print_header "🗄️  Database Shell"
    if docker ps | grep -q filevault-postgres; then
        print_message "Connecting to PostgreSQL..." "$BLUE"
        docker exec -it filevault-postgres psql -U filevault -d filevault
    else
        print_message "❌ PostgreSQL container is not running!" "$RED"
        print_message "Start the services first." "$YELLOW"
    fi
}

# Run migrations
run_migrations() {
    print_header "🔄 Running Database Migrations"
    if docker ps | grep -q filevault-backend; then
        print_message "Running migrations..." "$BLUE"
        docker exec -it filevault-backend npm run migrate
        print_message "✅ Migrations completed!" "$GREEN"
    else
        print_message "❌ Backend container is not running!" "$RED"
        print_message "Start the services first." "$YELLOW"
    fi
}

# Main script
main() {
    check_docker
    check_env
    
    while true; do
        show_menu
        read -p "Enter your choice: " choice
        
        case $choice in
            1)
                start_dev
                ;;
            2)
                start_prod
                ;;
            3)
                stop_services
                ;;
            4)
                view_logs
                ;;
            5)
                rebuild_services
                ;;
            6)
                clean_all
                ;;
            7)
                check_status
                ;;
            8)
                access_db
                ;;
            9)
                run_migrations
                ;;
            0)
                print_message "Goodbye! 👋" "$GREEN"
                exit 0
                ;;
            *)
                print_message "Invalid choice! Please try again." "$RED"
                ;;
        esac
        
        echo ""
        read -p "Press Enter to continue..."
    done
}

# Run main function
main
