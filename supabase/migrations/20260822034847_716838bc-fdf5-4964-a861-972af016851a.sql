-- Criar tipos enum
DO $$ BEGIN
    CREATE TYPE public.comite_status AS ENUM ('ativo', 'pendente_validacao');
    CREATE TYPE public.tipo_pessoa AS ENUM ('responsavel', 'apoiador');
    CREATE TYPE public.solicitacao_status AS ENUM ('pendente', 'separando', 'pronto', 'entregue', 'cancelado');
    CREATE TYPE public.tipo_logistica AS ENUM ('retirada', 'entrega');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. Configuração da Campanha
CREATE TABLE public.config_campanha (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidato_nome TEXT NOT NULL,
    candidato_urna TEXT,
    numero TEXT NOT NULL,
    cargo TEXT,
    partido_coligacao TEXT,
    uf TEXT NOT NULL,
    meta_eleicao INTEGER DEFAULT 0,
    meta_expectativa INTEGER DEFAULT 0,
    total_secoes INTEGER DEFAULT 0,
    configurada BOOLEAN DEFAULT false,
    criado_em TIMESTAMPTZ DEFAULT now(),
    atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- 2. Comitês
CREATE TABLE public.comites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    endereco TEXT,
    numero TEXT,
    complemento TEXT,
    bairro TEXT,
    municipio TEXT NOT NULL,
    uf TEXT NOT NULL,
    cep TEXT,
    ponto_referencia TEXT,
    coordenador TEXT NOT NULL,
    whatsapp_coordenador TEXT,
    observacoes TEXT,
    status public.comite_status DEFAULT 'ativo',
    ativo BOOLEAN DEFAULT true,
    meta_votos INTEGER DEFAULT 0,
    meta_votos_conquistados INTEGER DEFAULT 0,
    foto TEXT,
    criado_em TIMESTAMPTZ DEFAULT now()
);

-- 3. Pessoas (Lideranças e Apoiadores)
CREATE TABLE public.pessoas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    cpf TEXT,
    tipo public.tipo_pessoa DEFAULT 'apoiador',
    funcao TEXT,
    comite_id UUID REFERENCES public.comites(id),
    cep TEXT,
    endereco TEXT,
    numero TEXT,
    complemento TEXT,
    bairro TEXT,
    municipio TEXT NOT NULL,
    uf TEXT NOT NULL,
    telefone TEXT NOT NULL,
    zona TEXT,
    status TEXT DEFAULT 'ativo',
    meta_votos INTEGER DEFAULT 0,
    meta_votos_conquistados INTEGER DEFAULT 0,
    criado_em TIMESTAMPTZ DEFAULT now()
);

-- 4. Materiais
CREATE TABLE public.materiais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    categoria TEXT NOT NULL,
    estoque INTEGER DEFAULT 0,
    estoque_minimo INTEGER DEFAULT 0,
    unidade TEXT DEFAULT 'un',
    descricao TEXT,
    foto TEXT,
    arquivado BOOLEAN DEFAULT false,
    criado_em TIMESTAMPTZ DEFAULT now()
);

-- 5. Kits
CREATE TABLE public.kits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    descricao TEXT,
    itens JSONB DEFAULT '[]'::jsonb,
    arquivado BOOLEAN DEFAULT false,
    criado_em TIMESTAMPTZ DEFAULT now()
);

-- 6. Transações de Estoque (Saídas)
CREATE TABLE public.saidas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comite_id UUID REFERENCES public.comites(id),
    pessoa_id UUID REFERENCES public.pessoas(id),
    kits JSONB DEFAULT '[]'::jsonb,
    itens JSONB DEFAULT '[]'::jsonb,
    criado_em TIMESTAMPTZ DEFAULT now()
);

-- 7. Solicitações de Material
CREATE TABLE public.solicitacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    comite_id UUID REFERENCES public.comites(id),
    lideranca_id UUID REFERENCES public.pessoas(id),
    municipio TEXT,
    itens JSONB DEFAULT '[]'::jsonb,
    tipo_logistica public.tipo_logistica DEFAULT 'retirada',
    endereco_entrega TEXT,
    status public.solicitacao_status DEFAULT 'pendente',
    criado_em TIMESTAMPTZ DEFAULT now()
);

-- 8. Metas por Cidade
CREATE TABLE public.cidade_metas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    municipio TEXT NOT NULL,
    uf TEXT NOT NULL,
    meta_campanha INTEGER DEFAULT 0,
    realidade_votos INTEGER DEFAULT 0,
    criado_em TIMESTAMPTZ DEFAULT now()
);

-- 9. Boletins de Urna (Quick Count)
CREATE TABLE public.boletins_urna (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    secao TEXT NOT NULL,
    zona TEXT NOT NULL,
    municipio TEXT NOT NULL,
    uf TEXT NOT NULL,
    total_votos INTEGER NOT NULL,
    votos_candidato INTEGER NOT NULL,
    data_leitura TIMESTAMPTZ DEFAULT now(),
    fiscal_id UUID,
    foto TEXT,
    pleito TEXT,
    assinatura_digital TEXT,
    criado_em TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.config_campanha ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pessoas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cidade_metas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boletins_urna ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Políticas de Acesso (Exemplo Simplificado para este MVP)
-- Public access for signup/registration and BU scanning
CREATE POLICY "Permitir leitura pública da config" ON public.config_campanha FOR SELECT TO anon USING (true);
CREATE POLICY "Permitir cadastro de pessoas via portal" ON public.pessoas FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Permitir cadastro de comites via portal" ON public.comites FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Permitir solicitações via portal" ON public.solicitacoes FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Permitir envio de BU via portal" ON public.boletins_urna FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Permitir leitura de materiais para solicitação" ON public.materiais FOR SELECT TO anon USING (true);
CREATE POLICY "Permitir leitura de comites para cadastro" ON public.comites FOR SELECT TO anon USING (true);
CREATE POLICY "Permitir leitura de pessoas para lideranças" ON public.pessoas FOR SELECT TO anon USING (true);

-- Authenticated users policies
CREATE POLICY "Acesso total para usuários autenticados" ON public.config_campanha FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total para usuários autenticados" ON public.comites FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total para usuários autenticados" ON public.pessoas FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total para usuários autenticados" ON public.materiais FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total para usuários autenticados" ON public.kits FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total para usuários autenticados" ON public.saidas FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total para usuários autenticados" ON public.solicitacoes FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total para usuários autenticados" ON public.cidade_metas FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total para usuários autenticados" ON public.boletins_urna FOR ALL TO authenticated USING (true);