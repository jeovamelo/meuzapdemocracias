#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=============================================================================
DEMOCRACIAS — SCRIPT DE PROCESSAMENTO E UPLOAD EM LOTE DE FOTOS TSE (2026)
=============================================================================
Este script realiza a leitura recursiva de pastas e pacotes ZIP com fotos
oficiais de candidatas e candidatos divulgadas pelo Tribunal Superior Eleitoral (TSE),
processa o padrão oficial de nomenclatura e realiza a sincronização com o
Storage do Supabase e a base de dados PostgreSQL.

PADRÃO OFICIAL DO TSE:
  FUFNNNNNNNNNNNN_div.extensão
  - 'F'            : Prefixo de Foto
  - 'UF'           : Sigla do Estado ou 'BR' (Presidente/Vice)
  - 'NNNNNNNNNNNN' : SQ_CANDIDATO (11 a 14 dígitos)
  - '_div'         : Sufixo de foto divulgável
  - '.extensão'    : Formato (.jpg, .jpeg, .png, .webp)

Exemplos:
  - FCE60002540709_div.jpg   -> UF: CE | SQ_CANDIDATO: 60002540709
  - FBR280002542548_div.jpg  -> UF: BR | SQ_CANDIDATO: 280002542548
=============================================================================
"""

import os
import re
import sys
import glob
import json
import zipfile
import argparse
import urllib.request
import urllib.error

# Forçar UTF-8 no stdout para compatibilidade no Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

# Regex oficial do TSE
TSE_FOTO_REGEX = re.compile(
    r'^F([A-Z]{2})([0-9]{11,14})_div\.(jpe?g|png|webp)$',
    re.IGNORECASE
)

DEFAULT_BUCKET = 'candidatos-fotos'
DEFAULT_PUBLIC_PREFIX = '/candidatos'


def parse_tse_filename(filename: str):
    """
    Valida e extrai metadados do nome do arquivo segundo a norma do TSE.
    """
    base_name = os.path.basename(filename)
    match = TSE_FOTO_REGEX.match(base_name)
    if not match:
        return None
    sg_uf = match.group(1).upper()
    sq_candidato = match.group(2)
    ext = match.group(3).lower()
    return {
        'filename': f"F{sg_uf}{sq_candidato}_div.{ext}",
        'sg_uf': sg_uf,
        'sq_candidato': sq_candidato,
        'extensao': ext,
        'original_name': base_name
    }


def processar_origem(origem_path: str, destino_path: str):
    """
    Varre recursivamente zips e imagens da pasta de origem.
    """
    os.makedirs(destino_path, exist_ok=True)
    candidatos = {}
    erros = []

    print(f"\n📂 Lendo arquivos da pasta: {origem_path}")

    # 1. Varredura de arquivos ZIP
    zips = glob.glob(os.path.join(origem_path, '**', '*.zip'), recursive=True)
    if zips:
        print(f"📦 Localizados {len(zips)} arquivos compactados (.zip).")
        for z_path in sorted(zips):
            z_nome = os.path.basename(z_path)
            try:
                with zipfile.ZipFile(z_path, 'r') as zf:
                    for member in zf.namelist():
                        member_base = os.path.basename(member)
                        parsed = parse_tse_filename(member_base)
                        if parsed:
                            target_file = os.path.join(destino_path, parsed['filename'])
                            if not os.path.exists(target_file):
                                with open(target_file, 'wb') as out_f:
                                    out_f.write(zf.read(member))
                            candidatos[parsed['sq_candidato']] = parsed
            except Exception as e:
                erros.append(f"Erro em {z_nome}: {e}")

    # 2. Varredura de imagens soltas
    exts = ('*.jpg', '*.jpeg', '*.png', '*.webp', '*.JPG', '*.JPEG', '*.PNG')
    imagens = []
    for ext in exts:
        imagens.extend(glob.glob(os.path.join(origem_path, '**', ext), recursive=True))

    if imagens:
        print(f"🖼️ Localizadas {len(imagens)} imagens soltas.")
        for img_path in imagens:
            parsed = parse_tse_filename(img_path)
            if parsed:
                target_file = os.path.join(destino_path, parsed['filename'])
                if not os.path.exists(target_file):
                    with open(img_path, 'rb') as f_in, open(target_file, 'wb') as f_out:
                        f_out.write(f_in.read())
                candidatos[parsed['sq_candidato']] = parsed

    print(f"✅ Total de fotos válidas mapeadas pelo SQ_CANDIDATO: {len(candidatos)}")
    return list(candidatos.values()), erros


def atualizar_via_rest(candidatos: list, supabase_url: str, supabase_key: str, prefix_url: str):
    """
    Atualiza fotos via Supabase REST API (sem necessidade de drivers binários do Postgres).
    """
    print(f"\n🌐 Atualizando {len(candidatos)} registros via Supabase REST API...")
    headers = {
        'apikey': supabase_key,
        'Authorization': f'Bearer {supabase_key}',
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
    }

    total = len(candidatos)
    atualizados = 0

    for i, c in enumerate(candidatos):
        foto_url = f"{prefix_url}/{c['filename']}"
        endpoint = f"{supabase_url.rstrip('/')}/rest/v1/tse_candidatos?sq_candidato=eq.{c['sq_candidato']}"
        payload = json.dumps({'foto_url': foto_url}).encode('utf-8')

        req = urllib.request.Request(endpoint, data=payload, headers=headers, method='PATCH')
        try:
            with urllib.request.urlopen(req) as resp:
                if resp.status in (200, 204):
                    atualizados += 1
        except urllib.error.HTTPError as e:
            # Continua em caso de registro ausente no lote
            pass
        except Exception as e:
            pass

        if (i + 1) % 500 == 0 or (i + 1) == total:
            sys.stdout.write(f"\r   Progresso: {i + 1}/{total} processados ({atualizados} atualizados)")
            sys.stdout.flush()

    print(f"\n🎉 Concluído! {atualizados} registros atualizados.")


def main():
    parser = argparse.ArgumentParser(
        description="Automação de Processamento e Upload de Fotos TSE para Supabase (Democracias)"
    )
    parser.add_argument(
        '--origem',
        default=r'C:\Users\jeova\.gemini\antigravity\brain\eleja\importados\fotos',
        help='Pasta de origem com as fotos ou arquivos .zip'
    )
    parser.add_argument(
        '--destino',
        default=r'C:\Users\jeova\.gemini\antigravity\brain\eleja\chat\public\candidatos',
        help='Pasta de saída local para fotos processadas'
    )
    parser.add_argument(
        '--supabase-url',
        default=os.getenv('VITE_SUPABASE_URL', 'https://democracias.org'),
        help='URL do Supabase'
    )
    parser.add_argument(
        '--supabase-key',
        default=os.getenv('SUPABASE_SERVICE_ROLE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q'),
        help='Service Role Key do Supabase'
    )
    parser.add_argument(
        '--url-prefix',
        default='/candidatos',
        help='Prefixo da URL pública da foto (ex: /candidatos ou /storage/v1/object/public/candidatos-fotos)'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Simula a leitura e validação sem enviar ao banco'
    )

    args = parser.parse_args()

    print("=" * 75)
    print("🇧🇷 DEMOCRACIAS — AUTOMAÇÃO DE FOTOS TSE (PADRÃO 2026)")
    print("=" * 75)
    print(f"📁 Origem : {args.origem}")
    print(f"📁 Destino: {args.destino}")
    print(f"🌐 Prefixo: {args.url_prefix}")

    candidatos, erros = processar_origem(args.origem, args.destino)

    if erros:
        print(f"\n⚠️ Avisos ({len(erros)}):")
        for err in erros[:5]:
            print(f"  - {err}")

    if args.dry_run:
        print("\n🔍 Modo DRY-RUN ativo. Exemplo dos primeiros 5 itens mapeados:")
        for c in candidatos[:5]:
            print(f"   SQ: {c['sq_candidato']} | UF: {c['sg_uf']} -> {args.url_prefix}/{c['filename']}")
        return

    # Tentar via psycopg2 se disponível, caso contrário usar REST API nativa
    try:
        import psycopg2
        from psycopg2.extras import execute_batch
        db_url = os.getenv('DATABASE_URL')
        if db_url:
            print("\n🔌 Conectando diretamente via PostgreSQL (psycopg2)...")
            conn = psycopg2.connect(db_url)
            cur = conn.cursor()
            update_data = [(f"{args.url_prefix}/{c['filename']}", c['sq_candidato']) for c in candidatos]
            execute_batch(cur, "UPDATE public.tse_candidatos SET foto_url = %s WHERE sq_candidato = %s;", update_data, page_size=1000)
            conn.commit()
            cur.close()
            conn.close()
            print(f"🎉 Banco PostgreSQL atualizado com sucesso! ({len(candidatos)} registros)")
            return
    except ImportError:
        pass

    # Fallback para REST API
    atualizar_via_rest(candidatos, args.supabase_url, args.supabase_key, args.url_prefix)


if __name__ == '__main__':
    main()
