FROM node:18-slim

WORKDIR /app

# Install system dependencies including postgresql-client for migrations
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    curl \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy package files first for better caching
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Create non-root user for security
RUN useradd -r -s /bin/false nodeuser && chown -R nodeuser:nodeuser /app
USER nodeuser

# Set environment variables for production
ENV NODE_ENV=production
ENV PORT=3000

# Expose the port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:$PORT/health || exit 1

# Start the application
CMD ["npm", "start"]