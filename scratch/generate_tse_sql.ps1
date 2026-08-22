Add-Type -AssemblyName System.IO.Compression.FileSystem

$zipPath = "c:\Users\jeova\.gemini\antigravity\brain\eleja\importados\consulta_cand_2026.zip"
$outputPath = "c:\Users\jeova\.gemini\antigravity\brain\eleja\eleja-supabase-docker\import_tse_candidatos.sql"

$zip = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
$entry = $zip.GetEntry("consulta_cand_2026_BRASIL.csv")

if (-not $entry) {
    Write-Host "Arquivo BRASIL nao encontrado, saindo..."
    $zip.Dispose()
    exit
}

$stream = $entry.Open()
$reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::GetEncoding("iso-8859-1"))
$writer = [System.IO.File]::CreateText($outputPath)

# Escrever DDL da tabela
$writer.WriteLine('-- Tabela oficial de Candidatos TSE 2026')
$writer.WriteLine('CREATE TABLE IF NOT EXISTS public.tse_candidatos (')
$writer.WriteLine('    id BIGSERIAL PRIMARY KEY,')
$writer.WriteLine('    ano_eleicao INTEGER NOT NULL DEFAULT 2026,')
$writer.WriteLine('    sg_uf VARCHAR(2) NOT NULL,')
$writer.WriteLine('    nm_ue VARCHAR(100),')
$writer.WriteLine('    cd_cargo INTEGER,')
$writer.WriteLine('    ds_cargo VARCHAR(100),')
$writer.WriteLine('    sq_candidato VARCHAR(25) NOT NULL,')
$writer.WriteLine('    nr_candidato VARCHAR(10) NOT NULL,')
$writer.WriteLine('    nm_candidato VARCHAR(255) NOT NULL,')
$writer.WriteLine('    nm_urna_candidato VARCHAR(255) NOT NULL,')
$writer.WriteLine('    sg_partido VARCHAR(20),')
$writer.WriteLine('    nm_partido VARCHAR(100),')
$writer.WriteLine('    ds_genero VARCHAR(50),')
$writer.WriteLine('    ds_ocupacao VARCHAR(100),')
$writer.WriteLine('    foto_url TEXT,')
$writer.WriteLine('    created_at TIMESTAMPTZ DEFAULT NOW()')
$writer.WriteLine(');')
$writer.WriteLine('')
$writer.WriteLine('CREATE INDEX IF NOT EXISTS idx_tse_cand_uf_nr ON public.tse_candidatos(sg_uf, nr_candidato);')
$writer.WriteLine('CREATE INDEX IF NOT EXISTS idx_tse_cand_sq ON public.tse_candidatos(sq_candidato);')
$writer.WriteLine('')
$writer.WriteLine('ALTER TABLE public.tse_candidatos ENABLE ROW LEVEL SECURITY;')
$writer.WriteLine('DROP POLICY IF EXISTS "Permitir leitura publica dos candidatos TSE" ON public.tse_candidatos;')
$writer.WriteLine('CREATE POLICY "Permitir leitura publica dos candidatos TSE" ON public.tse_candidatos FOR SELECT USING (true);')
$writer.WriteLine('')
$writer.WriteLine('INSERT INTO public.tse_candidatos (ano_eleicao, sg_uf, nm_ue, cd_cargo, ds_cargo, sq_candidato, nr_candidato, nm_candidato, nm_urna_candidato, sg_partido, nm_partido, ds_genero, ds_ocupacao, foto_url) VALUES')

$header = $reader.ReadLine()
$count = 0

while (-not $reader.EndOfStream) {
    $line = $reader.ReadLine()
    if ([string]::IsNullOrWhiteSpace($line)) { continue }

    $cols = $line.Split(';')
    if ($cols.Length -lt 20) { continue }

    $ano = $cols[2].Trim('"')
    $sg_uf = $cols[10].Trim('"').Replace("'", "''")
    $nm_ue = $cols[12].Trim('"').Replace("'", "''")
    $cd_cargo = $cols[13].Trim('"')
    if (-not [int]::TryParse($cd_cargo, [ref]$null)) { $cd_cargo = "NULL" }
    $ds_cargo = $cols[14].Trim('"').Replace("'", "''")
    $sq_candidato = $cols[15].Trim('"').Replace("'", "''")
    $nr_candidato = $cols[16].Trim('"').Replace("'", "''")
    $nm_candidato = $cols[17].Trim('"').Replace("'", "''")
    $nm_urna = $cols[18].Trim('"').Replace("'", "''")
    $sg_partido = $cols[26].Trim('"').Replace("'", "''")
    $nm_partido = $cols[27].Trim('"').Replace("'", "''")
    $ds_genero = $cols[39].Trim('"').Replace("'", "''")
    $ds_ocupacao = $cols[47].Trim('"').Replace("'", "''")
    
    $foto_url = "https://divulgacandcontas.tse.jus.br/divulga/rest/v1/candidatura/buscar/foto/$ano/$sq_candidato"

    if ($count -gt 0) {
        $writer.WriteLine(",")
    }

    $writer.Write("($ano, '$sg_uf', '$nm_ue', $cd_cargo, '$ds_cargo', '$sq_candidato', '$nr_candidato', '$nm_candidato', '$nm_urna', '$sg_partido', '$nm_partido', '$ds_genero', '$ds_ocupacao', '$foto_url')")
    $count++
}

$writer.WriteLine(";")
$writer.Close()
$reader.Close()
$stream.Close()
$zip.Dispose()

Write-Host "Total de candidatos processados: $count"
Write-Host "Arquivo SQL gerado com sucesso em: $outputPath"
