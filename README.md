# eleja

Crie uma aplicação web mobile-first completa e moderna de Gestão de Estoque e Logística para Campanha Eleitoral, focada em alta performance, usabilidade em campo e design limpo (UX otimizada para smartphones com botões grandes, cards visuais e navegação fluida por abas ou menu inferior).

A aplicação deve conter as seguintes telas/módulos interativos:

1. Dashboard (Visão Geral)

- Cards com indicadores rápidos: Total de Comitês Ativos, Total de Apoiadores Cadastrados, Itens Críticos em Estoque e Kits Distribuídos no dia.

- Atalhos rápidos (botões flutuantes ou de destaque) para "Nova Saída de Material" e "Novo Cadastro".

2. Cadastro de Comitês e Locais

- Campos: Nome do Comitê/Base, Endereço, Bairro/Zona, Coordenador Responsável e Observações.

- Interface em lista de cards com opção de busca rápida e botão para adicionar novo comitê.

3. Gestão de Responsáveis e Apoiadores

- Cadastro unificado ou separado por abas (Responsáveis de Comitê e Apoiadores/Cabos Eleitorais).

- Campos: Nome completo, Função/Cargo, Comitê Vinculado, Telefone/WhatsApp (com botão de clique para chamar no chat) e Zona de Atuação.

4. Catálogo de Materiais e Composição de Kits

- Gestão de Materiais: Nome do item (ex: Santinho, Bandeira 1x0.7m, Adesivo Perfurado), Categoria (Papelaria, Grande Formato, Vestuário), Quantidade em Estoque e Estoque Mínimo.

- Composição de Kits: Permite criar pacotes padronizados (Ex: "Kit Rua Padrão" contendo 500 santinhos, 2 bandeiras e 10 adesivos). Ao selecionar o kit na distribuição, o sistema abate automaticamente os itens individuais do estoque geral.

5. Fluxo de Saída e Distribuição (O mais importante para uso em campo)

- Tela simplificada para o operador registrar rapidamente: 

  * Seleção do Comitê de origem.

  * Quem está retirando (Apoiador/Responsável).

  * O que está levando (Escolha entre Kit pré-configurado ou itens avulsos com quantidade).

  * Confirmação com data/hora automática e registro de histórico.

6. Requisitos Técnicos e de UX:

- Interface totalmente responsiva otimizada para telas verticais de celular (mobile viewport perfeito).

- Uso de componentes modernos (Tailwind CSS, ícones claros via Lucide icons, estados de loading e toasts de feedback para ações de salvar/excluir).

- Simule um banco de dados local robusto (estado inicial populado com dados fictícios realistas para testes imediatos) e prepare a estrutura para fácil integração futura com Supabase.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/6c801c28-6de9-4d48-b7d9-5de7a4579b35).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
