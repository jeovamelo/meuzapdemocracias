import React from 'react';
import { CheckCircle2, ShieldCheck, Heart, RotateCcw } from 'lucide-react';

interface Props {
  voterName: string;
  totalEnviados: number;
  onReiniciar: () => void;
}

export const SucessoDialog: React.FC<Props> = ({ voterName, totalEnviados, onReiniciar }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative max-w-lg w-full bg-slate-950 border border-emerald-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6">
        <div className="size-20 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
          <CheckCircle2 className="size-10" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Campanha Disparada com Sucesso!
          </h2>
          <p className="text-slate-300 text-sm">
            Parabéns, <strong>{voterName}</strong>! Sua colinha oficial foi enviada com sucesso para <strong>{totalEnviados} contatos</strong> de forma segura e humanizada.
          </p>
        </div>

        {/* Badge de destruição da instância temporária */}
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-left space-y-1">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
            <ShieldCheck className="size-4" /> Sessão Temporária Encerrada e Removida
          </div>
          <p className="text-[12px] text-slate-400">
            A instância do seu WhatsApp foi imediatamente deslogada e expurgada do servidor. Nenhum dado privado ou histórico permaneceu gravado.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onReiniciar}
            className="flex-1 h-12 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            <RotateCcw className="size-4" />
            Concluir e Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
