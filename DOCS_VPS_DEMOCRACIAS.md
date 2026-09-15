# Manual de Arquitetura, Infraestrutura e Operação — VPS Democracias

> **Documento Técnico de Referência**  
> **Servidor:** VPS Hostinger (`82.112.245.35`)  
> **Domínio Principal:** `democracias.org`  
> **Data de Atualização:** Agosto/2026  

---

## 1. Visão Geral da Plataforma

A plataforma **Democracias** é um ecossistema completo de inteligência eleitoral, gestão de materiais, voluntariado e comunicação direta com eleitores via WhatsApp e Web.

### 🌐 Mapeamento de Domínios e Subdomínios

| Domínio | Função / Destino | Porta Interna | Responsável |
| :--- | :--- | :--- | :--- |
| `democracias.org` / `www` | Aplicação Web Principal (Painel, Saídas, Solicitações) | `:3000` | PM2 (`democracias-frontend`) |
| `api.democracias.org` | Gateway Supabase (Auth, REST, DB) e APIs auxiliares | `:18000` ➔ `:8000` | Traefik ➔ Nginx Proxy ➔ Supabase Envoy |
| `chat.democracias.org` | Módulo de Consulta Pública de Candidatos e Chat | `:3002` | Docker (`democracias-chat`) |
| `evolution.democracias.org` | Evolution API (Instâncias de WhatsApp) | `:8080` | Docker (`evolution-go`) |
| `manager.democracias.org` | Painel de Gerenciamento do Evolution API | `:8080/manager` | Docker (`evolution-go`) |
| `deepseek.democracias.org` | DeepSeek Harness (IA e Processamento Avançado) | `:3080` | Docker (`dsh-agent-runtime`) |

---

## 2. Topologia de Rede e Roteamento de Tráfego

O tráfego de entrada na VPS passa por duas camadas de proxy reverso antes de atingir os serviços finais:

```mermaid
flowchart TD
    User([Usuário / Navegador]) -->|HTTPS 443| Traefik[Traefik Proxy (Host Network)]
    
    Traefik -->|democracias.org| FrontendApp[App Principal Node/Vite :3000]
    Traefik -->|chat.democracias.org| ChatApp[Chat Docker :3002]
    Traefik -->|evolution.democracias.org| Evolution[Evolution WhatsApp :8080]
    Traefik -->|deepseek.democracias.org| DeepSeek[DeepSeek Harness :3080]
    
    Traefik -->|api.democracias.org| NginxProxy[democracias-api-proxy :18000]
    
    NginxProxy -->|/whatsapp e /tse| WhatsAppService[Serviço TSE/WhatsApp :3001]
    NginxProxy -->|/ (Default)| EnvoyGateway[Supabase Envoy Gateway :8000]
    
    EnvoyGateway -->|/auth/v1/*| GoTrue[Supabase Auth / GoTrue :9999]
    EnvoyGateway -->|/rest/v1/*| PostgREST[Supabase PostgREST :3000]
    EnvoyGateway -->|/storage/v1/*| Storage[Supabase Storage :5000]
    
    GoTrue --> Postgres[(PostgreSQL DB :5432)]
    PostgREST --> Postgres
    Storage --> Postgres
```

---

## 3. Detalhamento dos Componentes do Sistema

