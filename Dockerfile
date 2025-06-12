FROM node:18-alpine

# Accept build arguments for environment variables
ARG DB_HOST
ARG DB_PORT=5432
ARG DB_NAME
ARG DB_USER
ARG DB_PASSWORD
ARG JWT_SECRET
ARG NODE_ENV=production
ARG PORT=3000

# Set environment variables from build args
ENV DB_HOST=$DB_HOST
ENV DB_PORT=$DB_PORT
ENV DB_NAME=$DB_NAME
ENV DB_USER=$DB_USER
ENV DB_PASSWORD=$DB_PASSWORD
ENV JWT_SECRET=$JWT_SECRET
ENV NODE_ENV=$NODE_ENV
ENV PORT=$PORT

# Set working directory
WORKDIR /app

# Copy server package.json and install server dependencies
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm install --only=production

# Go back to root and copy pre-built files
WORKDIR /app

# Copy the pre-built server files
COPY server/dist/ ./server/dist/

# Copy the pre-built client files
COPY server/public/ ./server/public/

# Clean up and cache clean
WORKDIR /app/server
RUN npm cache clean --force

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