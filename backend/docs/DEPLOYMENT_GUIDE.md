# FileVault Deployment Guide

## 🚀 Deployment Overview

This guide covers deploying FileVault using Docker containers with GitHub Actions CI/CD pipeline.

## 📋 Prerequisites

- GitHub repository with FileVault code
- Docker runtime environment (production server)
- PostgreSQL database (external service recommended)
- Cloudflare R2 bucket configured
- GitHub Container Registry access

## 🔧 Setup Instructions

### 1. Environment Configuration

Copy the production environment template:
```bash
cp .env.production.template .env.production
```

Fill in your actual values in `.env.production`:
- Database connection details
- Cloudflare R2 credentials
- JWT secret (generate a secure 32+ character string)
- Allowed origins for CORS

### 2. GitHub Repository Secrets

Add the following secrets to your GitHub repository (Settings → Secrets and variables → Actions):

**Required for CI/CD:**
- `GITHUB_TOKEN` (automatically provided by GitHub)

**Optional for advanced deployment:**
- `DOCKER_REGISTRY_PASSWORD` (if using external registry)
- `DEPLOY_SSH_KEY` (for automated server deployment)

### 3. Database Setup

Create your production PostgreSQL database and run the schema:
```sql
-- Connect to your PostgreSQL instance and run:
\i db/schema.sql
```

### 4. Cloudflare R2 Setup

1. Create an R2 bucket in Cloudflare dashboard
2. Generate API credentials with S3 API compatibility
3. Note your Account ID and endpoint URL
4. Configure CORS settings for your frontend domain

## 🐳 Docker Deployment

### Local Testing

Test the production build locally:
```bash
# Build the production image
docker build -f Dockerfile.prod -t filevault:latest .

# Run with environment file
docker run --env-file .env.production -p 3000:3000 filevault:latest
```

### Production Deployment

The GitHub Actions workflow will automatically:
1. Build the Docker image on every push to `main`
2. Run tests
3. Push to GitHub Container Registry
4. Scan for security vulnerabilities

Pull and run the latest image:
```bash
# Pull the latest image
docker pull ghcr.io/yourusername/filevault:latest

# Run the container
docker run -d \
  --name filevault-prod \
  --env-file .env.production \
  -p 3000:3000 \
  --restart unless-stopped \
  ghcr.io/yourusername/filevault:latest
```

### Using Docker Compose (Recommended)

Create a `docker-compose.prod.yml`:
```yaml
version: '3.8'
services:
  filevault:
    image: ghcr.io/yourusername/filevault:latest
    ports:
      - "3000:3000"
    env_file:
      - .env.production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

Deploy with:
```bash
docker compose -f docker-compose.prod.yml up -d
```

## 📊 Monitoring

### Health Checks

The application provides health check endpoints:
- `GET /health` - Basic health status
- `GET /health/detailed` - Detailed system status

### Logs

View application logs:
```bash
# Follow logs
docker logs -f filevault-prod

# View specific number of lines
docker logs --tail 100 filevault-prod
```

### Container Management

```bash
# Check container status
docker ps

# Update to latest version
docker pull ghcr.io/yourusername/filevault:latest
docker stop filevault-prod
docker rm filevault-prod
docker run -d --name filevault-prod --env-file .env.production -p 3000:3000 ghcr.io/yourusername/filevault:latest

# Or with docker-compose
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

## 🔒 Security Considerations

1. **Environment Variables**: Never commit `.env.production` to version control
2. **JWT Secret**: Use a cryptographically secure random string
3. **Database**: Use connection pooling and read replicas for high traffic
4. **CORS**: Restrict allowed origins to your actual frontend domains
5. **Rate Limiting**: Configure appropriate limits for your use case
6. **Container Security**: Images are built with non-root user and minimal base

## 🚨 Troubleshooting

### Common Issues

**Container won't start:**
```bash
# Check logs for errors
docker logs filevault-prod

# Verify environment variables
docker exec filevault-prod env | grep -E "(POSTGRES|R2|JWT)"
```

**Database connection issues:**
```bash
# Test database connectivity from container
docker exec filevault-prod nc -zv your-postgres-host 5432
```

**R2 storage issues:**
```bash
# Check R2 configuration
docker exec filevault-prod node -e "console.log(require('./config/s3.js'))"
```

### Performance Tuning

For high-traffic deployments:
1. Use a reverse proxy (nginx) for SSL termination
2. Enable connection pooling for PostgreSQL
3. Configure log rotation
4. Set up container resource limits
5. Use CDN for static file serving

## 📈 Scaling

For horizontal scaling:
1. Use external PostgreSQL with connection pooling
2. Deploy multiple container instances behind load balancer
3. Ensure R2 bucket can handle concurrent requests
4. Consider Redis for session management if needed

## 🔄 Updates

The CI/CD pipeline automatically builds new images on:
- Push to `main` branch (tagged as `latest`)
- Git tags (semantic versioning)
- Pull requests (testing only)

To deploy updates:
1. Push code to `main` branch
2. Wait for CI/CD to complete
3. Pull and restart containers with new image