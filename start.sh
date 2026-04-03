#!/bin/bash

echo "🚀 Starting FluxTurn Platform..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker Desktop first.${NC}"
    exit 1
fi

echo -e "${BLUE}📦 Starting Backend Services (Docker)...${NC}"
cd backend

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  No .env file found. Creating from .env.example...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✅ Created .env file. Please update it with your credentials.${NC}"
fi

# Start all services with docker-compose
docker-compose up -d --build

# Wait for services to be healthy
echo -e "${BLUE}⏳ Waiting for services to be healthy...${NC}"
sleep 5

# Check if backend is healthy
echo -e "${BLUE}🔍 Checking service health...${NC}"
timeout=60
counter=0
while [ $counter -lt $timeout ]; do
    if docker-compose ps | grep -q "fluxturn-backend.*healthy"; then
        echo -e "${GREEN}✅ Backend is healthy!${NC}"
        break
    fi
    echo -n "."
    sleep 2
    ((counter+=2))
done

if [ $counter -ge $timeout ]; then
    echo -e "${RED}❌ Backend failed to start within ${timeout}s${NC}"
    echo -e "${YELLOW}Check logs with: docker-compose logs backend${NC}"
    exit 1
fi

# Show service URLs
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Backend Services Started Successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}🌐 Service URLs:${NC}"
echo -e "   • Backend API:    ${GREEN}http://localhost:3000${NC}"
echo -e "   • API Docs:       ${GREEN}http://localhost:3000/api/docs${NC} (admin/pass@aapp)"
echo -e "   • Health Check:   ${GREEN}http://localhost:3000/health${NC}"
echo -e "   • PostgreSQL:     ${GREEN}localhost:5433${NC}"
echo -e "   • Redis:          ${GREEN}localhost:6379${NC}"
echo -e "   • Qdrant:         ${GREEN}http://localhost:6333/dashboard${NC}"
echo ""

# Start frontend
cd ../frontend
echo -e "${BLUE}🎨 Starting Frontend (localhost)...${NC}"
echo ""

# Check if .env file exists in frontend
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  No frontend .env file found. Creating...${NC}"
    cat > .env << 'ENVEOF'
# FluxTurn Frontend Configuration
VITE_API_BASE_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
ENVEOF
    echo -e "${GREEN}✅ Created frontend .env file${NC}"
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
    npm install
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 Starting Frontend Dev Server...${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}   Frontend will be available at: ${GREEN}http://localhost:5173${NC}"
echo ""
echo -e "${YELLOW}💡 Tip: Press Ctrl+C to stop the frontend${NC}"
echo -e "${YELLOW}💡 To stop backend: cd backend && docker-compose down${NC}"
echo ""

# Start frontend dev server
npm run dev
