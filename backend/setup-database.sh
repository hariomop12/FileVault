#!/bin/bash

# FileVault Database Setup Script
# This script helps you set up the database with all required tables

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  FileVault Database Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Ask which database to use
echo "Which database do you want to use?"
echo "1) Docker PostgreSQL (localhost:5433)"
echo "2) Aiven PostgreSQL (cloud)"
echo ""
read -p "Enter choice (1 or 2): " db_choice

if [ "$db_choice" = "1" ]; then
    echo -e "${BLUE}Using Docker PostgreSQL...${NC}"
    DB_URL="postgresql://filevault:filevault123@postgres:5432/filevault"
    
    echo -e "${YELLOW}Running migrations inside Docker container...${NC}"
    docker exec -it filevault-backend psql "$DB_URL" -f /app/db/schema.sql
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Database schema created successfully!${NC}"
    else
        echo -e "${RED}❌ Failed to create schema${NC}"
        exit 1
    fi
    
elif [ "$db_choice" = "2" ]; then
    echo -e "${BLUE}Using Aiven PostgreSQL...${NC}"
    echo ""
    echo -e "${YELLOW}Please enter your Aiven database password:${NC}"
    read -s AIVEN_PASSWORD
    
    DB_URL="postgresql://avnadmin:${AIVEN_PASSWORD}@hariomop-hariomvirkhare02-01f9.l.aivencloud.com:19233/filevault?sslmode=require"
    
    echo ""
    echo -e "${YELLOW}Running migrations on Aiven database...${NC}"
    
    # Run from host if psql is available
    if command -v psql &> /dev/null; then
        psql "$DB_URL" -f db/schema.sql
    else
        # Run from Docker container
        docker exec -i filevault-backend psql "$DB_URL" -f /app/db/schema.sql
    fi
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Database schema created successfully!${NC}"
    else
        echo -e "${RED}❌ Failed to create schema${NC}"
        exit 1
    fi
else
    echo -e "${RED}Invalid choice!${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Restart backend: docker-compose -f docker-compose.dev.yml restart backend"
echo "2. Try uploading a file!"
echo ""
