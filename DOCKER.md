# Docker Deployment Guide for LACES

This guide explains how to run LACES (License Analyzing and Compliance Evaluation Service) using Docker and Docker Compose.

## Overview

The Docker setup includes:
- **LACES Application Container**: Node.js application with Express.js
- **ORT Integration**: Spawns OSS Review Toolkit containers on-demand for analysis
- **Persistent Volumes**: Database and logs persist across container restarts
- **Health Checks**: Automatic health monitoring

## Prerequisites

### Required Software
- **Docker Desktop** 20.10+ or **Docker Engine** 20.10+
- **Docker Compose** 1.29+ (included with Docker Desktop)
- **Git** (for cloning the repository)

### System Requirements
- **RAM**: Minimum 4GB, recommended 8GB (for ORT analysis)
- **Disk Space**: Minimum 5GB free space
- **OS**: Linux, macOS, or Windows with WSL2

### Installation

#### macOS
```bash
# Install Docker Desktop
brew install --cask docker

# Start Docker Desktop from Applications folder
open /Applications/Docker.app
```

#### Linux (Ubuntu/Debian)
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Restart to apply group changes
sudo systemctl restart docker
```

#### Windows
```powershell
# Install Docker Desktop from https://www.docker.com/products/docker-desktop
# Ensure WSL2 is enabled
```

## Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/srivatssan/License-Analyzing-and-Compliance-Evaluation-Service.git
cd License-Analyzing-and-Compliance-Evaluation-Service
```

### 2. Configure Environment (Optional)
```bash
# Create .env file for custom configuration
cp .env.docker .env

# Edit .env to set GitHub token (optional but recommended)
nano .env
```

**Recommended .env configuration:**
```bash
SHUTDOWN_API_KEY=my-secure-random-key-123
GITHUB_TOKEN=ghp_your_github_personal_access_token
```

### 3. Pull ORT Docker Image
```bash
# Pre-pull the ORT image (saves time on first analysis)
docker pull ghcr.io/oss-review-toolkit/ort:latest
```

### 4. Build and Start the Application
```bash
# Build and start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f
```

### 5. Access the Application
Open your browser and navigate to:
```
http://localhost:8080
```

## Docker Commands Reference

### Starting the Application
```bash
# Build and start (first time)
docker-compose up --build -d

# Start (subsequent times)
docker-compose up -d

# Start with logs visible
docker-compose up
```

### Stopping the Application
```bash
# Stop containers (preserves data)
docker-compose stop

# Stop and remove containers (preserves data in volumes)
docker-compose down

# Stop and remove everything including volumes (DELETES ALL DATA)
docker-compose down -v
```

### Viewing Logs
```bash
# View all logs
docker-compose logs

# Follow logs in real-time
docker-compose logs -f

# View last 100 lines
docker-compose logs --tail=100

# View logs for specific service
docker-compose logs laces-app
```

### Managing Containers
```bash
# List running containers
docker-compose ps

# Restart application
docker-compose restart

# Rebuild after code changes
docker-compose up --build -d

# Execute command in running container
docker-compose exec laces-app sh
```

### Inspecting the Application
```bash
# Check application health
curl http://localhost:8080/health

# View container resource usage
docker stats laces-app

# Inspect container details
docker inspect laces-app
```

### Database and Volume Management
```bash
# List volumes
docker volume ls

# Inspect database volume
docker volume inspect oss-license-analyzer_laces-data

# Backup database
docker run --rm -v oss-license-analyzer_laces-data:/data -v $(pwd):/backup alpine tar czf /backup/laces-db-backup.tar.gz -C /data .

# Restore database
docker run --rm -v oss-license-analyzer_laces-data:/data -v $(pwd):/backup alpine tar xzf /backup/laces-db-backup.tar.gz -C /data
```

## Architecture

### Container Communication

```
┌────────────────────────────────────────────────┐
│              Host Machine                      │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │     LACES Container (laces-app)          │ │
│  │                                          │ │
│  │  ┌────────────────────────────────────┐ │ │
│  │  │   Node.js/Express Application      │ │ │
│  │  │   - Port 8080                      │ │ │
│  │  │   - REST API                       │ │ │
│  │  │   - Web UI                         │ │ │
│  │  └────────────────┬───────────────────┘ │ │
│  │                   │                      │ │
│  │                   ▼                      │ │
│  │  ┌────────────────────────────────────┐ │ │
│  │  │   Docker Socket Access             │ │ │
│  │  │   /var/run/docker.sock             │ │ │
│  │  └────────────────┬───────────────────┘ │ │
│  └───────────────────┼──────────────────────┘ │
│                      │                         │
│                      ▼                         │
│  ┌──────────────────────────────────────────┐ │
│  │  ORT Containers (ephemeral)              │ │
│  │  - Spawned on-demand                     │ │
│  │  - Analyze manifests                     │ │
│  │  - Auto-removed after completion         │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │  Persistent Volumes                      │ │
│  │  - laces-data (database)                 │ │
│  │  - laces-logs (application logs)         │ │
│  │  - ort-workspace (analysis temp files)   │ │
│  └──────────────────────────────────────────┘ │
└────────────────────────────────────────────────┘
```

### Volume Mounts

| Volume | Purpose | Container Path | Persistence |
|--------|---------|----------------|-------------|
| `laces-data` | SQLite database | `/app/data` | Persistent |
| `laces-logs` | Application logs | `/app/logs` | Persistent |
| `ort-workspace` | ORT analysis temp | `/tmp/oss-analyzer` | Persistent |
| `docker.sock` | Docker API access | `/var/run/docker.sock` | Host mount |

