import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Estado {
  id?: string | number;
  sigla: string;
  nome: string;
}

export interface Cidade {
  id?: string | number;
  nome: string;
  uf: string;
  estado_id?: string | number;
  codigo_ibge?: number | string;
}

export const ESTADOS_BRASIL_PADRAO: Estado[] = [
  { sigla: "AC", nome: "Acre" },
  { sigla: "AL", nome: "Alagoas" },
  { sigla: "AP", nome: "Amapá" },
  { sigla: "AM", nome: "Amazonas" },
  { sigla: "BA", nome: "Bahia" },
  { sigla: "CE", nome: "Ceará" },
  { sigla: "DF", nome: "Distrito Federal" },
  { sigla: "ES", nome: "Espírito Santo" },
  { sigla: "GO", nome: "Goiás" },
  { sigla: "MA", nome: "Maranhão" },
  { sigla: "MT", nome: "Mato Grosso" },
  { sigla: "MS", nome: "Mato Grosso do Sul" },
  { sigla: "MG", nome: "Minas Gerais" },
  { sigla: "PA", nome: "Pará" },
  { sigla: "PB", nome: "Paraíba" },
  { sigla: "PR", nome: "Paraná" },
  { sigla: "PE", nome: "Pernambuco" },
  { sigla: "PI", nome: "Piauí" },
  { sigla: "RJ", nome: "Rio de Janeiro" },
  { sigla: "RN", nome: "Rio Grande do Norte" },
  { sigla: "RS", nome: "Rio Grande do Sul" },
  { sigla: "RO", nome: "Rondônia" },
  { sigla: "RR", nome: "Roraima" },
  { sigla: "SC", nome: "Santa Catarina" },
  { sigla: "SP", nome: "São Paulo" },
  { sigla: "SE", nome: "Sergipe" },
  { sigla: "TO", nome: "Tocantins" },
];

const cacheCidadesPorUf: Record<string, Cidade[]> = {};

export function useLocalidades(ufSelecionada?: string) {
  const [estados, setEstados] = useState<Estado[]>(ESTADOS_BRASIL_PADRAO);
  const [cidades, setCidades] = useState<Cidade[]>([]);
  const [loadingEstados, setLoadingEstados] = useState(false);
  const [loadingCidades, setLoadingCidades] = useState(false);

  // Carregar Estados do Supabase
  useEffect(() => {
    let isMounted = true;
    async function carregarEstados() {
      setLoadingEstados(true);
      try {
        const { data, error } = await supabase
          .from("estados" as any)
          .select("id, sigla, nome")
          .order("nome");

        if (!error && data && data.length > 0 && isMounted) {
          setEstados(data as unknown as Estado[]);
        }
      } catch (err) {
        console.warn("Usando estados padrão:", err);
      } finally {
        if (isMounted) setLoadingEstados(false);
      }
    }

    carregarEstados();
    return () => {
      isMounted = false;
    };
  }, []);

  // Carregar Cidades filtradas pela UF do Supabase (com cache e fallback IBGE)
  const buscarCidades = useCallback(async (uf: string) => {
    if (!uf) {
      setCidades([]);
      return;
    }

    const ufNormalizada = uf.toUpperCase().trim();

    if (cacheCidadesPorUf[ufNormalizada]?.length) {
      setCidades(cacheCidadesPorUf[ufNormalizada]);
      return;
    }

    setLoadingCidades(true);
    try {
      // 1. Tentar buscar da tabela cidades do Supabase
      const { data, error } = await supabase
        .from("cidades" as any)
        .select("id, nome, uf")
        .ilike("uf", ufNormalizada)
        .order("nome");

      if (!error && data && data.length > 0) {
        const lista = data as unknown as Cidade[];
        cacheCidadesPorUf[ufNormalizada] = lista;
        setCidades(lista);
        return;
      }

      // 2. Fallback resiliente via IBGE caso a tabela ainda esteja sendo sincronizada
      const res = await fetch(
        `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${ufNormalizada}/municipios`
      );
      if (res.ok) {
        const ibgeData = await res.json();
        const listaIBGE: Cidade[] = ibgeData.map((m: any) => ({
          id: m.id,
          nome: m.nome,
          uf: ufNormalizada,
          codigo_ibge: m.id,
        }));
        listaIBGE.sort((a, b) => a.nome.localeCompare(b.nome));
        cacheCidadesPorUf[ufNormalizada] = listaIBGE;
        setCidades(listaIBGE);
      }
    } catch (err) {
      console.warn("Erro ao buscar cidades para UF:", ufNormalizada, err);
    } finally {
      setLoadingCidades(false);
    }
  }, []);

  useEffect(() => {
    if (ufSelecionada) {
      buscarCidades(ufSelecionada);
    } else {
      setCidades([]);
    }
  }, [ufSelecionada, buscarCidades]);

  return {
    estados,
    cidades,
    loadingEstados,
    loadingCidades,
    buscarCidades,
  };
}
