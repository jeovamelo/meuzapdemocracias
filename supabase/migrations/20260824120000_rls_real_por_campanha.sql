-- ============================================================================
-- RLS REAL POR AUTH.UID() E POR CAMPANHA
--
-- Substitui as políticas "Permitir tudo" (FOR ALL USING (true)) por políticas
-- que restringem o acesso aos membros/aprovados da campanha via auth.uid().
--
-- Modelo de acesso:
--   * campaigns.admin_user_id = auth.uid()  -> admin da campanha
--   * campaign_members(user_id = auth.uid() com status aprovado) -> membro
--   * is_campaign_admin(campaign_id)        -> dono OU membro com role admin
--   * is_campaign_member(campaign_id)       -> admin OU membro aprovado
--
-- FLUXOS ANÔNIMOS PRESERVADOS (obrigatórios para o portal público):
--   * SELECT  em campaigns / tse_candidatos / pesquisas_chat / config_campanha
--   * SELECT  em pessoas (autofill CPF) / materiais / comites (portal solicitar)
--   * INSERT  em pessoas / solicitacoes / solicitacoes_adesao / boletins_urna
--   * INSERT  em campaign_members (auto-registro com status pendente)
--
-- OBSERVAÇÃO (dívida conhecida): as tabelas whatsapp_* (instâncias, filas de
-- mensagem e webhook logs) permanecem com acesso público porque o
-- whatsapp-service roda com a publishable key (anon). O correto é o serviço
-- usar uma service_role key em um ambiente restrito; deixamos documentado e
-- NÃO bloqueamos para não derrubar o serviço em produção.
-- ============================================================================

-- ============================================================================
-- 0. CRIAÇÃO IDEMPOTENTE DE TABELAS-BASE FALTANTES
--
-- As tabelas campaigns e solicitacoes_adesao nunca foram criadas em migração
-- (existiam por criação manual no banco). Criamos com IF NOT EXISTS para que
-- o schema seja reproduzível a partir das migrações.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID,
  ano_eleicao INTEGER NOT NULL,
  cargo TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  meta_eleicao INTEGER,
  meta_expectativa INTEGER,
  nome_campanha TEXT NOT NULL,
  nome_candidato TEXT,
  nome_urna TEXT,
  nr_candidato TEXT NOT NULL,
  partido TEXT,
  sq_candidato TEXT,
  uf TEXT NOT NULL,
  admin_nome TEXT,
  admin_cpf TEXT,
  admin_telefone TEXT,
  admin_foto_validacao_url TEXT,
  status_validacao TEXT DEFAULT 'aprovado'
);

-- O código (src/lib/evolutionWhatsAppService.ts) usa a tabela
-- whatsapp_message_queue, que também nunca foi criada em migração e não existe
-- no banco de produção. Criamos para compatibilidade do serviço.
CREATE TABLE IF NOT EXISTS public.whatsapp_message_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_name TEXT,
  campaign_id TEXT,
  recipient_phone TEXT,
  recipient_name TEXT,
  message_text TEXT,
  tipo_mensagem TEXT,
  status TEXT DEFAULT 'pending',
  delay_applied_seconds INTEGER,
  criado_em TIMESTAMPTZ DEFAULT now(),
  enviado_em TIMESTAMPTZ,
  erro_motivo TEXT
);

-- O enum tipo_pessoa no banco de produção só aceita ('responsavel','apoiador'),
-- mas o código envia também 'eleitor' (onboarding CASO 1) e 'membro_campanha'
-- (src/lib/db.ts). Adicionamos os valores faltantes de forma segura.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
                 WHERE t.typname = 'tipo_pessoa' AND e.enumlabel = 'eleitor') THEN
    ALTER TYPE public.tipo_pessoa ADD VALUE IF NOT EXISTS 'eleitor';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
                 WHERE t.typname = 'tipo_pessoa' AND e.enumlabel = 'membro_campanha') THEN
    ALTER TYPE public.tipo_pessoa ADD VALUE IF NOT EXISTS 'membro_campanha';
  END IF;
END $$;

-- ============================================================================
-- 1. FUNÇÕES AUXILIARES (SECURITY DEFINER evita recursão de RLS)
-- ============================================================================

