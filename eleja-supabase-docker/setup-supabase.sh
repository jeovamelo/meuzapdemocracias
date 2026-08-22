#!/bin/bash
# Script para configurar o Supabase via Docker Compose na VPS
# Nome do projeto: democracias-supabase

echo "Iniciando a configuração do Supabase na VPS..."

# Baixar o repositório oficial do Supabase
if [ ! -d "supabase" ]; then
  git clone --depth 1 https://github.com/supabase/supabase
fi

cd supabase/docker

# Configurar o arquivo .env
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "Arquivo .env criado. ATENÇÃO: Edite o arquivo .env para alterar POSTGRES_PASSWORD, JWT_SECRET, ANON_KEY e SERVICE_ROLE_KEY por questões de segurança!"
fi

# Subir os containers do Supabase
echo "Baixando imagens do Docker e iniciando o Supabase..."
docker compose -p democracias-supabase pull
docker compose -p democracias-supabase up -d

echo "Supabase iniciado com sucesso!"
echo "Acesse o Studio em: http://localhost:8000 (Substitua localhost pelo IP da sua VPS)"
