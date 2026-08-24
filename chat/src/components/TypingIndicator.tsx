import React from 'react';

export const TypingIndicator: React.FC = () => {
  return (
    <div className="flex items-end gap-2 animate-message mb-3">
      <div className="size-7 rounded-full bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-[10px] font-black text-white shrink-0 shadow-sm">
        DEM
      </div>
      <div className="rounded-2xl rounded-bl-sm bg-slate-800 border border-slate-700/80 px-4 py-3 shadow-md">
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-orange-400 animate-bounce [animation-delay:-0.3s]" />
          <span className="size-2 rounded-full bg-orange-400 animate-bounce [animation-delay:-0.15s]" />
          <span className="size-2 rounded-full bg-orange-400 animate-bounce" />
        </div>
      </div>
    </div>
  );
};
