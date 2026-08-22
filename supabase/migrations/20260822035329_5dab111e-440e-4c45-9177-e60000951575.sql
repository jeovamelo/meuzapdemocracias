-- Criar tabela de histórico de estoque para auditoria e ajustes
CREATE TABLE public.historico_estoque (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id uuid REFERENCES public.materiais(id) ON DELETE CASCADE NOT NULL,
    quantidade_anterior integer NOT NULL,
    quantidade_nova integer NOT NULL,
    diferenca integer NOT NULL,
    tipo text NOT NULL, -- 'saida', 'entrada', 'ajuste_inventario'
    observacao text,
    criado_em timestamp with time zone DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.historico_estoque ENABLE ROW LEVEL SECURITY;

-- Grants para API
GRANT SELECT, INSERT ON public.historico_estoque TO authenticated;
GRANT ALL ON public.historico_estoque TO service_role;

-- Políticas de RLS
CREATE POLICY "Permitir leitura para autenticados" ON public.historico_estoque
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permitir inserção para autenticados" ON public.historico_estoque
    FOR INSERT TO authenticated WITH CHECK (true);
