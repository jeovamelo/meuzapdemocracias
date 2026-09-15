import React, { useState } from 'react';
import { Vote, ArrowRight, ArrowLeft, Search, Eye, Sparkles, User, Check, Ban } from 'lucide-react';
import type { ColinhaVotos, Candidato } from '../types';
import { ModalBuscaCandidato } from './ModalBuscaCandidato';
import { gerarColinhaJpg } from '../lib/gerarColinhaJpg';
import { toast } from 'sonner';

interface Props {
  voterName: string;
  uf: string;
  onUfChange: (uf: string) => void;
  votos: ColinhaVotos;
  onVotosChange: (votos: ColinhaVotos) => void;
  onVoltar: () => void;
  onAvancar: () => void;
}

const ESTADOS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const CARGOS = [
  { key: 'deputado_federal', label: 'Deputado Federal', digitos: '4 dígitos', ordem: '1º' },
  { key: 'deputado_estadual', label: 'Deputado Estadual', digitos: '5 dígitos', ordem: '2º' },
  { key: 'senador_1', label: 'Senador(a) — 1ª Vaga', digitos: '3 dígitos', ordem: '3º' },
  { key: 'senador_2', label: 'Senador(a) — 2ª Vaga', digitos: '3 dígitos', ordem: '4º' },
  { key: 'governador', label: 'Governador(a)', digitos: '2 dígitos', ordem: '5º' },
  { key: 'presidente', label: 'Presidente', digitos: '2 dígitos', ordem: '6º' },
] as const;

