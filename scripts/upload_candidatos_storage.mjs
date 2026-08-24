#!/usr/bin/env node
/**
 * =============================================================================
 * DEMOCRACIAS — SCRIPT DE PROCESSAMENTO E UPLOAD DE FOTOS TSE (NODE.JS)
 * =============================================================================
 * Padrão oficial do TSE: FUFNNNNNNNNNNNN_div.extensão
 * - UF: Sigla do estado ou BR (Presidência)
 * - NNNNNNNNNNNN: SQ_CANDIDATO (11 a 14 dígitos)
 * - div: Foto divulgável
 * =============================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AdmZip from 'adm-zip';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Regex oficial do TSE
const TSE_FOTO_REGEX = /^F([A-Z]{2})([0-9]{11,14})_div\.(jpe?g|png|webp)$/i;

const DEFAULT_ORIGEM = path.resolve(__dirname, '../importados/fotos');
const DEFAULT_DESTINO = path.resolve(__dirname, '../chat/public/candidatos');
const DEFAULT_BUCKET = 'candidatos-fotos';
const DEFAULT_PREFIX = '/candidatos';

export function parseTseFilename(filename) {
  const baseName = path.basename(filename);
  const match = TSE_FOTO_REGEX.exec(baseName);
  if (!match) return null;

  const sg_uf = match[1].toUpperCase();
  const sq_candidato = match[2];
  const ext = match[3].toLowerCase();

  return {
    filename: `F${sg_uf}${sq_candidato}_div.${ext}`,
    sg_uf,
    sq_candidato,
    extensao: ext,
    originalName: baseName,
  };
}

export async function processarFotos({
  origemPath = DEFAULT_ORIGEM,
  destinoPath = DEFAULT_DESTINO,
  dbUrl = process.env.DATABASE_URL || 'postgres://postgres:your-super-secret-and-long-postgres-password@82.112.245.35:5432/postgres',
  prefixUrl = DEFAULT_PREFIX,
  dryRun = false,
} = {}) {
  console.log('='.repeat(70));
  console.log('🇧🇷 DEMOCRACIAS — PROCESSADOR DE FOTOS TSE (NODE.JS)');
  console.log('='.repeat(70));
  console.log(`📁 Origem : ${origemPath}`);
  console.log(`📁 Destino: ${destinoPath}`);

  if (!fs.existsSync(destinoPath)) {
    fs.mkdirSync(destinoPath, { recursive: true });
  }

  const candidatosMap = new Map();

  // 1. Processar Zips
  if (fs.existsSync(origemPath)) {
    const files = fs.readdirSync(origemPath);
    for (const file of files) {
      const fullPath = path.join(origemPath, file);
      const stat = fs.statSync(fullPath);

      if (stat.isFile() && file.endsWith('.zip')) {
        console.log(`📦 Processando ZIP: ${file}...`);
        try {
          const zip = new AdmZip(fullPath);
          const zipEntries = zip.getEntries();

          for (const entry of zipEntries) {
            if (entry.isDirectory) continue;
            const parsed = parseTseFilename(entry.name);
            if (parsed) {
              const target = path.join(destinoPath, parsed.filename);
              fs.writeFileSync(target, entry.getData());
              candidatosMap.set(parsed.sq_candidato, parsed);
            }
          }
        } catch (err) {
          console.warn(`⚠️ Erro ao ler zip ${file}:`, err.message);
        }
      } else if (stat.isFile() && /\.(jpe?g|png|webp)$/i.test(file)) {
        const parsed = parseTseFilename(file);
        if (parsed) {
          const target = path.join(destinoPath, parsed.filename);
          if (!fs.existsSync(target)) {
            fs.copyFileSync(fullPath, target);
          }
          candidatosMap.set(parsed.sq_candidato, parsed);
        }
      }
    }
  }

  const listaCandidatos = Array.from(candidatosMap.values());
  console.log(`✅ Total de candidatos com fotos válidas: ${listaCandidatos.length}`);

  if (listaCandidatos.length === 0 || dryRun) {
    if (dryRun) console.log('🔍 Execução em modo DRY-RUN (sem gravação no banco).');
    return listaCandidatos;
  }

  // 2. Atualizar no Banco de Dados
  console.log(`🔄 Atualizando tabela tse_candidatos no PostgreSQL...`);
  const client = new pg.Client({ connectionString: dbUrl });

  try {
    await client.connect();

    // Garantir bucket no storage.buckets
    await client.query(`
      INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      VALUES ($1, $1, true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg'])
      ON CONFLICT (id) DO UPDATE SET public = true;
    `, [DEFAULT_BUCKET]);

    // Atualização em lote
    let count = 0;
    const batchSize = 500;

    for (let i = 0; i < listaCandidatos.length; i += batchSize) {
      const chunk = listaCandidatos.slice(i, i + batchSize);
      
      const updateQueries = chunk.map((c) => {
        const url = `${prefixUrl}/${c.filename}`;
        return client.query(
          'UPDATE public.tse_candidatos SET foto_url = $1 WHERE sq_candidato = $2;',
          [url, c.sq_candidato]
        );
      });

      await Promise.all(updateQueries);
      count += chunk.length;
      process.stdout.write(`\r   Progresso: ${count}/${listaCandidatos.length} candidatos atualizados`);
    }

    console.log(`\n🎉 Banco de dados atualizado com sucesso!`);
  } catch (err) {
    console.error('❌ Erro no banco:', err.message);
  } finally {
    await client.end();
  }

  return listaCandidatos;
}

// Se executado diretamente pelo terminal
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  processFotos().catch(console.error);
}
