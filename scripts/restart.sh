#!/bin/bash
# Restart the OSS License Analyzer application

echo "🔄 Restarting OSS License Analyzer..."

# Stop the application
./scripts/stop.sh

# Wait a moment
sleep 2

# Start the application
./scripts/start.sh
