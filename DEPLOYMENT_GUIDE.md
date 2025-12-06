# Deployment Guide - OSS License Analyzer

## 🚀 Running the Application

### Quick Start

```bash
# Start the application
npm start

# Or with auto-reload for development
npm run dev
```

### Using Helper Scripts

```bash
# Start the application
./scripts/start.sh

# Stop the application
./scripts/stop.sh

# Restart the application
./scripts/restart.sh

# Check application status
./scripts/status.sh
```

### Using npm Scripts

```bash
# Stop the application
npm run stop

# Restart the application
npm run restart

# Check port status
npm run status
```

---

## 🛑 Stopping the Application

### Method 1: Using Helper Script (Recommended)
```bash
./scripts/stop.sh
```
This script:
1. Tries graceful shutdown via API
2. Falls back to force kill if needed
3. Verifies the process is stopped

### Method 2: Using npm Script
```bash
npm run stop
```

### Method 3: Kill by Port
```bash
# Find and kill process on port 8080
lsof -ti:8080 | xargs kill -9
```

### Method 4: Using Shutdown API
```bash
curl -X POST http://localhost:8080/api/shutdown \
  -H "X-API-Key: dummy-key"
```

### Method 5: Manual Kill
```bash
# Find the process
ps aux | grep "node src/server.js"

# Kill by PID
kill -9 <PID>
```

---

## 📊 Checking Application Status

### Method 1: Using Status Script
```bash
./scripts/status.sh
```

### Method 2: Check Port
```bash
lsof -i:8080
```

### Method 3: Health Endpoint
```bash
curl http://localhost:8080/health
```

---

## 🔄 Production Deployment Options

### Option 1: PM2 (Recommended for Production)

**Install PM2:**
```bash
npm install -g pm2
```

**Start with PM2:**
```bash
# Start the application
pm2 start src/server.js --name oss-license-analyzer

# Start with environment variables
pm2 start src/server.js --name oss-license-analyzer --env production

# View logs
pm2 logs oss-license-analyzer

# Monitor
pm2 monit

# Stop
pm2 stop oss-license-analyzer

# Restart
pm2 restart oss-license-analyzer

# Delete from PM2
pm2 delete oss-license-analyzer

# Save PM2 configuration
pm2 save

# Auto-start on system boot
pm2 startup
```

**Create PM2 Ecosystem File:**
```bash
# Create ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'oss-license-analyzer',
    script: './src/server.js',
    instances: 1,
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'development',
      PORT: 8080
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 8080
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};
EOF

# Start with ecosystem file
pm2 start ecosystem.config.js --env production
```

### Option 2: Docker

**Create Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p data logs

# Expose port
EXPOSE 8080

# Set environment
ENV NODE_ENV=production

# Start application
CMD ["node", "src/server.js"]
```

**Build and Run:**
```bash
# Build image
docker build -t oss-license-analyzer:latest .

# Run container
docker run -d \
  --name oss-license-analyzer \
  -p 8080:8080 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /tmp/oss-analyzer:/tmp/oss-analyzer \
  --env-file .env \
  oss-license-analyzer:latest

# View logs
docker logs -f oss-license-analyzer

# Stop
docker stop oss-license-analyzer

# Remove
docker rm oss-license-analyzer
```

**Docker Compose:**
```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    container_name: oss-license-analyzer
    ports:
      - "8080:8080"
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
      - /var/run/docker.sock:/var/run/docker.sock
      - /tmp/oss-analyzer:/tmp/oss-analyzer
    env_file:
      - .env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3

# Run with:
# docker-compose up -d
# docker-compose down
# docker-compose logs -f
```

### Option 3: systemd (Linux)

**Create systemd service:**
```bash
sudo nano /etc/systemd/system/oss-license-analyzer.service
```

**Service file content:**
```ini
[Unit]
Description=OSS License Analyzer
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/oss-license-analyzer
Environment=NODE_ENV=production
ExecStart=/usr/bin/node src/server.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=oss-license-analyzer

[Install]
WantedBy=multi-user.target
```

**Manage service:**
```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable auto-start
sudo systemctl enable oss-license-analyzer

# Start service
sudo systemctl start oss-license-analyzer

# Stop service
sudo systemctl stop oss-license-analyzer

# Restart service
sudo systemctl restart oss-license-analyzer

# Check status
sudo systemctl status oss-license-analyzer

# View logs
sudo journalctl -u oss-license-analyzer -f
```

---

## 🔍 Troubleshooting

### Port Already in Use
```bash
# Find what's using port 8080
lsof -i:8080

# Kill the process
lsof -ti:8080 | xargs kill -9
```

### Application Won't Start
```bash
# Check logs
tail -f logs/app.log
tail -f logs/error.log

# Verify environment variables
cat .env

# Check Docker is running
docker info

# Verify ORT image exists
docker images | grep ort
```

### Database Issues
```bash
# Remove database and restart
rm data/paacdb.sqlite
npm start
```

### Memory Issues
```bash
# Increase Node.js memory limit
node --max-old-space-size=4096 src/server.js
```

---

## 📝 Environment Variables

Key variables in `.env`:

```bash
# Server
PORT=8080
NODE_ENV=development

# Database
DATABASE_PATH=./data/paacdb.sqlite

# GitHub
GITHUB_TOKEN=your_token_here

# Policy
APPROVED_LICENSES=MIT,Apache-2.0,...
DENIED_LICENSES=SSPL-1.0,BSL-1.1,...

# Docker
DOCKER_IMAGE=ghcr.io/oss-review-toolkit/ort:latest
ANALYZER_WORK_DIR=/tmp/oss-analyzer

# Security
SHUTDOWN_API_KEY=your_secure_key

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log
```

---

## 🔒 Security Considerations

### Production Checklist

- [ ] Change `SHUTDOWN_API_KEY` to a strong random value
- [ ] Rotate GitHub token regularly
- [ ] Set `NODE_ENV=production`
- [ ] Use HTTPS with reverse proxy (nginx/Apache)
- [ ] Enable firewall rules
- [ ] Set up log rotation
- [ ] Configure rate limiting
- [ ] Add authentication middleware
- [ ] Review CORS settings
- [ ] Keep dependencies updated

### Reverse Proxy (nginx) Example

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

---

## 📈 Monitoring

### Log Files
- `logs/app.log` - Application logs
- `logs/error.log` - Error logs
- `logs/pm2-out.log` - PM2 stdout (if using PM2)
- `logs/pm2-error.log` - PM2 stderr (if using PM2)

### Health Checks
```bash
# Application health
curl http://localhost:8080/health

# SPDX registry health
curl http://localhost:8080/api/spdx/stats

# Database health
sqlite3 data/paacdb.sqlite "SELECT COUNT(*) FROM compliance_run;"
```

---

## 🚨 Quick Commands Reference

```bash
# Start
npm start                    # Standard start
npm run dev                  # Development mode with auto-reload
./scripts/start.sh          # With pre-checks

# Stop
npm run stop                # Kill by port
./scripts/stop.sh          # Graceful shutdown
Ctrl+C                      # If running in foreground

# Status
npm run status              # Check port
./scripts/status.sh        # Full status check
curl http://localhost:8080/health  # Health endpoint

# Restart
npm run restart            # Stop + Start
./scripts/restart.sh      # Using helper script
pm2 restart oss-license-analyzer  # If using PM2

# Logs
tail -f logs/app.log       # Application logs
tail -f logs/error.log     # Error logs
pm2 logs                   # If using PM2
docker logs -f <container> # If using Docker
```
