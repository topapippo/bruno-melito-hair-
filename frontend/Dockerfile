# Build stage
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL
RUN npm run build

# Production stage
FROM caddy:2-alpine
COPY --from=build /app/build /srv
COPY <<EOF /etc/caddy/Caddyfile
:{$PORT}
root * /srv
file_server
try_files {path} /index.html
EOF
EXPOSE 3000
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
