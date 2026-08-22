# Planejamento: Inteligência Eleitoral e Painel Estratégico

Este plano implementa as funcionalidades de Inteligência Eleitoral focadas na gestão de potencial de voto, mapas de calor e análise de eficiência logística.

## Ações Principais

### 1. Atualização do Modelo de Dados
- **src/lib/db.ts**:
    - Adicionar campos `meta_votos_conquistados` ao tipo `Comite`.
    - Garantir que `Pessoa` tenha `meta_votos` (já possui).
    - Criar funções auxiliares para calcular desempenho (atingimento de meta).

### 2. Nova Rota de Inteligência (Painel Estratégico)
- **src/routes/potencial.tsx**:
    - Criar a nova página "Painel Estratégico".
    - Implementar visualização de Mapa do Ceará (SVG interativo ou gráfico regionalizado).
    - Exibir cards de desempenho por cidade e liderança.
    - Implementar popover interativo para detalhes da cidade (metas, materiais enviados, lideranças).

### 3. Integração na Navegação
- **src/components/BottomNav.tsx**:
    - Adicionar o item "Inteligência" (ícone `Target` ou `TrendingUp`) ao menu inferior.

### 4. Inteligência de Distribuição
- **src/routes/potencial.tsx**:
    - Implementar cálculo de "Eficiência de Distribuição" cruzando materiais enviados vs. meta de votos.
    - Adicionar indicadores visuais de "Déficit" ou "Desperdício".

### 5. Regras de Negócio e Metadados
- **src/lib/store.tsx**:
    - Implementar `updatePessoa` e `updateComite` com lógica de atualização automática de metas agregadas.
- **src/routes/index.tsx**:
    - Atualizar o bloco `sr-only` com as novas instruções.

## Detalhes Técnicos
- Utilizar `recharts` ou `SVG` nativo para o mapa do Ceará para garantir performance mobile.
- Cálculos de meta feitos em tempo real no store ou via seletores memoizados.
- Estilização seguindo o padrão "Alta Visibilidade" (JetBrains Mono, cores vibrantes).
