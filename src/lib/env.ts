/**
 * Configuração centralizada de integrações externas.
 *
 * Regras:
 * - Variáveis de cliente (expostas no bundle) usam prefixo VITE_ e são lidas via
 *   import.meta.env (injetadas em build-time pelo Vite/Lovable).
 * - Variáveis de servidor são lidas via process.env.
 * - NENHUM segredo deve ser embutido neste arquivo (ou em qualquer arquivo do
 *   repositório). Quando uma variável obrigatória estiver ausente, logamos um
 *   aviso claro e retornamos string vazia, para que a falha seja visível no
 *   console em vez de operar silenciosamente com uma credencial exposta.
 */

function readVar(name: string): string | undefined {
  // Cliente (Vite injeta VITE_* em build-time)
  const viteVal = (import.meta as any).env?.[`VITE_${name}`];
  if (typeof viteVal === "string" && viteVal.trim() !== "") return viteVal;
  // Servidor (Node/Nitro/Cloudflare Workers)
  const procVal = (typeof process !== "undefined" ? process.env?.[name] : undefined) as
    | string
    | undefined;
  if (typeof procVal === "string" && procVal.trim() !== "") return procVal;
  return undefined;
}

function requireVar(name: string): string {
  const value = readVar(name);
  if (!value) {
    console.warn(
      `[env] Variável de ambiente "${name}" (ou VITE_${name}) não configurada. ` +
        `Configure-a no painel do Lovable (env vars) ou no arquivo .env local.`,
    );
    return "";
  }
  return value;
}

/** URL base da Evolution API. Não é segredo — pode ter fallback público. */
export const EVOLUTION_API_URL =
  readVar("EVOLUTION_API_URL") || "https://evolution.democracias.org";

/** Chave global da Evolution API (administração de instâncias). */
export const EVOLUTION_GLOBAL_API_KEY = requireVar("EVOLUTION_GLOBAL_API_KEY");

/** Token da instância master do sistema (envio de mensagens via /pc). */
export const EVOLUTION_MASTER_TOKEN = requireVar("EVOLUTION_MASTER_TOKEN");

/** Nome da instância master do sistema WhatsApp. */
export const EVOLUTION_MASTER_INSTANCE =
  readVar("EVOLUTION_MASTER_INSTANCE") || "sistema-geral-democracias";
