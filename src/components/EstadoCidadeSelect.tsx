import React, { useMemo } from "react";
import { useLocalidades } from "@/hooks/useLocalidades";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface EstadoCidadeSelectProps {
  uf: string;
  cidade: string;
  onUfChange: (uf: string) => void;
  onCidadeChange: (cidade: string) => void;
  ufDisabled?: boolean;
  cidadeDisabled?: boolean;
  showLabels?: boolean;
  className?: string;
}

export function EstadoCidadeSelect({
  uf,
  cidade,
  onUfChange,
  onCidadeChange,
  ufDisabled = false,
  cidadeDisabled = false,
  showLabels = true,
  className = "",
}: EstadoCidadeSelectProps) {
  const { estados, cidades, loadingEstados, loadingCidades } = useLocalidades(uf);

  const cidadesOptions = useMemo(() => {
    return cidades.map((c) => c.nome);
  }, [cidades]);

  return (
    <div className={`grid grid-cols-1 gap-3 sm:grid-cols-3 ${className}`}>
      {/* Select UF / Estado */}
      <div className="space-y-1.5 sm:col-span-1">
        {showLabels && (
          <Label className="text-[11px] font-semibold uppercase text-muted-foreground">
            Estado (UF)
          </Label>
        )}
        <Select
          value={uf || ""}
          onValueChange={(val) => {
            onUfChange(val);
            onCidadeChange(""); // Reseta a cidade ao trocar o estado
          }}
          disabled={ufDisabled || loadingEstados}
        >
          <SelectTrigger className="w-full bg-surface">
            {loadingEstados ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" /> Carregando...
              </div>
            ) : (
              <SelectValue placeholder="Selecione UF" />
            )}
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {estados.map((est) => (
              <SelectItem key={est.sigla} value={est.sigla}>
                {est.sigla} - {est.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Select Cidade / Município Encadeado */}
      <div className="space-y-1.5 sm:col-span-2">
        {showLabels && (
          <Label className="text-[11px] font-semibold uppercase text-muted-foreground">
            Município / Cidade
          </Label>
        )}
        <Select
          value={cidade || ""}
          onValueChange={onCidadeChange}
          disabled={cidadeDisabled || !uf || loadingCidades}
        >
          <SelectTrigger className="w-full bg-surface">
            {loadingCidades ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" /> Buscando municípios...
              </div>
            ) : (
              <SelectValue
                placeholder={
                  !uf ? "Selecione o estado primeiro" : "Selecione o município"
                }
              />
            )}
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {cidadesOptions.length > 0 ? (
              cidadesOptions.map((cid) => (
                <SelectItem key={cid} value={cid}>
                  {cid}
                </SelectItem>
              ))
            ) : (
              <div className="p-2 text-center text-xs text-muted-foreground">
                {loadingCidades ? "Carregando municípios..." : "Nenhum município disponível"}
              </div>
            )}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