-- Dono da campanha OU membro com role de admin.
CREATE OR REPLACE FUNCTION public.is_campaign_admin(target_campaign_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.campaign_members cm
    WHERE cm.campaign_id = target_campaign_id
      AND cm.user_id = auth.uid()
      AND LOWER(cm.role) IN ('admin', 'owner', 'administrador')
  )
  OR EXISTS (
    SELECT 1
    FROM public.campaigns c
    WHERE c.id = target_campaign_id
      AND c.admin_user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_campaign_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_campaign_admin(uuid) TO authenticated;

-- Membro aprovado da campanha (ou admin/dono).
CREATE OR REPLACE FUNCTION public.is_campaign_member(target_campaign_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_campaign_admin(target_campaign_id)
  OR EXISTS (
    SELECT 1
    FROM public.campaign_members cm
    WHERE cm.campaign_id = target_campaign_id
      AND cm.user_id = auth.uid()
      AND LOWER(cm.status) IN ('ativo', 'aprovado', 'approved', 'aceito')
  );
$$;

REVOKE ALL ON FUNCTION public.is_campaign_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_campaign_member(uuid) TO authenticated;

-- ============================================================================
-- 2. CAMPAIGNS
-- ============================================================================
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir tudo em campaigns" ON public.campaigns;
DROP POLICY IF EXISTS campaigns_auth ON public.campaigns;

-- Leitura pública: necessário para onboarding (verificarCampanhaExiste),
-- cadastro público e chat (listagem de candidatos por campanha).
CREATE POLICY "campaigns_leitura_publica"
  ON public.campaigns FOR SELECT TO anon, authenticated USING (true);

-- Inserção: o criador vira o dono (admin_user_id = auth.uid()). O onboarding
-- exige sessão antes de criar a campanha (src/lib/store.tsx), então o valor
-- NULL não é mais aceito — evita campanhas órfãs sem dono.
CREATE POLICY "campaigns_inserir"
  ON public.campaigns FOR INSERT TO anon, authenticated
  WITH CHECK (admin_user_id = auth.uid());

-- Alteração/remoção: somente admin/dono da campanha.
CREATE POLICY "campaigns_gerenciar"
  ON public.campaigns FOR UPDATE TO authenticated
  USING (public.is_campaign_admin(id))
  WITH CHECK (public.is_campaign_admin(id));

CREATE POLICY "campaigns_remover"
  ON public.campaigns FOR DELETE TO authenticated
  USING (public.is_campaign_admin(id));

-- ============================================================================
-- 3. CAMPAIGN_MEMBERS
-- ============================================================================
ALTER TABLE public.campaign_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir tudo em campaign_members" ON public.campaign_members;
DROP POLICY IF EXISTS "Permitir leitura de membros da campanha" ON public.campaign_members;
DROP POLICY IF EXISTS "Permitir gestão de membros da campanha" ON public.campaign_members;
DROP POLICY IF EXISTS members_auth ON public.campaign_members;

-- Leitura: o próprio membro ou o admin da campanha.
CREATE POLICY "campaign_members_leitura"
  ON public.campaign_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_campaign_admin(campaign_id));

-- Auto-cadastro (status pendente) ou gestão pelo admin.
CREATE POLICY "campaign_members_inserir"
  ON public.campaign_members FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_campaign_admin(campaign_id)
  );

CREATE POLICY "campaign_members_gerenciar"
  ON public.campaign_members FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_campaign_admin(campaign_id))
  WITH CHECK (user_id = auth.uid() OR public.is_campaign_admin(campaign_id));

CREATE POLICY "campaign_members_remover"
  ON public.campaign_members FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_campaign_admin(campaign_id));

-- ============================================================================
-- 4. PESSOAS
-- ============================================================================
ALTER TABLE public.pessoas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir tudo em pessoas" ON public.pessoas;
DROP POLICY IF EXISTS "Permitir cadastro de pessoas via portal" ON public.pessoas;
DROP POLICY IF EXISTS "Permitir leitura de pessoas para lideranças" ON public.pessoas;
DROP POLICY IF EXISTS "Acesso total para usuários autenticados" ON public.pessoas;

