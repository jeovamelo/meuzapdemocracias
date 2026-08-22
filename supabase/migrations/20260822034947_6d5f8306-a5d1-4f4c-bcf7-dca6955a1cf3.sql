-- 1. Inserir Configuração Inicial
INSERT INTO public.config_campanha (candidato_nome, candidato_urna, numero, cargo, partido_coligacao, uf, meta_eleicao, meta_expectativa, total_secoes, configurada)
VALUES ('Missias Dias', 'Missias Dias', '13123', 'Deputado Estadual', 'PT', 'CE', 50000, 60000, 500, true);

-- 2. Inserir Comitês
INSERT INTO public.comites (nome, endereco, bairro, municipio, uf, coordenador, whatsapp_coordenador, observacoes, status, ativo, cep, numero, complemento, meta_votos, meta_votos_conquistados)
VALUES 
('Comitê Central Fortaleza', 'Av. Desembargador Moreira, 1000', 'Aldeota', 'Fortaleza', 'CE', 'Maria Oliveira', '85988770011', 'Base principal de distribuição. Abre às 07h.', 'ativo', true, '60170-002', '1000', 'Térreo', 50000, 12500),
('Base Caucaia - Centro', 'Rua Juaci Sampaio Pontes, 88', 'Centro', 'Caucaia', 'CE', 'Ana Paula Santos', NULL, 'Galpão com estoque de bandeiras.', 'ativo', true, '61600-004', '88', NULL, 20000, 8000),
('Ponto Maracanaú', 'Av. Mendel Steinbruch, 12', 'Pajuçara', 'Maracanaú', 'CE', 'Roberto Mendes', NULL, 'Ponto estratégico de rua.', 'ativo', true, '61939-200', '12', NULL, 15000, 3000),
('Base Juazeiro do Norte', 'Rua Padre Cícero, 501', 'Centro', 'Juazeiro do Norte', 'CE', 'Cleber Araújo', NULL, 'Chave com o coordenador local.', 'ativo', true, '63010-020', '501', NULL, 30000, 15000);

-- 3. Inserir Pessoas
INSERT INTO public.pessoas (nome, cpf, tipo, funcao, municipio, uf, telefone, zona, status, meta_votos, meta_votos_conquistados)
VALUES 
('Maria Oliveira', '123.456.789-00', 'responsavel', 'Coordenadora Geral', 'Fortaleza', 'CE', '85988770011', 'Zona 001', 'ativo', 5000, 1200),
('Ana Paula Santos', '234.567.890-11', 'responsavel', 'Coordenadora de Base', 'Caucaia', 'CE', '85987661122', 'Zona 120', 'ativo', 3000, 1500),
('Roberto Mendes', '345.678.901-22', 'responsavel', 'Responsável de Ponto', 'Maracanaú', 'CE', '85991234455', 'Zona 104', 'ativo', 2000, 400),
('Roberto Silveira', '456.789.012-33', 'apoiador', 'Cabo Eleitoral', 'Juazeiro do Norte', 'CE', '88994455667', 'Zona 028', 'ativo', 1000, 500);

-- 4. Inserir Materiais
INSERT INTO public.materiais (nome, categoria, estoque, estoque_minimo, unidade, arquivado)
VALUES 
('Santinho A5 - Missias Dias', 'Santinho', 125000, 50000, 'un', false),
('Bandeira 1,0 x 0,7m', 'Bandeira', 1450, 500, 'un', false),
('Adesivo Perfurado 20x10cm', 'Adesivo (Sanfonado / Pequeno)', 8600, 3000, 'un', false),
('Camiseta Branca Missias', 'Vestuário (Camiseta, Boné, Colete)', 2400, 600, 'un', false),
('Boné Missias', 'Vestuário (Camiseta, Boné, Colete)', 380, 500, 'un', false),
('Adesivo de Pára-choque 13123', 'Adesivo pára-choque', 1200, 300, 'un', false);

-- 5. Inserir Metas por Cidade
INSERT INTO public.cidade_metas (municipio, uf, meta_campanha, realidade_votos)
VALUES 
('Fortaleza', 'CE', 25000, 5000),
('Caucaia', 'CE', 15000, 3000),
('Maracanaú', 'CE', 10000, 1500),
('Juazeiro do Norte', 'CE', 12000, 6000),
('Sobral', 'CE', 8000, 4000);