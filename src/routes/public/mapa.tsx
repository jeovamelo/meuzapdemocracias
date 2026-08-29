import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import {
  ShieldCheck,
  Lock,
  MapPin,
  Package,
  TrendingUp,
  Users,
  Eye,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatNumero } from "@/lib/db";
import {
  MapaCalorDistribuicao,
  type DadosMunicipioDistribuicao,
} from "@/components/MapaCalorDistribuicao";

export const Route = createFileRoute("/public/mapa")({
  head: () => ({
    meta: [
      { title: "Visualização Territorial — Mapa de Distribuição Pública" },
      {
        name: "description",
        content:
          "Visualização pública protegida do mapa de calor e distribuição de materiais por município.",
      },
    ],
  }),
  component: PublicMapaCalor,
});

function decodePayload(encoded: string | undefined): {
  uf: string;
  pin: string;
  titulo?: string;
  cidades: Record<string, DadosMunicipioDistribuicao>;
} | null {
  if (!encoded) return null;
  try {
    const jsonStr = decodeURIComponent(atob(encoded));
    return JSON.parse(jsonStr);
  } catch (e) {
    try {
      const jsonStr = atob(encoded);
      return JSON.parse(jsonStr);
    } catch {
      return null;
    }
  }
}

function PublicMapaCalor() {
  const search = useSearch({ strict: false }) as {
    token?: string;
    p?: string;
  };

  const payloadData = useMemo(() => {
    return decodePayload(search.p);
  }, [search.p]);

  const [pinInput, setPinInput] = useState<string>("");
  const [autenticado, setAutenticado] = useState<boolean>(false);
  const [erroPin, setErroPin] = useState<string | null>(null);

  // Se o token foi gerado e salvo no localStorage na mesma máquina
  const tokenSalvo = useMemo(() => {
    if (!search.token) return null;
    try {
      const raw = localStorage.getItem(`mapa_share_${search.token}`);
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  }, [search.token]);

  const dadosEfetivos = payloadData || tokenSalvo;
  const pinCorreto = String(dadosEfetivos?.pin || "1234");
  const uf = dadosEfetivos?.uf || "CE";
  const titulo = dadosEfetivos?.titulo || `Distribuição Territorial de Materiais • ${uf}`;
  const dadosCidades = dadosEfetivos?.cidades || {};

  const handleValidarPin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErroPin(null);

    const limpo = pinInput.trim();
    if (!limpo) {
      setErroPin("Por favor, digite a senha de acesso.");
      return;
    }

    if (limpo === pinCorreto || !dadosEfetivos?.pin) {
      setAutenticado(true);
    } else {
      setErroPin("Senha incorreta. Verifique o código recebido.");
    }
  };

  if (!dadosEfetivos && !search.p && !search.token) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 text-center space-y-4 shadow-2xl backdrop-blur-md">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-critical/10 text-critical mx-auto">
            <AlertCircle className="size-7" />
          </div>
          <h1 className="text-xl font-extrabold text-white">Link de Mapa Inválido ou Expirado</h1>
          <p className="text-xs text-slate-400">
            O endereço do mapa compartilhado não contém os parâmetros de acesso necessários.
            Solicite um novo link ao gestor responsável.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* CABEÇALHO PÚBLICO E ANÔNIMO */}
      <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-xl bg-orange-500 font-black text-white text-sm shadow-md">
            D
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-white tracking-wide flex items-center gap-2">
              Democracias.org
              <Badge variant="outline" className="text-[10px] font-mono border-orange-500/30 text-orange-400 bg-orange-500/10">
                Logística Territorial
              </Badge>
            </h1>
            <p className="text-[10px] text-slate-400">Visualização de Distribuição e Cobertura</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge className="bg-slate-800 text-slate-300 border-slate-700 text-xs font-mono">
            {uf} • ESTADO
          </Badge>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL: BLOQUEIO POR SENHA OU MAPA */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-center">
        {!autenticado ? (
          /* TELA DE AUTENTICAÇÃO POR SENHA (PIN) */
          <div className="max-w-md w-full mx-auto rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 text-center space-y-6 shadow-2xl backdrop-blur-md animate-fade-in my-8">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500 mx-auto border border-orange-500/20 shadow-inner">
              <KeyRound className="size-8" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-black text-white">Mapa Protegido por Senha</h2>
              <p className="text-xs text-slate-400">
                Digite a senha de segurança de 4 dígitos para liberar a visualização do mapa de calor e dos dados de distribuição territorial.
              </p>
            </div>

            <form onSubmit={handleValidarPin} className="space-y-4">
              <div className="space-y-1 text-left">
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={8}
                  placeholder="Digite a senha de acesso..."
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    if (erroPin) setErroPin(null);
                  }}
                  className="h-12 text-center text-lg font-mono font-bold tracking-widest bg-slate-950/80 border-slate-800 text-white rounded-xl focus-visible:ring-orange-500"
                  autoFocus
                />
                {erroPin && (
                  <p className="text-[11px] font-bold text-red-400 mt-1 flex items-center gap-1 justify-center">
                    <AlertCircle className="size-3.5" /> {erroPin}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-11 rounded-xl bg-orange-500 hover:bg-orange-600 font-bold text-white shadow-lg cursor-pointer transition-transform active:scale-[0.98]"
              >
                <ShieldCheck className="size-4 mr-2" />
                Desbloquear Visualização
              </Button>
            </form>

            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-center gap-1 text-[11px] text-slate-500">
              <Lock className="size-3 text-slate-500" />
              Ambiente de visualização pública e anônima
            </div>
          </div>
        ) : (
          /* MAPA DE CALOR DESBLOQUEADO COM DADOS PÚBLICOS ANÔNIMOS */
          <div className="w-full space-y-6 animate-slide-up">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-4 sm:p-6 backdrop-blur-md shadow-xl">
              <MapaCalorDistribuicao
                uf={uf}
                cargo="Estadual"
                dados={dadosCidades}
                titulo={titulo}
              />
            </div>
          </div>
        )}
      </main>

      {/* RODAPÉ */}
      <footer className="border-t border-slate-900 bg-slate-950/90 py-4 px-6 text-center text-xs text-slate-500">
        <p>Democracias.org • Plataforma de Gestão e Logística Eleitoral</p>
      </footer>
    </div>
  );
}
