import React, { useState } from 'react';
import { MapPin, Search, Send, Loader2, Building2, ArrowRight } from 'lucide-react';
import { buscarCep, formatarCep } from '../lib/cep';

interface Props {
  ufInicial: string;
  onConfirmar: (dados: { cidade: string; bairro: string; cep?: string }) => void;
}

export const LocationInput: React.FC<Props> = ({ ufInicial, onConfirmar }) => {
  const [cep, setCep] = useState('');
  const [cidade, setCidade] = useState('');
  const [bairro, setBairro] = useState('');
  const [loadingCep, setLoadingCep] = useState(false);

  const handleCepChange = async (val: string) => {
    const formatado = formatarCep(val);
    setCep(formatado);

    const clean = val.replace(/\D/g, '');
    if (clean.length === 8) {
      setLoadingCep(true);
      try {
        const res = await buscarCep(clean);
        if (res && !res.erro) {
          if (res.localidade) setCidade(res.localidade);
          if (res.bairro) setBairro(res.bairro);
        }
      } catch (err) {
        console.warn('Erro ao consultar CEP:', err);
      } finally {
        setLoadingCep(false);
      }
    }
  };

  const handleSubmeter = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onConfirmar({
      cidade: cidade.trim() || 'Não informado',
      bairro: bairro.trim() || 'Geral',
      cep: cep.trim() || undefined,
    });
  };

  const handlePular = () => {
    onConfirmar({
      cidade: 'Não informado',
      bairro: 'Geral',
    });
  };

  return (
    <form onSubmit={handleSubmeter} className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 space-y-3.5 shadow-xl animate-message">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <MapPin className="size-4 text-orange-400" />
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">
            Sua Localidade ({ufInicial || 'BR'})
          </h4>
        </div>
        <span className="text-[10px] font-bold text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded-full">
          Opcional
        </span>
      </div>

      <div className="space-y-3">
        {/* CEP (Preenchimento Rápido) */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 mb-1">
            CEP (Preenchimento Rápido - Opcional)
          </label>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              maxLength={9}
              value={cep}
              onChange={(e) => handleCepChange(e.target.value)}
              placeholder="00000-000"
              className="w-full h-10 px-3 pr-10 rounded-xl bg-slate-950 border border-slate-700 font-mono text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            />
            {loadingCep && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-orange-400 animate-spin" />
            )}
          </div>
        </div>

        {/* CIDADE / MUNICÍPIO */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 mb-1">
            Município / Cidade
          </label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
            <input
              type="text"
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              placeholder={`Digite o nome da sua cidade em ${ufInicial}...`}
              className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            />
          </div>
        </div>

        {/* BAIRRO */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 mb-1">
            Bairro ou Região
          </label>
          <input
            type="text"
            value={bairro}
            onChange={(e) => setBairro(e.target.value)}
            placeholder="Digite o seu bairro..."
            className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
          />
        </div>
      </div>

      <div className="space-y-2 pt-1">
        <button
          type="submit"
          className="w-full h-11 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
        >
          <Send className="size-4" />
          <span>{cidade.trim() ? 'Confirmar Localidade e Prosseguir' : 'Avançar sem Localidade'}</span>
        </button>

        <button
          type="button"
          onClick={handlePular}
          className="w-full text-center text-xs font-bold text-slate-400 hover:text-slate-200 py-1 transition-colors cursor-pointer"
        >
          Pular e prosseguir sem localidade →
        </button>
      </div>
    </form>
  );
};

export default LocationInput;
