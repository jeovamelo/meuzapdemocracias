import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  uid,
  type Comite,
  type Database,
  type Kit,
  type Material,
  type Pessoa,
  type Saida,
  type SolicitacaoMaterial,
  type CidadeMeta,
  type BoletimUrna,
  type ConfigCampanha,
} from "./db";
import { toast } from "sonner";

type Ctx = {
  db: Database;
  ready: boolean;
  addComite: (c: Omit<Comite, "id" | "ativo" | "status"> & { status?: Comite["status"] }) => Promise<void>;
  updateComite: (id: string, c: Partial<Comite>) => Promise<void>;
  removeComite: (id: string) => Promise<void>;
  addPessoa: (p: Omit<Pessoa, "id" | "status"> & { status?: Pessoa["status"] }) => Promise<void>;
  updatePessoa: (id: string, p: Partial<Pessoa>) => Promise<void>;
  removePessoa: (id: string) => Promise<void>;
  addMaterial: (m: Omit<Material, "id" | "unidade" | "arquivado">) => Promise<void>;
  updateMaterial: (id: string, m: Partial<Material>) => Promise<void>;
  ajustarEstoque: (id: string, delta: number) => Promise<void>;
  archiveMaterial: (id: string) => Promise<void>;
  addKit: (k: Omit<Kit, "id" | "arquivado">) => Promise<void>;
  updateKit: (id: string, k: Partial<Kit>) => Promise<void>;
  archiveKit: (id: string) => Promise<void>;
  registrarSaida: (s: Omit<Saida, "id" | "criado_em">) => Promise<void>;
  addSolicitacao: (s: Omit<SolicitacaoMaterial, "id" | "criado_em" | "status">) => Promise<void>;
  updateSolicitacao: (id: string, s: Partial<SolicitacaoMaterial>) => Promise<void>;
  updateCidadeMeta: (id: string, cm: Partial<CidadeMeta>) => Promise<void>;
  updateConfig: (config: Partial<ConfigCampanha>) => Promise<void>;
  addBoletim: (b: Omit<BoletimUrna, "id" | "data_leitura">) => Promise<void>;
  processarInventario: (ajustes: { material_id: string; quantidade_real: number }[]) => Promise<void>;
  resetarDados: () => Promise<void>;
};

const StoreContext = createContext<Ctx | null>(null);