-- Leitura pública: obrigatório para o autofill por CPF do portal
-- (/public/solicitar). DÍVIDA: idealmente migrar para uma RPC que retorne
-- apenas os campos necessários (nome/telefone/endereço), sem CPF completo.
CREATE POLICY "pessoas_leitura_publica"
  ON public.pessoas FOR SELECT TO anon, authenticated USING (true);

-- Cadastro público (portal) e cadastro por membros da campanha.
-- Escape para o onboarding (CASO 3): o admin cria a campanha (com
-- admin_user_id = auth.uid()) e em seguida insere a própria pessoa
-- (is_admin_campanha=true, status ativo) antes de existir qualquer vínculo
-- em campaign_members — a validação passa por is_campaign_admin(), que
-- reconhece o dono via campaigns.admin_user_id. Sem o escape o fluxo quebraria.
-- NOTA: a coluna real no banco de produção é is_admin_campanha (grafia "nh");
-- a migração antiga 20260823230000 usava "is_admin_campaign" (grafia "gn")
-- mas nunca foi aplicada de fato, então o banco real só tem a grafia "nh".
-- Escape para o onboarding (CASO 1): apoiador avulso registra apoio sem se
-- filiar a nenhuma campanha (campanha_id/campanha_id nulos, tipo eleitor/apoiador).
CREATE POLICY "pessoas_inserir"
  ON public.pessoas FOR INSERT TO anon, authenticated
  WITH CHECK (
    public.is_campaign_member(COALESCE(campaign_id, campanha_id))
    OR status = 'pendente_aprovacao'
    OR (
      status = 'ativo'
      AND is_admin_campanha = true
      AND public.is_campaign_admin(COALESCE(campaign_id, campanha_id))
    )
    OR (
      status = 'ativo'
      AND tipo IN ('eleitor', 'apoiador')
      AND campaign_id IS NULL
      AND campanha_id IS NULL
    )
  );

-- Alteração/remoção: somente admin ou membro aprovado da campanha vinculada.
CREATE POLICY "pessoas_gerenciar"
  ON public.pessoas FOR UPDATE TO authenticated
  USING (public.is_campaign_member(COALESCE(campaign_id, campanha_id)))
  WITH CHECK (public.is_campaign_member(COALESCE(campaign_id, campanha_id)));

CREATE POLICY "pessoas_remover"
  ON public.pessoas FOR DELETE TO authenticated
  USING (public.is_campaign_member(COALESCE(campaign_id, campanha_id)));

-- ============================================================================
-- 5. COMITES
-- ============================================================================
ALTER TABLE public.comites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir tudo em comites" ON public.comites;
DROP POLICY IF EXISTS "Permitir leitura pública de comites" ON public.comites;
DROP POLICY IF EXISTS "Permitir inserção e atualização de comites" ON public.comites;
DROP POLICY IF EXISTS "Permitir cadastro de comites via portal" ON public.comites;
DROP POLICY IF EXISTS "Permitir leitura de comites para cadastro" ON public.comites;
DROP POLICY IF EXISTS "Acesso total para usuários autenticados" ON public.comites;
DROP POLICY IF EXISTS "Permitir gestão de comites" ON public.comites;

-- Leitura pública: portal de solicitação lista comitês de origem.
CREATE POLICY "comites_leitura_publica"
  ON public.comites FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "comites_inserir"
  ON public.comites FOR INSERT TO authenticated
  WITH CHECK (public.is_campaign_member(campaign_id));

CREATE POLICY "comites_gerenciar"
  ON public.comites FOR UPDATE TO authenticated
  USING (public.is_campaign_member(campaign_id))
  WITH CHECK (public.is_campaign_member(campaign_id));

CREATE POLICY "comites_remover"
  ON public.comites FOR DELETE TO authenticated
  USING (public.is_campaign_member(campaign_id));

-- ============================================================================
-- 6. MATERIAIS
-- ============================================================================
ALTER TABLE public.materiais ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir tudo em materiais" ON public.materiais;
DROP POLICY IF EXISTS "Permitir leitura de materiais para solicitação" ON public.materiais;
DROP POLICY IF EXISTS "Acesso total para usuários autenticados" ON public.materiais;