### 3.1. Traefik (`traefik-ftjh-traefik-1`)
- **Tipo:** Proxy Reverso Principal e Gerenciador de Certificados SSL (Let's Encrypt).
- **Modo de Rede:** `network_mode: host` (acessa as portas locais da VPS diretamente).
- **Descoberta:** Lê as *labels* dos containers Docker ativos.
- **Armazenamento de Certificados:** Volume `traefik-ftjh_traefik-letsencrypt` (`/letsencrypt/acme.json`).

### 3.2. Nginx API Proxy (`democracias-api-proxy`)
- **Arquivo de Configuração:** `/opt/api-proxy.conf` montado em `/etc/nginx/nginx.conf`.
- **Porta:** `127.0.0.1:18000`.
- **Roteamento Interno:**
  - `/whatsapp/` ➔ `http://127.0.0.1:3001/`
  - `/tse/` e `/tse/foto/` ➔ `http://127.0.0.1:3001/tse/`
  - `/` (todas as demais) ➔ `http://127.0.0.1:8000` (Supabase Envoy Gateway).

### 3.3. Stack Supabase (Docker)
O backend da plataforma roda com containers oficiais do Supabase:
- **`supabase-envoy`**: Gateway HTTP unificado na porta `8000`. Encaminha `/auth/v1` para `auth:9999` e `/rest/v1` para `rest:3000`.
- **`supabase-auth`**: Serviço GoTrue para autenticação (Google OAuth, Tokens JWT, Refresh Tokens).
- **`supabase-rest`**: PostgREST para queries diretas ao banco via API RESTful.
- **`supabase-db`**: Banco PostgreSQL 15 com extensões PostGIS e Schema `public` / `auth`.
- **`supabase-storage`**: Armazenamento de fotos de campanha, materiais e PDFs.
- **`supabase-pooler`**: PgBouncer para controle de conexões com o banco (portas `5432` e `6543`).
- **`realtime-dev.supabase-realtime`**: WebSockets para sincronização de dados em tempo real.

> [!IMPORTANT]
> **Atenção sobre as Redes Docker do Supabase:**
> O container `supabase-envoy` precisa obrigatoriamente estar conectado à rede **`supabase_default`** (além de `democracias-supabase_default`), pois é nela que o container `supabase-auth` responde pelo alias de rede **`auth`**.

### 3.4. Aplicação Principal (`/opt/democracias`)
- **Tecnologias:** React + Vite + TanStack Router + Nitro SSR.
- **Gerenciador de Processo:** PM2 (`democracias-frontend`).
- **Porta:** `:3000`.

---

## 4. Estrutura de Diretórios na VPS

```
/opt/
├── api-proxy.conf              # Configuração do Nginx API Proxy (porta 18000)
├── democracias/                 # Repositório Principal da Plataforma
│   ├── src/                    # Código-fonte React / Vite
│   ├── chat/                   # Módulo do Chat Público (porta 3002)
│   ├── whatsapp-service/       # Serviço Node de integração WhatsApp/TSE
│   └── eleja-supabase-docker/  # Configurações do Supabase local
├── deepseek-harness/           # Serviço de IA e automação DeepSeek
└── evolution-service/          # Instância do Evolution API
```

---

## 5. Manual Operacional: Comandos do Dia a Dia

### 5.1. Atualizar e Fazer Deploy do Sistema (GitHub ➔ VPS)
Para puxar a versão mais recente do GitHub, compilar e reiniciar a plataforma:

```bash
cd /opt/democracias && \
git fetch origin && \
git reset --hard origin/main && \
git clean -fd && \
npm install && \
npm run build && \
cd chat && \
npm install && \
npm run build && \
cd .. && \
pm2 restart all && \
docker restart democracias-chat || true
cd meuzap && npm install && npm run build && cd .. && bash run_meuzap.sh || true
```

### 5.2. Ver Status dos Serviços

```bash
# Processos Node (Frontend e APIs)
pm2 status

# Containers Docker (Banco, Gateway, Chat, Evolution)
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Status do Banco PostgreSQL
docker exec supabase-db pg_isready -U postgres
```

### 5.3. Visualizar Logs em Tempo Real

```bash
# Logs do Frontend e serviços Node
pm2 logs democracias-frontend --lines 50
pm2 logs whatsapp-api --lines 50

# Logs do Gateway do Supabase (Envoy)
docker logs -f supabase-envoy --tail 50

# Logs de Autenticação (GoTrue)
docker logs -f supabase-auth --tail 50

# Logs do Traefik (Proxy Reverso HTTPS)
docker logs -f traefik-ftjh-traefik-1 --tail 50
```

---

## 6. Guia de Resolução de Problemas (Troubleshooting)

| Sintoma | Causa Mais Frequente | Comando de Resolução |
| :--- | :--- | :--- |
| **503 / "no healthy upstream" no login Google (`api.democracias.org`)** | Envoy perdeu comunicação com o container `supabase-auth` | `docker network connect supabase_default supabase-envoy && docker restart supabase-envoy` |
| **Site fora do ar (erro de conexão no Traefik)** | Container Traefik perdeu tabelas de roteamento | `docker restart traefik-ftjh-traefik-1` |
| **Frontend não reflete alterações do Git** | Build antigo em cache no PM2 | `cd /opt/democracias && npm run build && pm2 restart democracias-frontend` |
| **Chat público (`chat.democracias.org`) inacessível** | Container Docker do chat parado | `docker restart democracias-chat` |
| **Postgres recusando conexões** | Pooler ou DB com limites de conexões atingidos | `docker restart supabase-pooler supabase-db` |

---

## 7. Testes Rápidos de Saúde do Sistema (Healthchecks)

Execute estes comandos na VPS para checar a saúde de toda a stack em segundos:

```bash
# 1. Testar Frontend Principal
curl -s -o /dev/null -w "Frontend Web: %{http_code}\n" http://127.0.0.1:3000

# 2. Testar API Gateway Local
curl -s -o /dev/null -w "Supabase Envoy Local: %{http_code}\n" http://127.0.0.1:8000/auth/v1/health

# 3. Testar API Gateway Público (HTTPS)
curl -s -o /dev/null -w "API Pública HTTPS: %{http_code}\n" https://api.democracias.org/auth/v1/health

# 4. Testar Endpoint de Autenticação Google (deve retornar 302)
curl -s -o /dev/null -w "Google OAuth Redirect: %{http_code}\n" "https://api.democracias.org/auth/v1/authorize?provider=google&redirect_to=https://democracias.org/auth?oauth=callback"
```
