# Use Node.js 18 Alpine for smaller image size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy root package.json for shared dependencies
COPY package*.json ./

# Install root dependencies (includes TypeScript and all @types)
RUN npm ci

# Copy server package.json and install server dependencies
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm install --only=production

# Go back to root and copy server source
WORKDIR /app
COPY server/ ./server/

# Build the server TypeScript code
WORKDIR /app/server
RUN npm run build

# Copy the pre-built client files
WORKDIR /app
COPY client/build/ ./server/client/dist/

# Clean up: remove root node_modules
RUN rm -rf /app/node_modules

# Reinstall only server production dependencies and clean up
WORKDIR /app/server
RUN npm install --only=production && npm cache clean --force

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Change ownership and switch to non-root user
RUN chown -R nodejs:nodejs /app
USER nodejs

# Set working directory to server for startup
WORKDIR /app/server

# Expose port 3000
EXPOSE 3000

# Health check for GKE
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Start the application
CMD ["npm", "start"]