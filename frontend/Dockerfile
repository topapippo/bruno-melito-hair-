FROM caddy:2-alpine
# Force rebuild v2
WORKDIR /srv
COPY build/ .
COPY Caddyfile /etc/caddy/Caddyfile
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
