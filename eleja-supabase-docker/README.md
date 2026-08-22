# Configuração Supabase (Self-Hosted) para VPS

Esta pasta contém o script para configurar e iniciar o Supabase na sua VPS.

## Pré-requisitos
- Uma VPS (Ubuntu/Debian recomendado)
- **Git** instalado (`sudo apt install git`)
- **Docker** e **Docker Compose** instalados

## Como rodar na VPS

1. Envie a pasta `eleja-supabase-docker` para a sua VPS (usando SCP, FTP, etc).
2. Acesse sua VPS por SSH e entre na pasta.
3. Dê permissão de execução ao script:
   ```bash
   chmod +x setup-supabase.sh
   ```
4. Execute o script:
   ```bash
   ./setup-supabase.sh
   ```

O script vai clonar a versão mais recente oficial do Docker Compose do Supabase e iniciar os containers num projeto chamado `democracias-supabase`.

## Pós-Instalação (Importante)
Acesse a subpasta `supabase/docker` que será criada pelo script. Lá dentro você encontrará o arquivo `.env`. 
**Edite este arquivo** para gerar senhas seguras (como o `POSTGRES_PASSWORD`, `JWT_SECRET`, etc) antes de colocar em produção. Após alterar o arquivo `.env`, reinicie os containers com:

```bash
cd supabase/docker
docker compose -p democracias-supabase down
docker compose -p democracias-supabase up -d
```
