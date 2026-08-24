import React from 'react';
import type { Mensagem } from '../types';

interface Props {
  mensagem: Mensagem;
}

export const MessageBubble: React.FC<Props> = ({ mensagem }) => {
  const isBot = mensagem.remetente === 'bot';

  return (
    <div className={`flex items-end gap-2 animate-message mb-3.5 ${isBot ? 'justify-start' : 'justify-end'}`}>
      {isBot && (
        <div className="size-7 rounded-full bg-white border border-white/40 p-0.5 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
          <img src="/logo_icon.png" alt="Democracias" className="size-full object-contain" />
        </div>
      )}

      <div
        className={`max-w-[85%] sm:max-w-[78%] rounded-2xl px-4 py-3 shadow-md ${
          isBot
            ? 'rounded-bl-xs bg-slate-800 border border-slate-700/80 text-slate-100'
            : 'rounded-br-xs bg-gradient-to-r from-orange-600 to-amber-600 text-white font-medium'
        }`}
      >
        <p className="text-sm sm:text-[15px] leading-relaxed whitespace-pre-wrap">
          {mensagem.conteudo}
        </p>

        <span
          className={`block text-[10px] mt-1 text-right font-mono ${
            isBot ? 'text-slate-400' : 'text-orange-200'
          }`}
        >
          {mensagem.timestamp}
        </span>
      </div>
    </div>
  );
};