const DEFAULT_CONFIG: ConfigCampanha = {
  id: "default",
  candidato_nome: "",
  candidato_urna: "",
  numero: "",
  cargo: "",
  partido_coligacao: "",
  uf: "CE",
  meta_eleicao: 0,
  meta_expectativa: 0,
  configurada: false
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<Database>({
    comites: [],
    pessoas: [],
    materiais: [],
    kits: [],
    saidas: [],
    solicitacoes: [],
    cidade_metas: [],
    config: DEFAULT_CONFIG,
    boletins: [],
  });
  const [ready, setReady] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [
        { data: comites },
        { data: pessoas },
        { data: materiais },
        { data: kits },
        { data: saidas },
        { data: solicitacoes },
        { data: cidade_metas },
        { data: config },
        { data: boletins },
      ] = await Promise.all([
        supabase.from("comites").select("*").order("criado_em", { ascending: false }),
        supabase.from("pessoas").select("*").order("criado_em", { ascending: false }),
        supabase.from("materiais").select("*").order("criado_em", { ascending: false }),
        supabase.from("kits").select("*").order("criado_em", { ascending: false }),
        supabase.from("saidas").select("*").order("criado_em", { ascending: false }),
        supabase.from("solicitacoes").select("*").order("criado_em", { ascending: false }),
        supabase.from("cidade_metas").select("*").order("criado_em", { ascending: false }),
        supabase.from("config_campanha").select("*").single(),
        supabase.from("boletins_urna").select("*").order("data_leitura", { ascending: false }),
      ]);

      setDb({
        comites: (comites || []) as any,
        pessoas: (pessoas || []) as any,
        materiais: (materiais || []) as any,
        kits: (kits || []) as any,
        saidas: (saidas || []) as any,
        solicitacoes: (solicitacoes || []) as any,
        cidade_metas: (cidade_metas || []) as any,
        config: (config || DEFAULT_CONFIG) as any,
        boletins: (boletins || []) as any,
      });
      setReady(true);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  }, []);

  useEffect(() => {
    fetchAll();

    // Inscrições para Realtime
    const channels = [
      supabase.channel('public:comites').on('postgres_changes', { event: '*', schema: 'public', table: 'comites' }, fetchAll),
      supabase.channel('public:pessoas').on('postgres_changes', { event: '*', schema: 'public', table: 'pessoas' }, fetchAll),
      supabase.channel('public:materiais').on('postgres_changes', { event: '*', schema: 'public', table: 'materiais' }, fetchAll),
      supabase.channel('public:saidas').on('postgres_changes', { event: '*', schema: 'public', table: 'saidas' }, fetchAll),
      supabase.channel('public:solicitacoes').on('postgres_changes', { event: '*', schema: 'public', table: 'solicitacoes' }, fetchAll),
      supabase.channel('public:boletins_urna').on('postgres_changes', { event: '*', schema: 'public', table: 'boletins_urna' }, fetchAll),
    ].map(c => c.subscribe());

    return () => {
      channels.forEach(c => supabase.removeChannel(c));
    };
  }, [fetchAll]);

  const value: Ctx = {
    db,
    ready,
    addComite: async (c) => {
      const { error } = await supabase.from("comites").insert([{ 
        ...c, 
        ativo: c.status === "ativo", 
        status: c.status || "ativo" 
      }]);
      if (error) toast.error("Erro ao adicionar comitê");
    },
    updateComite: async (id, c) => {
      const updateData = { ...c };
      if (c.status) (updateData as any).ativo = c.status === "ativo";
      const { error } = await supabase.from("comites").update(updateData).eq("id", id);
      if (error) toast.error("Erro ao atualizar comitê");
    },
    removeComite: async (id) => {
      const { error } = await supabase.from("comites").delete().eq("id", id);
      if (error) toast.error("Erro ao remover comitê");
    },
    addPessoa: async (pessoa) => {
      const { error } = await supabase.from("pessoas").insert([{ 
        ...pessoa, 
        status: pessoa.status || "ativo" 
      }]);
      if (error) toast.error("Erro ao adicionar pessoa");
    },
    updatePessoa: async (id, pessoa) => {
      const { error } = await supabase.from("pessoas").update(pessoa).eq("id", id);
      if (error) toast.error("Erro ao atualizar pessoa");
    },
    removePessoa: async (id) => {
      const { error } = await supabase.from("pessoas").delete().eq("id", id);
      if (error) toast.error("Erro ao remover pessoa");
    },
    addMaterial: async (m) => {
      const { error } = await supabase.from("materiais").insert([{ 
        ...m, 
        unidade: "un", 
        arquivado: false 
      }]);
      if (error) toast.error("Erro ao adicionar material");
    },
    updateMaterial: async (id, m) => {
      const { error } = await supabase.from("materiais").update(m).eq("id", id);
      if (error) toast.error("Erro ao atualizar material");
    },
    ajustarEstoque: async (id, delta) => {
      const material = db.materiais.find(m => m.id === id);
      if (material) {
        const { error } = await supabase.from("materiais")
          .update({ estoque: Math.max(0, material.estoque + delta) })
          .eq("id", id);
        if (error) toast.error("Erro ao ajustar estoque");
      }
    },
    archiveMaterial: async (id) => {
      const { error } = await supabase.from("materiais").update({ arquivado: true }).eq("id", id);
      if (error) toast.error("Erro ao arquivar material");
    },
    addKit: async (k) => {
      const { error } = await supabase.from("kits").insert([{ ...k, arquivado: false }]);
      if (error) toast.error("Erro ao adicionar kit");
    },
    updateKit: async (id, k) => {
      const { error } = await supabase.from("kits").update(k).eq("id", id);
      if (error) toast.error("Erro ao atualizar kit");
    },
    archiveKit: async (id) => {
      const { error } = await supabase.from("kits").update({ arquivado: true }).eq("id", id);
      if (error) toast.error("Erro ao arquivar kit");
    },
    registrarSaida: async (s) => {
      const { error: errorSaida } = await supabase.from("saidas").insert([s]);
      if (errorSaida) {
        toast.error("Erro ao registrar saída");
        return;
      }
      
      // Atualizar estoque dos materiais
      for (const item of s.itens) {
        const mat = db.materiais.find(m => m.id === item.material_id);
        if (mat) {
          await supabase.from("materiais")
            .update({ estoque: Math.max(0, mat.estoque - item.quantidade) })
            .eq("id", mat.id);
        }
      }
    },
    addSolicitacao: async (s) => {
      const { error } = await supabase.from("solicitacoes").insert([{ ...s, status: "pendente" }]);
      if (error) toast.error("Erro ao adicionar solicitação");
    },
    updateSolicitacao: async (id, s) => {
      const { error } = await supabase.from("solicitacoes").update(s).eq("id", id);
      if (error) toast.error("Erro ao atualizar solicitação");
    },
    updateCidadeMeta: async (id, cm) => {
      const { error } = await supabase.from("cidade_metas").update(cm).eq("id", id);
      if (error) toast.error("Erro ao atualizar meta");
    },
    updateConfig: async (config) => {
      const { error } = await supabase.from("config_campanha").upsert([{ ...db.config, ...config }]);
      if (error) toast.error("Erro ao atualizar configuração");
    },
    addBoletim: async (b) => {
      const { error } = await supabase.from("boletins_urna").insert([b]);
      if (error) toast.error("Erro ao registrar boletim");
    },
    resetarDados: async () => {
      // Opcional: Implementar se necessário resetar banco remoto
      toast.info("Função de reset não disponível para banco real.");
    },
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore precisa estar dentro de <StoreProvider>");
  return ctx;
}
