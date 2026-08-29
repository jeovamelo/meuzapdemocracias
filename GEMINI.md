# Democracias.org (Eleja) — Contexto de Arquitetura e Diretrizes do Projeto

> **Instrução aos Agentes:** Leia este arquivo antes de inspecionar arquivos avulsos. Ele contém as definições arquiteturais centrais, as convenções de código e os procedimentos essenciais deste workspace.

---

## 1. Visão Geral e Propósito

**Democracias.org (Eleja)** é uma plataforma integrada de gestão de campanhas eleitorais, logística de materiais, coordenação territorial, mobilização de lideranças e prestação de contas.

---

## 2. Stack Tecnológica

- **Frontend & Framework:** React (com TypeScript), Vite, TanStack Router (TanStack Start / SSR).
- **Estilização & UI:** Tailwind CSS, Radix UI Primitives, Lucide React Icons, Sonner (Toasts).
- **Visualização de Dados & Mapas:** Recharts, SVG vetorial interativo com malhas geográficas oficiais do IBGE (API de Malhas e Localidades).
- **Backend & Banco de Dados:** Supabase (PostgreSQL, Auth, Realtime, Storage).
- **Microsserviços Integrados:** WhatsApp Service interno (`whatsapp-service/` com Baileys), Evolution API, Google OAuth.
- **Ambiente de Produção (VPS):** Ubuntu Linux gerenciado com PM2 (`democracias-frontend`, `whatsapp-service`) e Nginx como reverse proxy com SSL.

---

## 3. Estrutura Principal de Diretórios

```
eleja/
├── src/
│   ├── components/       # Componentes reutilizáveis (MapaCalorDistribuicao, EstadoCidadeSelect, UI)
│   ├── hooks/            # Hooks customizados (useCampaignScope, useLocalidades, etc.)
│   ├── integrations/     # Cliente e tipagens geradas do Supabase (`supabase/client.ts`, `types.ts`)
│   ├── lib/              # Armazenamento e utilitários (`store.tsx`, `db.ts`, `env.ts`, `utils.ts`)
│   └── routes/           # Rotas do TanStack Router
│       ├── __root.tsx    # Layout raiz, header, navegação e notificações
│       ├── dashboard.tsx # Painel de controle, metas e mapa de calor
│       ├── saidas.*.tsx  # Gestão, emissão e edição de remessas e saídas de materiais
│       ├── materiais.tsx # Estoque e inventário de itens e kits
│       ├── pessoas.tsx   # Cadastro de lideranças, fiscais e apoiadores
│       ├── comites.tsx   # Pontos de apoio e comitês municipais
│       ├── potencial.tsx # Análise de potencial de votos e colégios eleitorais
│       └── public/       # Rotas públicas sem autenticação direta de painel
│           ├── cadastro.tsx  # Formulário público de adesão de apoiadores
│           ├── solicitar.tsx # Solicitação pública de materiais de campanha
│           └── mapa.tsx      # Visualização pública e anônima protegida por token e senha (PIN)
├── whatsapp-service/     # Serviço Node.js para envio e escuta de mensagens WhatsApp (Baileys)
├── public/               # Ativos estáticos públicos
└── supabase/             # Migrações e configurações do banco PostgreSQL
```

---

## 4. Regras Arquiteturais Críticas

### 4.1. Conexão Lovable & Histórico Git
<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> Este repositório está conectado ao **Lovable**. Nunca reescreva o histórico git publicado (evite `git push --force`, `rebase`, `amend` ou `squash` em commits já enviados ao `origin/main`). Mantenha a branch sempre compilável e estável.
<!-- LOVABLE:END -->

### 4.2. Renderização de Mapas e Desempenho Geográfico
- Ao calcular limites geográficos (`minLon`, `maxLon`, `minLat`, `maxLat`) de malhas GeoJSON com dezenas de milhares de coordenadas, **SEMPRE utilize iteração linear $O(N)$**.
- **PROIBIDO** usar spread de arrays em `Math.min(...coords)` ou `Math.max(...coords)`, pois estoura a pilha de execução do JavaScript (`RangeError: Maximum call stack size exceeded`).
- Utilize o fator de correção de latitude de Mercator (`fLon = Math.cos(latMedia * Math.PI / 180)`).
- Os rótulos de cidades devem utilizar escalonamento proporcional ao zoom (`labelScale`) e algoritmo anti-colisão de offsets.

### 4.3. Rotas Públicas vs. Dados Sensíveis
- Rotas sob `/public/` (como `/public/mapa`) devem aplicar anonimização estrita quando acessadas via compartilhamento externo: não revelar nomes de candidatos, números de urna, dados pessoais de lideranças ou contatos, exibindo exclusivamente os quantitativos e o mapa.
- Links compartilhados utilizam tokens compactos (12 caracteres) e PIN numérico de 4 dígitos com persistência em nuvem (Supabase) e localStorage.

### 4.4. Gerenciamento de Estado (`useStore`)
- A persistência local é sincronizada com o Supabase através do hook `useStore()` em `src/lib/store.tsx`.
- Sempre forneça valores padrão seguros (`?.` e `[]`) para evitar renderizações quebradas em propriedades nulas.

---

## 5. Procedimento Padrão de Deploy na VPS

Para aplicar alterações no ambiente de produção:
```bash
cd /opt/democracias
git pull origin main
npm run build
pm2 restart democracias-frontend
```
Se houver atualizações no serviço de WhatsApp:
```bash
pm2 restart whatsapp-api
```
