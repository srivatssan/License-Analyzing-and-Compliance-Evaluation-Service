#!/bin/bash
# Check status of OSS License Analyzer application

echo "📊 OSS License Analyzer Status"
echo "================================"

# Check if port 8080 is in use
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null ; then
    PID=$(lsof -ti:8080)
    echo "✅ Application is RUNNING"
    echo "   PID: $PID"
    echo "   Port: 8080"
    echo "   URL: http://localhost:8080"

    # Get process details
    echo ""
    echo "Process Details:"
    ps -p $PID -o pid,ppid,%cpu,%mem,etime,command

    # Check health endpoint
    echo ""
    echo "Health Check:"
    if curl -s http://localhost:8080/health -m 5 > /dev/null 2>&1; then
        curl -s http://localhost:8080/health | python3 -m json.tool
    else
        echo "⚠️  Health endpoint not responding"
    fi
else
    echo "❌ Application is NOT RUNNING"
fi

echo ""
echo "Docker Status:"
if docker info > /dev/null 2>&1; then
    echo "✅ Docker is running"

    # Check for ORT image
    if docker images | grep -q "oss-review-toolkit/ort"; then
        echo "✅ ORT image is available"
        docker images | grep "oss-review-toolkit/ort" | head -1
    else
        echo "⚠️  ORT image not found"
    fi
else
    echo "❌ Docker is not running"
fi