### Port Mapping

| Host Port | Container Port | Service |
|-----------|----------------|---------|
| 8080 | 8080 | LACES Web UI & API |

## Environment Variables

### Required Variables

None - the application works with defaults!

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GITHUB_TOKEN` | (empty) | GitHub personal access token for higher API rate limits |
| `SHUTDOWN_API_KEY` | `dummy-key` | API key for graceful shutdown endpoint |

### Advanced Configuration

Edit `docker-compose.yml` to modify:

```yaml
environment:
  - PORT=8080                    # Application port
  - NODE_ENV=production          # Environment mode
  - DATABASE_PATH=/app/data/paacdb.sqlite
  - LOG_FILE=/app/logs/app.log
  - APPROVED_LICENSES=MIT,Apache-2.0,...
  - DENIED_LICENSES=GPL-3.0,AGPL-3.0,...
```

## Troubleshooting

### Container Won't Start

**Problem**: Container exits immediately

**Solution**:
```bash
# Check logs for errors
docker-compose logs laces-app

# Verify Docker is running
docker ps

# Check if port is already in use
lsof -i :8080  # macOS/Linux
netstat -ano | findstr :8080  # Windows
```

### ORT Analysis Fails

**Problem**: Repository analysis returns errors

**Solution**:
```bash
# Verify ORT image is available
docker pull ghcr.io/oss-review-toolkit/ort:latest

# Check Docker socket permissions
ls -la /var/run/docker.sock

# Inspect ORT container logs (if still running)
docker ps -a | grep ort
docker logs <ort-container-id>
```

### Cannot Access Application

**Problem**: Browser shows "connection refused"

**Solution**:
```bash
# Check if container is running
docker-compose ps

# Verify health check status
docker inspect laces-app | grep Health

# Check port mapping
docker port laces-app

# Test directly with curl
curl http://localhost:8080/health
```

### Database Issues

**Problem**: Data not persisting or corruption

**Solution**:
```bash
# Check volume exists
docker volume ls | grep laces-data

# Inspect volume
docker volume inspect oss-license-analyzer_laces-data

# Reset database (DELETES ALL DATA)
docker-compose down
docker volume rm oss-license-analyzer_laces-data
docker-compose up -d
```

### High Memory Usage

**Problem**: Container using too much RAM

**Solution**:
```bash
# Check current usage
docker stats laces-app

# Set memory limits in docker-compose.yml
services:
  laces-app:
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G
```

### Docker Socket Permission Denied

**Problem**: Cannot spawn ORT containers

**Solution**:
```bash
# Linux/macOS: Add user to docker group
sudo usermod -aG docker $USER

# Restart Docker service
sudo systemctl restart docker

# Log out and back in

# Verify access
docker ps
```

## Production Deployment

### Best Practices

1. **Use a Reverse Proxy**:
```yaml
# Example nginx configuration
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - laces-app
```

2. **Enable HTTPS**:
   - Use Let's Encrypt for free SSL certificates
   - Configure nginx or traefik as reverse proxy

3. **Set Strong Secrets**:
```bash
# Generate secure API key
export SHUTDOWN_API_KEY=$(openssl rand -hex 32)
```

4. **Resource Limits**:
```yaml
deploy:
  resources:
    limits:
      cpus: '2.0'
      memory: 4G
```

5. **Regular Backups**:
```bash
# Add to crontab
0 2 * * * docker run --rm -v oss-license-analyzer_laces-data:/data -v /backups:/backup alpine tar czf /backup/laces-$(date +\%Y\%m\%d).tar.gz -C /data .
```

### Monitoring

```yaml
# Add monitoring service
services:
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
```

## Updating the Application

### Pull Latest Code
```bash
# Stop application
docker-compose down

# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose up --build -d

# Verify
docker-compose logs -f
```

### Update ORT Image
```bash
# Pull latest ORT image
docker pull ghcr.io/oss-review-toolkit/ort:latest

# Restart application
docker-compose restart
```

## Uninstalling

### Remove Everything
```bash
# Stop and remove containers
docker-compose down

# Remove all volumes (DELETES ALL DATA)
docker volume rm oss-license-analyzer_laces-data
docker volume rm oss-license-analyzer_laces-logs
docker volume rm oss-license-analyzer_ort-workspace

# Remove ORT image (optional)
docker rmi ghcr.io/oss-review-toolkit/ort:latest

# Remove application image
docker rmi oss-license-analyzer_laces-app
```

## FAQ

**Q: Can I run this on ARM (Apple Silicon)?**
A: Yes! The Node.js base image supports ARM64. However, ORT performance may vary.

**Q: How much disk space do I need?**
A: Minimum 5GB:
- Application image: ~500MB
- ORT image: ~2GB
- Working directories: ~1-2GB
- Logs and database: ~100MB

**Q: Can I use a different port?**
A: Yes! Edit `docker-compose.yml`:
```yaml
ports:
  - "3000:8080"  # Host:Container
```

**Q: How do I access the container shell?**
A: Use:
```bash
docker-compose exec laces-app sh
```

**Q: Can I run multiple instances?**
A: Yes, but change the port and container names in `docker-compose.yml`

## Support

For issues related to:
- **Docker setup**: Check this document
- **Application bugs**: Open an issue on GitHub
- **ORT questions**: Visit https://github.com/oss-review-toolkit/ort

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [ORT Documentation](https://oss-review-toolkit.org/)
- [LACES GitHub Repository](https://github.com/srivatssan/License-Analyzing-and-Compliance-Evaluation-Service)
