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
  type MovimentacaoEstoque,
  type CampanhaRegistro,
  type SolicitacaoAdesaoCampanha,
} from "./db";
import { toast } from "sonner";

type Ctx = {
  db: Database;
  ready: boolean;
  addComite: (c: Omit<Comite, "id" | "ativo" | "status"> & { status?: Comite["status"] }) => Promise<void>;
  updateComite: (id: string, c: Partial<Comite>) => Promise<void>;
  removeComite: (id: string) => Promise<void>;
  addPessoa: (p: Omit<Pessoa, "id" | "status"> & { status?: Pessoa["status"] }) => Promise<Pessoa | null>;
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
  addCampanhaRegistro: (camp: Omit<CampanhaRegistro, "id" | "criado_em">) => Promise<CampanhaRegistro | null>;
  addSolicitacaoAdesao: (sol: Omit<SolicitacaoAdesaoCampanha, "id" | "criado_em" | "status">) => Promise<void>;
  verificarCampanhaExiste: (uf: string, numero: string, cargo?: string) => Promise<CampanhaRegistro | null>;
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
    historico_estoque: [],
    campanhas_registradas: [],
    solicitacoes_adesao: [],
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
        { data: historico },
        { data: campanhasDb },
        { data: adesaoDb },
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
        supabase.from("historico_estoque").select("*").order("criado_em", { ascending: false }),
        supabase.from("campaigns").select("*").order("created_at", { ascending: false }),
        (supabase as any).from("solicitacoes_adesao").select("*").order("criado_em", { ascending: false }),
      ]);

      const mappedCampanhas: CampanhaRegistro[] = (campanhasDb || []).map((c: any) => ({
        id: c.id,
        uf: c.uf,
        numero: c.nr_candidato,
        cargo: c.cargo || "",
        candidato_nome: c.nome_candidato || "",
        candidato_urna: c.nome_urna || "",
        partido_coligacao: c.partido || "",
        foto_candidato_url: "",
        admin_nome: "",
        admin_cpf: "",
        admin_telefone: "",
        admin_foto_validacao_url: "",
        status_validacao: "aprovado",
        criado_em: c.created_at,
      }));

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
        historico_estoque: (historico || []) as any,
        campanhas_registradas: mappedCampanhas,
        solicitacoes_adesao: (adesaoDb || []) as any,
      });
      setReady(true);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  }, []);

  useEffect(() => {
    void fetchAll();

    // One multiplexed channel replaces several independently managed
    // subscriptions. Changes arriving together trigger a single reload.
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => void fetchAll(), 250);
    };

    const realtimeTables = [
      'comites',
      'pessoas',
      'materiais',
      'saidas',
      'solicitacoes',
      'boletins_urna',
      'historico_estoque',
    ] as const;

    const channel = realtimeTables
      .reduce(
        (currentChannel, table) => currentChannel.on(
          'postgres_changes',
          { event: '*', schema: 'public', table },
          scheduleRefresh,
        ),
        supabase.channel('democracias-store'),
      )
      .subscribe();

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      void supabase.removeChannel(channel);
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
      const novaPessoa: Pessoa = {
        ...pessoa,
        id: uid(),
        status: pessoa.status || "ativo",
        criado_em: new Date().toISOString()
      };
      try {
        const { data, error } = await supabase.from("pessoas").insert([novaPessoa]).select().single();
        if (error) throw error;

        // Se for Responsável e tiver campanha vinculada, refletir em campaign_members
        const campId = novaPessoa.campanha_id || (novaPessoa as any).campaign_id;
        if (novaPessoa.tipo === 'responsavel' && campId) {
          try {
            await supabase.from("campaign_members").insert([{
              campaign_id: campId,
              user_id: data?.id || novaPessoa.id,
              role: novaPessoa.papel_campanha || 'responsavel',
              status: novaPessoa.status || 'ativo'
            } as any]);
          } catch (mErr) {
            console.warn("Vínculo em campaign_members:", mErr);
          }
        }

        return (data || novaPessoa) as Pessoa;
      } catch (err) {
        console.warn("Erro ao salvar pessoa no Supabase, salvando localmente:", err);
        // Fallback local
        const locais: Pessoa[] = JSON.parse(localStorage.getItem("democracias-pessoas-locais") || "[]");
        locais.push(novaPessoa);
        localStorage.setItem("democracias-pessoas-locais", JSON.stringify(locais));
        setDb(prev => ({ ...prev, pessoas: [novaPessoa, ...prev.pessoas] }));
        return novaPessoa;
      }
    },
    verificarCampanhaExiste: async (uf: string, numero: string, cargo?: string) => {
      try {
        const cleanUf = uf.toUpperCase().trim();
        const cleanNr = numero.trim();

        // 1. Consultar tabela oficial `campaigns` do Supabase
        let query = supabase
          .from("campaigns")
          .select("*")
          .eq("uf", cleanUf)
          .eq("nr_candidato", cleanNr);
        
        if (cargo) {
          // Comparação exata, mas sem diferenciação entre maiúsculas/minúsculas.
          query = query.ilike("cargo", cargo.trim());
        }

        const { data, error } = await query.limit(1).maybeSingle();
        if (error) {
          throw error;
        }

        if (data) {
          return {
            id: data.id,
            uf: data.uf,
            numero: data.nr_candidato,
            cargo: data.cargo || "",
            candidato_nome: data.nome_candidato || "",
            candidato_urna: data.nome_urna || "",
            partido_coligacao: data.partido || "",
            foto_candidato_url: "",
            admin_nome: "",
            admin_cpf: "",
            admin_telefone: "",
            admin_foto_validacao_url: "",
            status_validacao: "aprovado",
            criado_em: data.created_at,
          } as CampanhaRegistro;
        }

        // Tabela campaigns está limpa / não há campanha existente
        return null;
      } catch (e) {
        console.warn("Erro ao consultar campaigns no Supabase:", e);
        throw e;
      }
    },
    addCampanhaRegistro: async (camp) => {
      try {
        const session = (await supabase.auth.getSession()).data.session;
        const adminUserId = session?.user?.id || `anon_${uid()}`;

        const novaCampanhaSupabase = {
          ano_eleicao: 2026,
          uf: camp.uf.toUpperCase().trim(),
          nr_candidato: camp.numero.trim(),
          cargo: camp.cargo || null,
          nome_candidato: camp.candidato_nome || camp.candidato_urna || "Candidato",
          nome_urna: camp.candidato_urna || camp.candidato_nome || "Candidato",
          nome_campanha: `${camp.candidato_urna || camp.candidato_nome || "Campanha"} ${camp.numero}`,
          partido: camp.partido_coligacao || null,
          admin_user_id: adminUserId,
        };

        const { data, error } = await supabase
          .from("campaigns")
          .insert([novaCampanhaSupabase as any])
          .select()
          .single();

        if (!error && data) {
          try {
            await supabase.from("campaign_members").insert([{
              campaign_id: data.id,
              user_id: adminUserId,
              role: 'admin',
              status: 'ativo'
            } as any]);
          } catch (mErr) {
            console.warn("Registro em campaign_members:", mErr);
          }

          const registroRetorno: CampanhaRegistro = {
            ...camp,
            id: data.id,
            criado_em: data.created_at,
          };
          setDb(prev => ({ ...prev, campanhas_registradas: [registroRetorno, ...prev.campanhas_registradas] }));
          return registroRetorno;
        } else if (error) {
          console.warn("Erro inserindo na tabela campaigns do Supabase:", error);
        }
      } catch (err) {
        console.warn("Erro ao salvar campanha no Supabase:", err);
      }

      // Fallback
      const localId = `camp_${uid()}`;
      const registroLocal: CampanhaRegistro = {
        ...camp,
        id: localId,
        criado_em: new Date().toISOString()
      };
      setDb(prev => ({ ...prev, campanhas_registradas: [registroLocal, ...prev.campanhas_registradas] }));
      return registroLocal;
    },
    addSolicitacaoAdesao: async (sol) => {
      const novaSolicitacao: SolicitacaoAdesaoCampanha = {
        ...sol,
        id: `sol_${uid()}`,
        status: "pendente",
        criado_em: new Date().toISOString()
      };

      try {
        const { error } = await (supabase as any).from("solicitacoes_adesao").insert([novaSolicitacao]);
        if (!error) {
          setDb(prev => ({ ...prev, solicitacoes_adesao: [novaSolicitacao, ...prev.solicitacoes_adesao] }));
          toast.success("Solicitação de participação enviada para a equipe da campanha!");
          return;
        }
      } catch (err) {
        console.warn("Salvando adesão localmente no fallback:", err);
      }

      const localAdesoes: SolicitacaoAdesaoCampanha[] = JSON.parse(localStorage.getItem("democracias-adesao-locais") || "[]");
      localAdesoes.push(novaSolicitacao);
      localStorage.setItem("democracias-adesao-locais", JSON.stringify(localAdesoes));
      setDb(prev => ({ ...prev, solicitacoes_adesao: [novaSolicitacao, ...prev.solicitacoes_adesao] }));
      toast.success("Solicitação de participação enviada para a equipe da campanha!");
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
        const novaQtd = Math.max(0, material.estoque + delta);
        const { error } = await supabase.from("materiais")
          .update({ estoque: novaQtd })
          .eq("id", id);
        
        if (!error) {
          // Log no histórico
          await supabase.from("historico_estoque").insert([{
            material_id: id,
            quantidade_anterior: material.estoque,
            quantidade_nova: novaQtd,
            diferenca: delta,
            tipo: delta > 0 ? "entrada" : "saida",
            observacao: delta > 0 ? "Ajuste manual (entrada)" : "Ajuste manual (saída)"
          }]);
        } else {
          toast.error("Erro ao ajustar estoque");
        }
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
      const { data: saidaCriada, error: errorSaida } = await supabase.from("saidas").insert([s]).select().single();
      if (errorSaida) {
        toast.error("Erro ao registrar saída");
        return;
      }
      
      // Atualizar estoque e logar no histórico
      for (const item of s.itens) {
        const mat = db.materiais.find(m => m.id === item.material_id);
        if (mat) {
          const novaQtd = Math.max(0, mat.estoque - item.quantidade);
          await supabase.from("materiais")
            .update({ estoque: novaQtd })
            .eq("id", mat.id);
            
          await supabase.from("historico_estoque").insert([{
            material_id: mat.id,
            quantidade_anterior: mat.estoque,
            quantidade_nova: novaQtd,
            diferenca: -item.quantidade,
            tipo: "saida",
            observacao: `Saída registrada (Ref: ${saidaCriada.id})`
          }]);
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
    processarInventario: async (ajustes) => {
      for (const ajuste of ajustes) {
        const mat = db.materiais.find(m => m.id === ajuste.material_id);
        if (mat) {
          const diferenca = ajuste.quantidade_real - mat.estoque;
          if (diferenca === 0) continue;

          const { error } = await supabase.from("materiais")
            .update({ estoque: ajuste.quantidade_real })
            .eq("id", mat.id);

          if (!error) {
            await supabase.from("historico_estoque").insert([{
              material_id: mat.id,
              quantidade_anterior: mat.estoque,
              quantidade_nova: ajuste.quantidade_real,
              diferenca: diferenca,
              tipo: "ajuste_inventario",
              observacao: "Ajuste de Inventário"
            }]);
          }
        }
      }
    },
    resetarDados: async () => {
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
