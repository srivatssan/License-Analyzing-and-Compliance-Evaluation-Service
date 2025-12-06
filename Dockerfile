# Multi-stage build for optimized production image
FROM node:18-alpine AS base

# Install system dependencies needed for native modules
RUN apk add --no-cache \
    git \
    python3 \
    make \
    g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
FROM base AS dependencies
RUN npm install --only=production && \
    npm cache clean --force

# Development stage
FROM base AS development
RUN npm install
COPY . .
EXPOSE 8080
CMD ["npm", "run", "dev"]

# Production stage
FROM base AS production

# Copy production dependencies
COPY --from=dependencies /app/node_modules ./node_modules

# Copy application files
COPY . .

# Create necessary directories
RUN mkdir -p /app/data /app/logs /tmp/oss-analyzer && \
    chown -R node:node /app /tmp/oss-analyzer

# Use non-root user for security
USER node

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "src/server.js"]