-- Leitura pública: portal de solicitação lista materiais disponíveis.
CREATE POLICY "materiais_leitura_publica"
  ON public.materiais FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "materiais_inserir"
  ON public.materiais FOR INSERT TO authenticated
  WITH CHECK (public.is_campaign_member(campaign_id));

CREATE POLICY "materiais_gerenciar"
  ON public.materiais FOR UPDATE TO authenticated
  USING (public.is_campaign_member(campaign_id))
  WITH CHECK (public.is_campaign_member(campaign_id));

CREATE POLICY "materiais_remover"
  ON public.materiais FOR DELETE TO authenticated
  USING (public.is_campaign_member(campaign_id));

-- ============================================================================
-- 7. KITS
-- ============================================================================
ALTER TABLE public.kits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir tudo em kits" ON public.kits;
DROP POLICY IF EXISTS "Acesso total para usuários autenticados" ON public.kits;

CREATE POLICY "kits_membros"
  ON public.kits FOR ALL TO authenticated
  USING (public.is_campaign_member(campaign_id))
  WITH CHECK (public.is_campaign_member(campaign_id));

-- ============================================================================
-- 8. SAIDAS
-- ============================================================================
ALTER TABLE public.saidas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir tudo em saidas" ON public.saidas;
DROP POLICY IF EXISTS "Acesso total para usuários autenticados" ON public.saidas;

CREATE POLICY "saidas_membros"
  ON public.saidas FOR ALL TO authenticated
  USING (public.is_campaign_member(campaign_id))
  WITH CHECK (public.is_campaign_member(campaign_id));

-- ============================================================================
-- 9. SOLICITACOES
-- ============================================================================
ALTER TABLE public.solicitacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir tudo em solicitacoes" ON public.solicitacoes;
DROP POLICY IF EXISTS "Permitir solicitações via portal" ON public.solicitacoes;
DROP POLICY IF EXISTS "Acesso total para usuários autenticados" ON public.solicitacoes;

-- Portal público pode criar solicitação (status pendente).
CREATE POLICY "solicitacoes_inserir_publico"
  ON public.solicitacoes FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'pendente' OR public.is_campaign_member(campaign_id));

CREATE POLICY "solicitacoes_leitura_membros"
  ON public.solicitacoes FOR SELECT TO authenticated
  USING (public.is_campaign_member(campaign_id));

CREATE POLICY "solicitacoes_gerenciar"
  ON public.solicitacoes FOR UPDATE TO authenticated
  USING (public.is_campaign_member(campaign_id))
  WITH CHECK (public.is_campaign_member(campaign_id));

CREATE POLICY "solicitacoes_remover"
  ON public.solicitacoes FOR DELETE TO authenticated
  USING (public.is_campaign_member(campaign_id));

-- ============================================================================
-- 10. HISTORICO_ESTOQUE
-- ============================================================================
ALTER TABLE public.historico_estoque ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir tudo em historico_estoque" ON public.historico_estoque;
DROP POLICY IF EXISTS "Permitir leitura para autenticados" ON public.historico_estoque;
DROP POLICY IF EXISTS "Permitir inserção para autenticados" ON public.historico_estoque;

CREATE POLICY "historico_estoque_membros"
  ON public.historico_estoque FOR ALL TO authenticated
  USING (public.is_campaign_member(campaign_id))
  WITH CHECK (public.is_campaign_member(campaign_id));

-- ============================================================================
-- 11. CIDADE_METAS
-- ============================================================================
ALTER TABLE public.cidade_metas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir tudo em cidade_metas" ON public.cidade_metas;
DROP POLICY IF EXISTS "Acesso total para usuários autenticados" ON public.cidade_metas;

CREATE POLICY "cidade_metas_membros"
  ON public.cidade_metas FOR ALL TO authenticated
  USING (public.is_campaign_member(campaign_id))
  WITH CHECK (public.is_campaign_member(campaign_id));

-- ============================================================================
-- 12. CONFIG_CAMPANHA
-- ============================================================================
ALTER TABLE public.config_campanha ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir leitura pública da config" ON public.config_campanha;
DROP POLICY IF EXISTS "Acesso total para usuários autenticados" ON public.config_campanha;

