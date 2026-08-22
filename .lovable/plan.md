# Planejamento: Gestão de Metas e Lógica de Distribuição

Este plano detalha a implementação da lógica de fluxo para solicitações de materiais, integrando metas de votos e priorização regional para otimizar a logística da campanha.

## Alterações Técnicas

### 1. Modelo de Dados (`src/lib/db.ts`)
- Adicionar o campo opcional `meta_votos: number` aos tipos `Comite` (representando metas por localidade) e `Pessoa` (lideranças).
- Atualizar o tipo `SolicitacaoMaterial` para incluir vínculos diretos com `municipio: string` e `lideranca_id: string`.
- Adicionar semente (seed) de dados para testar a priorização.

### 2. Gerenciamento de Estado (`src/lib/store.tsx`)
- Atualizar a função `addSolicitacao` para suportar os novos campos de localidade e liderança.
- Garantir que as atualizações de solicitacão reflitam corretamente no banco de dados local.

### 3. Portal Público (`src/routes/public/cadastro.tsx`)
- **Fluxo de Solicitação:**
    - Implementar seleção obrigatória de **Município**.
    - Implementar campo de **Liderança** dinâmico que:
        - Prioriza no topo as pessoas vinculadas ao município selecionado.
        - Dá destaque extra a lideranças de "Fortaleza".
        - Lista todos se nenhum município for escolhido.
- **Métricas Visuais:**
    - Exibir card informativo após seleção:
        - "Votos Estimados" (da liderança/cidade).
        - "Material já enviado" (soma das saídas confirmadas para aquele destino).
        - "Status" (Suficiente / Necessita mais) baseado no balanço Material vs. Votos.

### 4. Gestão Administrativa
- **Pessoas (`src/routes/pessoas.tsx`):** Adicionar campo de "Meta de Votos" no cadastro de lideranças.
- **Comitês (`src/routes/comites.tsx`):** Adicionar campo de "Meta de Votos" no cadastro de locais.
- **Logística (`src/routes/saidas.tsx`):** 
    - Criar tela de listagem de saídas (que estava faltando).
    - Adicionar coluna de "Status de Entrega" por localidade/liderança para identificar déficits.

### 5. Documentação Interna (`src/routes/index.tsx`)
- Atualizar o bloco `sr-only` para refletir as novas regras de negócio implementadas.

## Segurança e Performance
- Uso de `useMemo` para filtragem e ordenação de lideranças em tempo real.
- Cálculos de balanço de material processados no cliente para feedback imediato.
