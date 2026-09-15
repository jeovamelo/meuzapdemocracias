#!/bin/bash
set -e

mkdir -p /opt/democracias/public/candidatos
mkdir -p /opt/democracias/meuzap/dist

echo "===> Parando container anterior se existir..."
docker rm -f democracias-meuzap || true

echo "===> Iniciando container democracias-meuzap..."
docker run -d --name democracias-meuzap \
  --restart unless-stopped \
  --network host \
  -v /opt/democracias/meuzap/dist:/usr/share/nginx/html:ro \
  -v /opt/democracias/public/candidatos:/var/www/candidatos:ro \
  -v /opt/democracias/meuzap/nginx.conf:/etc/nginx/conf.d/default.conf:ro \
  -l "traefik.enable=true" \
  -l "traefik.http.routers.meuzap.rule=Host(\`meuzap.democracias.org\`)" \
  -l "traefik.http.routers.meuzap.entrypoints=websecure,web" \
  -l "traefik.http.routers.meuzap.tls=true" \
  -l "traefik.http.routers.meuzap.tls.certresolver=letsencrypt" \
  -l "traefik.http.services.meuzap.loadbalancer.server.port=3003" \
  nginx:alpine

echo "===> Container iniciado com sucesso!"
