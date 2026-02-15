# Multi-stage build for Node.js scripts
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies for scripts
COPY package*.json ./
RUN npm ci --only=production

# Copy scripts
COPY scripts ./scripts

# Production stage
FROM nginx:alpine

# Install Node.js, cron, and other dependencies
RUN apk add --no-cache \
    nodejs \
    npm \
    dcron \
    curl

# Copy Node.js dependencies from builder
COPY --from=builder /app/node_modules /app/node_modules

# Copy scripts
COPY scripts /app/scripts

# Copy the build artifacts
COPY build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create models directory and initial data
RUN mkdir -p /usr/share/nginx/html

# Set up cron job to scrape models every 24 hours
RUN echo "0 2 * * * cd /app && node scripts/scrape-models.js >> /var/log/cron.log 2>&1" > /etc/crontabs/root

# Create log file for cron
RUN touch /var/log/cron.log

# Copy and set up entrypoint script
COPY scripts/start.sh /start.sh
RUN chmod +x /start.sh

# Expose port 80
EXPOSE 80

# Start using custom entrypoint
ENTRYPOINT ["/start.sh"]
