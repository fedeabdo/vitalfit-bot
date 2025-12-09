# Use the official Node.js image as the base image
FROM node:24.11.1-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code to the working directory
COPY . .

# Expose the port the base-baileys-json service will run on
EXPOSE 3001

# Start the base-baileys-json service
CMD ["npm", "start"]
