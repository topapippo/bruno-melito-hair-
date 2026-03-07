FROM caddy:2-alpine
COPY build /srv
COPY <<EOF /etc/caddy/Caddyfile
:{$PORT}
root * /srv
file_server
try_files {path} /index.html
EOF
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
