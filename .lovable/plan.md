# Migração para Banco de Dados Real (Lovable Cloud)

Este plano detalha a transição do estado local (`localStorage`) para um banco de dados relacional persistente com autenticação segura.

## Alterações Propostas

### 1. Esquema do Banco de Dados
Criar as tabelas no backend para suportar todos os módulos do sistema:
- `config_campanha`: Configurações globais e metas.
- `comites`: Gestão de bases e comitês populares.
- `pessoas`: Lideranças, apoiadores e equipe de campo.
- `materiais`: Catálogo de materiais de campanha.
- `estoque_transacoes`: Entradas e saídas de materiais.
- `solicitacoes`: Pedidos de material via portal público.
- `boletins_urna`: Registros da apuração paralela.
- `cidade_metas`: Metas específicas por município.

### 2. Camada de Dados (Store)
- Substituir a lógica de manipulação de arrays locais por chamadas ao cliente do banco de dados.
- Implementar sincronização em tempo real para o Dashboard e Apuração Paralela.

### 3. Autenticação
- Ativar o sistema de login para acesso restrito aos módulos administrativos.
- Manter o Scanner de BU e Portais de Cadastro como rotas públicas seguras.

## Detalhes Técnicos
- Utilização de RLS (Row Level Security) para garantir que apenas usuários autorizados vejam dados sensíveis.
- Migração dos dados iniciais (seed) para o novo ambiente.
- Integração de funções de servidor para validações complexas.

---
**Nota:** Esta mudança garantirá que os dados não sejam perdidos ao limpar o cache do navegador e permitirá o uso colaborativo por múltiplos usuários simultaneamente.