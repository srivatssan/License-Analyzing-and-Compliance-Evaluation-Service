#!/bin/bash
# Stop the OSS License Analyzer application

echo "🛑 Stopping OSS License Analyzer..."

# Check if anything is running on port 8080
if ! lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null ; then
    echo "✅ No process running on port 8080"
    exit 0
fi

# Try graceful shutdown via API first
echo "Attempting graceful shutdown via API..."
if curl -X POST http://localhost:8080/api/shutdown \
    -H "X-API-Key: dummy-key" \
    -m 5 -f > /dev/null 2>&1; then
    echo "✅ Graceful shutdown initiated"
    sleep 2

    # Check if still running
    if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null ; then
        echo "Process still running, forcing shutdown..."
        lsof -ti:8080 | xargs kill -9
    fi
else
    echo "⚠️  Graceful shutdown failed, forcing shutdown..."
    lsof -ti:8080 | xargs kill -9
fi

echo "✅ Application stopped"
