# Plano de Implementação: Portal Público e Fluxo de Pedidos Inteligente

Este plano detalha a reestruturação do Portal da Campanha para incluir um fluxo de autoatendimento inteligente para apoiadores, solicitações de material e logística de entrega.

## Objetivos
- Simplificar o cadastro de apoiadores.
- Implementar verificação automática por WhatsApp no fluxo de pedidos.
- Adicionar seleção múltipla de materiais com quantidades.
- Oferecer opções de logística (Retirada vs. Entrega).
- Implementar resumo de pedido e acompanhamento de status.

## Alterações Técnicas

### 1. Banco de Dados e Modelos (`src/lib/db.ts`)
- **Pessoa**: Garantir campos `endereco_completo` e `meta_votos`.
- **SolicitacaoMaterial**: Expandir para suportar múltiplos itens (mudar de `tipo_material`/`quantidade` para um array `itens: { material_id, quantidade }[]`).
- **SolicitacaoMaterial**: Adicionar campos `tipo_logistica` ('retirada' | 'entrega'), `endereco_entrega` e `status_display` (ex: "Pronto para retirada").

### 2. Portal Público (`src/routes/public/cadastro.tsx`)
- **Aba Apoiador**: Atualizar formulário para: Nome Completo, WhatsApp, Endereço Completo, Quantidade de Votos.
- **Aba Material (Fluxo Inteligente)**:
  - Passo 1: Apenas campo WhatsApp.
  - Lógica: Ao digitar, buscar no `db.pessoas`. 
    - Encontrado: Mostrar dados e pedir confirmação.
    - Não encontrado: Direcionar para Aba Apoiador com aviso.
  - Passo 2 (Pedidos): Listar todos os materiais ativos com inputs de quantidade.
  - Passo 3 (Logística): Seleção entre "Retirar no Comitê" ou "Receber no Endereço".
    - Se "Entrega": Permitir usar endereço cadastrado ou digitar novo.
  - Passo 4 (Confirmação): Mostrar resumo completo.
- **Visualização de Status**: Criar uma sub-aba ou modal de "Consultar Pedido" via WhatsApp para ver o status em tempo real.

### 3. Dashboard Administrativo (`src/routes/index.tsx`)
- Manter o bloco de metadados atualizado para referência futura.

## Experiência do Usuário (UX)
- Botões grandes e claros para navegação mobile.
- Feedbacks visuais imediatos na busca por WhatsApp.
- Stepper visual para o fluxo de pedido de material.
- Tags coloridas para o status do pedido (Pendente, Em Separação, Pronto, Entregue).

## Detalhes Técnicos
- Uso de `useMemo` para filtragem de materiais e pessoas.
- Persistência imediata no `localStorage` via `commit` da store.
- Integração com `sonner` para notificações de sucesso/erro.
- Layout responsivo focado em dispositivos móveis.
