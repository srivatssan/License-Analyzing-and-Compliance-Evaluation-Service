#!/bin/bash
# Start the OSS License Analyzer application

echo "🚀 Starting OSS License Analyzer..."

# Check if port 8080 is already in use
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Port 8080 is already in use!"
    echo "To stop the existing process, run: ./scripts/stop.sh"
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "⚠️  Docker is not running. Please start Docker first."
    exit 1
fi

# Start the application
echo "Starting server on port 8080..."
npm start
