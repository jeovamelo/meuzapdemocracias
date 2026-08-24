#!/bin/bash
docker rm -f democracias-chat || true
docker run -d --name democracias-chat \
  --restart unless-stopped \
  --network host \
  -v /opt/democracias/chat/dist:/usr/share/nginx/html:ro \
  -v /opt/democracias/public/candidatos:/var/www/candidatos:ro \
  -v /opt/democracias/chat/nginx.conf:/etc/nginx/conf.d/default.conf:ro \
  -l "traefik.enable=true" \
  -l "traefik.http.routers.chat.rule=Host(\`chat.democracias.org\`)" \
  -l "traefik.http.routers.chat.entrypoints=websecure" \
  -l "traefik.http.routers.chat.tls=true" \
  -l "traefik.http.routers.chat.tls.certresolver=letsencrypt" \
  -l "traefik.http.services.chat.loadbalancer.server.port=3002" \
  nginx:alpine