CREATE POLICY "config_campanha_leitura_publica"
  ON public.config_campanha FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "config_campanha_gerenciar"
  ON public.config_campanha FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 13. BOLETINS_URNA (apuração paralela / quick count)
-- ============================================================================
ALTER TABLE public.boletins_urna ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir envio de BU via portal" ON public.boletins_urna;
DROP POLICY IF EXISTS "Acesso total para usuários autenticados" ON public.boletins_urna;

-- Fiscais enviam BUs pelo portal; leitura pública para apuração.
CREATE POLICY "boletins_urna_inserir_publico"
  ON public.boletins_urna FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "boletins_urna_leitura_publica"
  ON public.boletins_urna FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "boletins_urna_gerenciar"
  ON public.boletins_urna FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "boletins_urna_remover"
  ON public.boletins_urna FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- 14. SOLICITACOES_ADESAO
-- ============================================================================
-- A tabela era usada pelo código (src/lib/store.tsx) mas nunca foi criada em
-- migração. Criamos de forma idempotente para a RLS não falhar.
CREATE TABLE IF NOT EXISTS public.solicitacoes_adesao (
  id TEXT PRIMARY KEY,
  campanha_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  pessoa_id UUID REFERENCES public.pessoas(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  cpf TEXT,
  telefone TEXT,
  papel_campanha TEXT,
  papel_personalizado TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
  criado_em TIMESTAMPTZ DEFAULT now()
);

DROP POLICY IF EXISTS "Permitir tudo em solicitacoes_adesao" ON public.solicitacoes_adesao;

-- Cadastro público cria solicitações de adesão.
ALTER TABLE public.solicitacoes_adesao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "adesao_inserir_publico"
  ON public.solicitacoes_adesao FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "adesao_leitura_membros"
  ON public.solicitacoes_adesao FOR SELECT TO authenticated
  USING (public.is_campaign_member(campanha_id));

CREATE POLICY "adesao_gerenciar"
  ON public.solicitacoes_adesao FOR UPDATE TO authenticated
  USING (public.is_campaign_member(campanha_id))
  WITH CHECK (public.is_campaign_member(campanha_id));

CREATE POLICY "adesao_remover"
  ON public.solicitacoes_adesao FOR DELETE TO authenticated
  USING (public.is_campaign_member(campanha_id));

-- ============================================================================
-- 15. TABELAS PÚBLICAS POR NATUREZA (mantidas com acesso público)
-- ============================================================================
-- tse_candidatos: dados públicos do TSE (leitura p/ busca; escrita via scripts).
ALTER TABLE public.tse_candidatos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso publico tse_candidatos" ON public.tse_candidatos;
CREATE POLICY "tse_candidatos_publico"
  ON public.tse_candidatos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- pesquisas_chat: enquete pública (chat.democracias.org) e resultados públicos.
ALTER TABLE public.pesquisas_chat ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir tudo em pesquisas_chat" ON public.pesquisas_chat;
CREATE POLICY "pesquisas_chat_publico"
  ON public.pesquisas_chat FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- 16. WHATSAPP (mantido público — ver comentário no topo do arquivo)
-- ============================================================================
DROP POLICY IF EXISTS "Acesso publico para leitura de status de instancia" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "Acesso total para insercao e edicao de instancias" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "Acesso total para fila de mensagens" ON public.whatsapp_message_queue;
DROP POLICY IF EXISTS "Acesso total para logs de webhook" ON public.whatsapp_webhook_logs;
DROP POLICY IF EXISTS "Acesso publico whatsapp_instances" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "Acesso publico whatsapp_dispatch_queue" ON public.whatsapp_dispatch_queue;
DROP POLICY IF EXISTS "Acesso publico whatsapp_webhook_logs" ON public.whatsapp_webhook_logs;

CREATE POLICY "whatsapp_instances_publico"
  ON public.whatsapp_instances FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "whatsapp_dispatch_queue_publico"
  ON public.whatsapp_dispatch_queue FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "whatsapp_message_queue_publico"
  ON public.whatsapp_message_queue FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "whatsapp_webhook_logs_publico"
  ON public.whatsapp_webhook_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- 17. NOTIFICAR POSTGREST PARA RECARREGAR O ESQUEMA
-- ============================================================================
NOTIFY pgrst, 'reload schema';
