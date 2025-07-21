# build.Dockerfile
    # Stage 1: Build the application
    FROM node:22.11.0 AS build
    WORKDIR /app
    
    # Copy package.json and package-lock.json to leverage Docker cache 
    COPY package*.json ./
    
    # Install dependencies with caching
    RUN npm install --force
    
    # Copy the rest of the application code
    COPY . .
    
    # Build the application
    RUN npm run build
    
    # Stage 2: Run the application
    FROM node:22.11.0
    
    WORKDIR /app
    
    # Copy the node_modules and dist directories from the build stage
    COPY --from=build /app/node_modules /app/node_modules
    COPY --from=build /app/dist /app/dist
    
    # Expose application port
    EXPOSE 80
    
    # Command to run the application
    CMD ["node", "dist/main"]