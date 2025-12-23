#!/bin/bash

# HomeLab Indexer - Development Quick Start
# Usage: ./dev.sh [command]

set -e

CMD=${1:-start}

case $CMD in
  start)
    echo "🚀 Starting HomeLab Indexer (Development)"
    echo ""
    echo "Make sure to have 3 terminals open and run:"
    echo ""
    echo "Terminal 1: npm run -w apps/api dev"
    echo "Terminal 2: npm run -w apps/ui dev"
    echo "Terminal 3: npm run -w apps/scanner dev"
    echo ""
    echo "Or simply run: npm run dev (in one terminal)"
    ;;

  docker)
    echo "🐳 Starting with Docker Compose..."
    cp .env.example .env 2>/dev/null || true
    docker-compose up -d
    echo "✅ Stack started"
    echo "   UI:  http://localhost:5173"
    echo "   API: http://localhost:3001"
    ;;

  stop)
    echo "🛑 Stopping..."
    docker-compose down 2>/dev/null || true
    echo "✅ Stopped"
    ;;

  db:reset)
    echo "🗄️  Resetting database..."
    docker-compose down -v 2>/dev/null || true
    rm -rf data/indexer.db 2>/dev/null || true
    echo "✅ Database reset"
    ;;

  db:migrate)
    echo "📦 Running migrations..."
    npm run db:migrate
    echo "✅ Migrations completed"
    ;;

  logs)
    echo "📊 Showing logs..."
    docker-compose logs -f
    ;;

  test)
    echo "🧪 Running tests..."
    npm run test:acceptance
    ;;

  scan)
    echo "🔍 Triggering manual scan..."
    curl -X POST http://localhost:3001/scanner/scan-now \
      -H "Content-Type: application/json" \
      -d '{"subnets": ["192.168.1.0/24"]}'
    echo ""
    ;;

  *)
    echo "Unknown command: $CMD"
    echo ""
    echo "Available commands:"
    echo "  ./dev.sh start         - Show dev setup instructions"
    echo "  ./dev.sh docker        - Start with Docker Compose"
    echo "  ./dev.sh stop          - Stop containers"
    echo "  ./dev.sh db:reset      - Reset database"
    echo "  ./dev.sh db:migrate    - Run migrations"
    echo "  ./dev.sh logs          - Show logs"
    echo "  ./dev.sh test          - Run tests"
    echo "  ./dev.sh scan          - Trigger scan"
    ;;
esac