export const Step2Colinha: React.FC<Props> = ({
  voterName,
  uf,
  onUfChange,
  votos,
  onVotosChange,
  onVoltar,
  onAvancar,
}) => {
  const [modalCargo, setModalCargo] = useState<{ key: keyof ColinhaVotos; label: string } | null>(null);
  const [previewImagem, setPreviewImagem] = useState<string | null>(null);
  const [gerandoPreview, setGerandoPreview] = useState(false);

  const handleSelecionarCandidato = (cand: Candidato) => {
    if (!modalCargo) return;
    onVotosChange({
      ...votos,
      [modalCargo.key]: cand,
    });
    toast.success(`${modalCargo.label} atualizado: ${cand.nomeUrna} (${cand.numero})`);
  };

  const abrirPreviewCanvas = async () => {
    setGerandoPreview(true);
    try {
      const { dataUrl } = await gerarColinhaJpg(votos, uf, voterName);
      setPreviewImagem(dataUrl);
    } catch (err) {
      toast.error('Não foi possível renderizar a imagem da colinha.');
    } finally {
      setGerandoPreview(false);
    }
  };

  const totalPreenchidos = Object.values(votos).filter(Boolean).length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in space-y-8">
      {/* Título */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
            <Vote className="size-4" /> Passo 2 de 4 • Montagem da Colinha Oficial
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Selecione seus candidatos de confiança
          </h1>
          <p className="text-slate-400 text-sm">
            Escolha os candidatos registrados no TSE ou selecione voto em branco para cada cargo.
          </p>
        </div>

        {/* Seletor de Estado */}
        <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 shrink-0">
          <span className="text-xs font-bold text-slate-400 px-2">Estado (UF):</span>
          <select
            value={uf}
            onChange={(e) => onUfChange(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-white font-bold rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            {ESTADOS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid com os 6 Cargos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CARGOS.map((cargo) => {
          const cand = votos[cargo.key];
          const isBrancoNulo = cand?.isBrancoNulo || cand?.numero === 'BRANCO' || cand?.numero === 'NULO';
          const isPres = cargo.key === 'presidente';
          const ufItem = isPres ? 'BR' : uf.toUpperCase();
          const fotoUrl = cand?.sq_candidato ? `/candidatos/F${ufItem}${cand.sq_candidato}_div.jpg` : undefined;

          return (
            <div
              key={cargo.key}
              className={`p-4 sm:p-5 rounded-3xl border transition-all flex flex-col justify-between gap-4 ${
                cand
                  ? 'border-emerald-500/50 bg-slate-900/90 shadow-lg shadow-emerald-500/5'
                  : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="size-6 rounded-lg bg-emerald-500/10 text-emerald-400 font-mono text-xs font-extrabold flex items-center justify-center border border-emerald-500/20">
                    {cargo.ordem}
                  </span>
                  <span className="text-sm font-bold text-slate-300">{cargo.label}</span>
                </div>
                <span className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md">
                  {cargo.digitos}
                </span>
              </div>

              {/* Informações do Candidato Selecionado */}
              <div className="flex items-center gap-3">
                <div className="size-14 rounded-2xl bg-slate-800 overflow-hidden border border-slate-700 flex items-center justify-center shrink-0">
                  {fotoUrl ? (
                    <img
                      src={fotoUrl}
                      alt={cand.nomeUrna}
                      className="size-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="text-slate-500">
                      {isBrancoNulo ? <Ban className="size-6" /> : <User className="size-6" />}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  {cand ? (
                    <>
                      <div className="flex items-center gap-2">
                        <p className="text-base font-extrabold text-white truncate">{cand.nomeUrna}</p>
                        {isBrancoNulo && (
                          <span className="text-[10px] font-mono font-bold bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                            BRANCO
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 truncate">
                        {cand.partido ? `${cand.partido} • ` : ''}{cand.nome}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-slate-400">Nenhum candidato definido</p>
                      <p className="text-xs text-slate-400">Clique no botão abaixo para escolher</p>
                    </>
                  )}
                </div>

                {cand && !isBrancoNulo && (
                  <div className="text-right shrink-0">
                    <span className="text-xl font-mono font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20">
                      {cand.numero}
                    </span>
                  </div>
                )}
              </div>

              {/* Botão de Alterar / Escolher */}
              <button
                type="button"
                onClick={() => setModalCargo({ key: cargo.key, label: cargo.label })}
                className="w-full h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 border border-slate-700 transition-colors cursor-pointer"
              >
                <Search className="size-3.5 text-emerald-400" />
                {cand ? 'Alterar Candidato' : 'Selecionar Candidato Oficial'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Barra de Ações & Preview */}
      <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <button
          type="button"
          onClick={onVoltar}
          className="h-12 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-sm flex items-center gap-2 transition-all border border-slate-800 cursor-pointer"
        >
          <ArrowLeft className="size-4" /> Voltar
        </button>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={abrirPreviewCanvas}
            disabled={gerandoPreview}
            className="flex-1 sm:flex-none h-12 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center gap-2 border border-slate-700 transition-all cursor-pointer"
          >
            <Eye className="size-4 text-emerald-400" />
            Pré-visualizar Imagem Oficial
          </button>

          <button
            type="button"
            onClick={onAvancar}
            disabled={totalPreenchidos === 0}
            className="flex-1 sm:flex-none h-12 px-8 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            <span>Avançar para Contatos ({totalPreenchidos}/6)</span>
            <ArrowRight className="size-4" />
          </button>
        </div>
      </div>

      {/* Modal de Busca de Candidato */}
      {modalCargo && (
        <ModalBuscaCandidato
          cargoNome={modalCargo.label}
          uf={uf}
          candidatoAtual={votos[modalCargo.key]}
          onSelecionar={handleSelecionarCandidato}
          onFechar={() => setModalCargo(null)}
        />
      )}

      {/* Modal de Preview da Imagem Canvas 960x1500 */}
      {previewImagem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="relative max-w-md w-full max-h-[94vh] bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-emerald-400" />
                <span className="text-sm font-bold text-white">Prévia da Colinha Digital (960x1500)</span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewImagem(null)}
                className="text-xs text-slate-400 hover:text-white font-bold px-2 py-1 rounded-lg hover:bg-slate-800"
              >
                ✕ Fechar
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 flex justify-center bg-slate-950">
              <img src={previewImagem} alt="Colinha Digital Oficial" className="max-h-[75vh] rounded-xl shadow-2xl" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
