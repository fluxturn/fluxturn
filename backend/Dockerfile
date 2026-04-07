# Multi-stage build for production deployment

# Stage 1: Build
FROM node:25-alpine AS builder

WORKDIR /app

# Install build dependencies including QPDF
RUN apk add --no-cache qpdf python3 make g++

# Copy package files first for better layer caching
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY src ./src

# Build the application with increased memory
ENV NODE_OPTIONS=--max-old-space-size=4096
RUN npm run build

# Stage 2: Production
FROM node:25-alpine

WORKDIR /app

# Install dumb-init and QPDF for proper signal handling and PDF encryption
RUN apk add --no-cache dumb-init qpdf

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Create temp directory for PDF processing
RUN mkdir -p /app/temp && chown nodejs:nodejs /app/temp

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm install --omit=dev && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5005

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5005/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/main.js"]
