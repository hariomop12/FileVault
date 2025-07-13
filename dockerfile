FROM node:18-slim

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y build-essential python3

# Copy package files first (from parent directory)
COPY ../package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy the entire FileVault directory structure
COPY . ./FileVault/

# Print environment variables for debugging (exclude secrets)
RUN echo "NODE_ENV: $NODE_ENV"
RUN echo "PORT: $PORT"
RUN echo "AWS_REGION is set: $(if [ -n "$AWS_REGION" ]; then echo 'yes'; else echo 'no'; fi)"
RUN echo "AWS_BUCKET_NAME is set: $(if [ -n "$AWS_BUCKET_NAME" ]; then echo 'yes'; else echo 'no'; fi)"

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose the port
EXPOSE 3000

# Start the app
CMD ["node", "FileVault/src/server.js"]