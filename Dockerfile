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

# Copy server package.json and install dependencies
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm install --only=production

# Go back to root and copy EXACTLY what we built
WORKDIR /app

# Copy server build files (the ACTUAL structure includes server/dist/server/)
COPY server/dist/ ./server/dist/

# Copy client build files (built Svelte app)
COPY server/public/ ./server/public/

# Verify and fix the structure
RUN echo "=== DOCKER BUILD VERIFICATION ===" && \
    echo "server/dist contents:" && \
    ls -la server/dist/ && \
    echo "Looking in server/dist/server/:" && \
    ls -la server/dist/server/ && \
    echo "Moving files to correct location..." && \
    mv server/dist/server/* server/dist/ && \
    mv server/dist/types/* server/dist/ && \
    rmdir server/dist/server server/dist/types && \
    echo "Fixed structure:" && \
    ls -la server/dist/

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

# Start the application
CMD ["npm", "start"]
