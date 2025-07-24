# Use the official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy the rest of the application code
COPY . .

# Set environment variables with placeholder values for build
ENV OPENAI_API_KEY=placeholder
ENV NEXT_PUBLIC_SUPABASE_URL=placeholder
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder
ENV SUPABASE_URL=placeholder
ENV SUPABASE_SERVICE_ROLE_KEY=placeholder
ENV STRIPE_SECRET_KEY=placeholder
ENV STRIPE_WEBHOOK_SECRET=placeholder
ENV NEXTAUTH_SECRET=placeholder
ENV NEXTAUTH_URL=http://localhost:3000

# Build the application
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["npm", "start"]