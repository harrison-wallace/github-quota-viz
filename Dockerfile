FROM nginx:alpine

# Copy the build artifacts from Jenkins workspace
COPY build /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
