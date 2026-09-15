import React, { useState, useEffect } from 'react';
import { Users, Search, Plus, Trash2, ArrowRight, ArrowLeft, Loader2, CheckSquare, Square, ShieldAlert, Sparkles } from 'lucide-react';
import type { ContatoWhatsApp } from '../types';
import { buscarContatosRelevantes } from '../lib/meuzapApi';
import { toast } from 'sonner';

interface Props {
  sessionId: string;
  contatos: ContatoWhatsApp[];
  onContatosChange: (contatos: ContatoWhatsApp[]) => void;
  onVoltar: () => void;
  onAvancar: () => void;
}

export const Step3Contatos: React.FC<Props> = ({
  sessionId,
  contatos,
  onContatosChange,
  onVoltar,
  onAvancar,
}) => {
  const [carregando, setCarregando] = useState(contatos.length === 0);
  const [busca, setBusca] = useState('');
  const [mostrarModalManual, setMostrarModalManual] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoNumero, setNovoNumero] = useState('');

  useEffect(() => {
    if (contatos.length > 0) return;

    async function carregar() {
      setCarregando(true);
      try {
        const res = await buscarContatosRelevantes(sessionId);
        if (res.success && res.contacts) {
          // Inicialmente todos os contatos válidos vêm selecionados (até 100)
          const comSelecao = res.contacts.map((c) => ({ ...c, selected: true }));
          onContatosChange(comSelecao);
          toast.success(`${comSelecao.length} contatos relevantes identificados da sua agenda!`);
        } else {
          toast.warning('Nenhum contato recente encontrado automaticamente. Você pode adicionar manualmente.');
        }
      } catch {
        toast.error('Erro ao sincronizar contatos do WhatsApp.');
      } finally {
        setCarregando(false);
      }
    }

    carregar();
  }, [sessionId, contatos.length, onContatosChange]);

  const toggleSelecionar = (id: string) => {
    onContatosChange(
      contatos.map((c) => (c.id === id ? { ...c, selected: !c.selected } : c))
    );
  };

  const removerContato = (id: string) => {
    onContatosChange(contatos.filter((c) => c.id !== id));
    toast.info('Contato removido da lista de disparo.');
  };

  const selecionarTodos = () => {
    onContatosChange(contatos.map((c) => ({ ...c, selected: true })));
  };

  const desmarcarTodos = () => {
    onContatosChange(contatos.map((c) => ({ ...c, selected: false })));
  };

  const adicionarManual = () => {
    const numLimpo = novoNumero.replace(/\D/g, '');
    if (!novoNome.trim()) {
      toast.error('Digite o nome do contato.');
      return;
    }
    if (numLimpo.length < 10) {
      toast.error('Digite um número de telefone com DDD válido.');
      return;
    }

    const novo: ContatoWhatsApp = {
      id: numLimpo,
      phone: numLimpo,
      name: novoNome.trim(),
      timestamp: Date.now(),
      isRecent: true,
      selected: true,
    };

    onContatosChange([novo, ...contatos]);
    setNovoNome('');
    setNovoNumero('');
    setMostrarModalManual(false);
    toast.success(`${novo.name} adicionado à lista!`);
  };

  const filtrados = contatos.filter((c) => {
    if (!busca.trim()) return true;
    const t = busca.toLowerCase();
    return c.name.toLowerCase().includes(t) || c.phone.includes(t);
  });

  const selecionadosCount = contatos.filter((c) => c.selected).length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in space-y-8">
      {/* Título & Estatísticas */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
            <Users className="size-4" /> Passo 3 de 4 • Seleção Inteligente de Contatos
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Curadoria dos contatos recomendados
          </h1>
          <p className="text-slate-400 text-sm">
            Filtro ativo: apenas pessoas com quem você conversou nos <strong>últimos 12 meses</strong> (máximo de 100 contatos).
          </p>
        </div>

        <button
          type="button"
          onClick={() => setMostrarModalManual(true)}
          className="h-11 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 border border-slate-700 transition-colors shrink-0 cursor-pointer"
        >
          <Plus className="size-4 text-emerald-400" />
          Adicionar Novo Contato
        </button>
      </div>

      {/* Barra de Busca e Ações em Massa */}
      <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-3xl space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Filtrar por nome ou número..."
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <button
              type="button"
              onClick={selecionarTodos}
              className="text-xs font-bold text-slate-400 hover:text-emerald-400 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <CheckSquare className="size-3.5" /> Selecionar Todos
            </button>
            <button
              type="button"
              onClick={desmarcarTodos}
              className="text-xs font-bold text-slate-400 hover:text-rose-400 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Square className="size-3.5" /> Desmarcar Todos
            </button>
          </div>
        </div>

        {/* Contador de Contatos Selecionados */}
        <div className="flex items-center justify-between text-xs font-semibold px-1 pt-1 text-slate-400 border-t border-slate-800/80">
          <span>
            Total na lista: <strong className="text-white">{contatos.length}</strong> contatos
          </span>
          <span className="text-emerald-400 font-bold">
            {selecionadosCount} contatos prontos para envio (máx. 100)
          </span>
        </div>
      </div>

      {/* Lista de Contatos */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden">
        {carregando ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="size-8 animate-spin text-emerald-400" />
            <p className="text-sm font-semibold">Consumindo chats da sua agenda com filtro de 12 meses...</p>
            <p className="text-xs text-slate-500">Descartando grupos e transmissões automáticas.</p>
          </div>
        ) : filtrados.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <p className="text-base font-bold">Nenhum contato encontrado.</p>
            <p className="text-xs text-slate-500 mt-1">
              {busca ? 'Ajuste o termo de busca ou' : 'Você pode'} adicionar números manualmente pelo botão acima.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60 max-h-[500px] overflow-y-auto">
            {filtrados.map((contato) => (
              <div
                key={contato.id}
                className={`p-3.5 sm:p-4 flex items-center justify-between gap-3 transition-colors ${
                  contato.selected ? 'bg-emerald-500/5' : 'bg-transparent opacity-60'
                }`}
              >
                <div
                  onClick={() => toggleSelecionar(contato.id)}
                  className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer select-none"
                >
                  <div
                    className={`size-5 rounded-md flex items-center justify-center border transition-all shrink-0 ${
                      contato.selected
                        ? 'bg-emerald-500 border-emerald-500 text-slate-950 font-black'
                        : 'border-slate-700 bg-slate-950 text-transparent'
                    }`}
                  >
                    ✓
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white truncate">{contato.name}</p>
                      {contato.isRecent && (
                        <span className="hidden sm:inline-flex text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
                          Interagiu recente
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-mono text-slate-400">
                      +{contato.phone.replace(/(\d{2})(\d{2})(\d{5})(\d{4})/, '$1 ($2) $3-$4')}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removerContato(contato.id)}
                  className="p-2 text-slate-400 hover:text-rose-400 rounded-xl hover:bg-slate-800 transition-colors shrink-0"
                  title="Remover contato da lista"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Barra Inferior */}
      <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <button
          type="button"
          onClick={onVoltar}
          className="h-12 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-sm flex items-center gap-2 transition-all border border-slate-800 cursor-pointer"
        >
          <ArrowLeft className="size-4" /> Voltar
        </button>

        <button
          type="button"
          onClick={onAvancar}
          disabled={selecionadosCount === 0}
          className="w-full sm:w-auto h-12 px-8 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 cursor-pointer"
        >
          <span>Avançar para Revisão e Disparo ({selecionadosCount} contatos)</span>
          <ArrowRight className="size-4" />
        </button>
      </div>

      {/* Modal Adicionar Manual */}
      {mostrarModalManual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative max-w-md w-full bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Adicionar Contato Manualmente</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nome</label>
                <input
                  type="text"
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  placeholder="Ex.: Carlos Ferreira"
                  className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">WhatsApp (com DDD)</label>
                <input
                  type="text"
                  value={novoNumero}
                  onChange={(e) => setNovoNumero(e.target.value)}
                  placeholder="Ex.: 85999998888"
                  className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMostrarModalManual(false)}
                className="flex-1 h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold border border-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={adicionarManual}
                className="flex-1 h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
