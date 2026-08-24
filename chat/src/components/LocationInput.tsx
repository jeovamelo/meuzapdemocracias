import React, { useState } from 'react';
import { MapPin, Search, Send, Loader2, Building2 } from 'lucide-react';
import { buscarCep, formatarCep } from '../lib/cep';

interface Props {
  ufInicial: string;
  onConfirmar: (dados: { cidade: string; bairro: string; cep?: string }) => void;
}

export const LocationInput: React.FC<Props> = ({ ufInicial, onConfirmar }) => {
  const [cep, setCep] = useState('');
  const [cidade, setCidade] = useState(ufInicial === 'CE' ? 'Fortaleza' : '');
  const [bairro, setBairro] = useState('');
  const [loadingCep, setLoadingCep] = useState(false);

  const handleCepChange = async (val: string) => {
    const formatado = formatarCep(val);
    setCep(formatado);

    const clean = val.replace(/\D/g, '');
    if (clean.length === 8) {
      setLoadingCep(true);
      const res = await buscarCep(clean);
      setLoadingCep(false);

      if (res && !res.erro) {
        if (res.localidade) setCidade(res.localidade);
        if (res.bairro) setBairro(res.bairro);
      }
    }
  };

  const handleSubmeter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cidade.trim()) return;
    onConfirmar({
      cidade: cidade.trim(),
      bairro: bairro.trim() || 'Centro / Geral',
      cep: cep.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmeter} className="rounded-2xl border border-slate-800 bg-slate-800/80 p-4 space-y-3 shadow-lg animate-message">
      <div className="flex items-center gap-2 border-b border-slate-700/80 pb-2">
        <MapPin className="size-4 text-orange-400" />
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
          Sua Localidade ({ufInicial})
        </h4>
      </div>

      <div className="space-y-2.5">
        {/* CEP (Opcional) */}
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
              className="w-full h-10 px-3 pr-10 rounded-xl bg-slate-900 border border-slate-700 font-mono text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            />
            {loadingCep && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-orange-400 animate-spin" />
            )}
          </div>
        </div>

        {/* CIDADE / MUNICÍPIO */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 mb-1">
            Município / Cidade <span className="text-orange-500">*</span>
          </label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
            <input
              type="text"
              required
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              placeholder="Ex: Fortaleza, Sobral, Juazeiro do Norte..."
              className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
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
            placeholder="Ex: Aldeota, Messejana, Barra do Ceará..."
            className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={!cidade.trim()}
        className="w-full h-11 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Send className="size-4" /> Concluir e Enviar Resposta
      </button>
    </form>
  );
};
