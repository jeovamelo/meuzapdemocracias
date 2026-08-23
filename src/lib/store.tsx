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
  addComite: (c: Omit<Comite, "id" | "ativo" | "status"> & { status?: Comite["status"]; campaign_id?: string }) => Promise<void>;
  updateComite: (id: string, c: Partial<Comite>) => Promise<void>;
  removeComite: (id: string) => Promise<void>;
  addPessoa: (p: Omit<Pessoa, "id" | "status"> & { status?: Pessoa["status"]; campaign_id?: string; campanha_id?: string }) => Promise<Pessoa | null>;
  updatePessoa: (id: string, p: Partial<Pessoa>) => Promise<void>;
  removePessoa: (id: string) => Promise<void>;
  addMaterial: (m: Omit<Material, "id" | "unidade" | "arquivado"> & { campaign_id?: string }) => Promise<void>;
  updateMaterial: (id: string, m: Partial<Material>) => Promise<void>;
  ajustarEstoque: (id: string, delta: number) => Promise<void>;
  archiveMaterial: (id: string) => Promise<void>;
  addKit: (k: Omit<Kit, "id" | "arquivado"> & { campaign_id?: string }) => Promise<void>;
  updateKit: (id: string, k: Partial<Kit>) => Promise<void>;
  archiveKit: (id: string) => Promise<void>;
  registrarSaida: (s: Omit<Saida, "id" | "criado_em">) => Promise<void>;
  addSolicitacao: (s: Omit<SolicitacaoMaterial, "id" | "criado_em" | "status">) => Promise<void>;
  updateSolicitacao: (id: string, s: Partial<SolicitacaoMaterial>) => Promise<void>;
  despacharSolicitacao: (id: string) => Promise<void>;
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

    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => void fetchAll(), 250);
    };

    const realtimeTables = [
      'comites',
      'pessoas',
      'materiais',
      'kits',
      'saidas',
      'solicitacoes',
      'boletins_urna',
      'historico_estoque',
      'campaigns',
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
      const payload = { 
        ...c, 
        ativo: c.status === "ativo", 
        status: c.status || "ativo" 
      };
      const { data, error } = await supabase.from("comites").insert([payload]).select().single();
      if (error) {
        toast.error(`Erro ao adicionar comitê: ${error.message}`);
      } else if (data) {
        setDb(prev => ({ ...prev, comites: [data as any, ...prev.comites] }));
      }
    },
    updateComite: async (id, c) => {
      const updateData = { ...c };
      if (c.status) (updateData as any).ativo = c.status === "ativo";
      const { error } = await supabase.from("comites").update(updateData).eq("id", id);
      if (error) {
        toast.error("Erro ao atualizar comitê");
      } else {
        setDb(prev => ({
          ...prev,
          comites: prev.comites.map(item => item.id === id ? { ...item, ...updateData } : item)
        }));
      }
    },
    removeComite: async (id) => {
      const { error } = await supabase.from("comites").delete().eq("id", id);
      if (error) {
        toast.error("Erro ao remover comitê");
      } else {
        setDb(prev => ({ ...prev, comites: prev.comites.filter(item => item.id !== id) }));
      }
    },
    addPessoa: async (p) => {
      const finalCampId = p.campanha_id || (p as any).campaign_id || null;
      const payload: any = {
        nome: p.nome.trim(),
        cpf: p.cpf ? p.cpf.replace(/\D/g, "") : null,
        telefone: p.telefone ? p.telefone.trim() : null,
        funcao: p.funcao || p.papel_campanha || "Apoiador(a)",
        tipo: p.tipo || "apoiador",
        papel_campanha: p.papel_campanha || p.funcao || null,
        meta_votos: Number(p.meta_votos) || 0,
        comite_id: p.comite_id || null,
        cep: p.cep ? p.cep.trim() : null,
        endereco: p.endereco ? p.endereco.trim() : null,
        numero: p.numero ? p.numero.trim() : null,
        complemento: p.complemento ? p.complemento.trim() : null,
        bairro: p.bairro ? p.bairro.trim() : null,
        municipio: p.municipio ? p.municipio.trim() : "Fortaleza",
        uf: p.uf ? p.uf.trim() : "CE",
        zona: p.zona ? p.zona.trim() : null,
        status: p.status || "ativo",
        campanha_id: finalCampId,
        campaign_id: finalCampId,
      };

      try {
        const { data, error } = await supabase
          .from("pessoas")
          .insert([payload])
          .select()
          .single();

        if (!error && data) {
          const novaPessoa: Pessoa = data as any;
          setDb(prev => ({
            ...prev,
            pessoas: [novaPessoa, ...prev.pessoas.filter(item => item.id !== novaPessoa.id)]
          }));

          // Se for Responsável e tiver campanha vinculada, refletir em campaign_members
          if (novaPessoa.tipo === 'responsavel' && finalCampId) {
            try {
              await supabase.from("campaign_members").insert([{
                campaign_id: finalCampId,
                user_id: novaPessoa.id,
                role: novaPessoa.papel_campanha || 'responsavel',
                status: novaPessoa.status || 'ativo'
              } as any]);
            } catch (mErr) {
              console.warn("Vínculo em campaign_members:", mErr);
            }
          }

          return novaPessoa;
        } else if (error) {
          console.error("Erro ao inserir na tabela pessoas do Supabase:", error);
          toast.error(`Erro ao salvar no banco: ${error.message}`);
          throw error;
        }
      } catch (err) {
        console.error("Exceção ao inserir pessoa:", err);
        throw err;
      }
    },
    updatePessoa: async (id, pessoa) => {
      try {
        const { error } = await supabase.from("pessoas").update(pessoa as any).eq("id", id);
        if (error) {
          console.error("Erro ao atualizar pessoa:", error);
          toast.error("Erro ao atualizar pessoa no banco");
        } else {
          setDb(prev => ({
            ...prev,
            pessoas: prev.pessoas.map(item => item.id === id ? { ...item, ...pessoa } : item)
          }));
        }
      } catch (err) {
        console.error("Erro ao atualizar pessoa:", err);
      }
    },
    removePessoa: async (id) => {
      try {
        const { error } = await supabase.from("pessoas").delete().eq("id", id);
        if (error) {
          console.error("Erro ao remover pessoa:", error);
          toast.error("Erro ao remover pessoa no banco");
        } else {
          setDb(prev => ({
            ...prev,
            pessoas: prev.pessoas.filter(item => item.id !== id)
          }));
        }
      } catch (err) {
        console.error("Erro ao remover pessoa:", err);
      }
    },
    addMaterial: async (m) => {
      const payload = { 
        ...m, 
        unidade: "un", 
        arquivado: false 
      };
      const { data, error } = await supabase.from("materiais").insert([payload]).select().single();
      if (error) {
        toast.error(`Erro ao adicionar material: ${error.message}`);
      } else if (data) {
        setDb(prev => ({ ...prev, materiais: [data as any, ...prev.materiais] }));
      }
    },
    updateMaterial: async (id, m) => {
      const { error } = await supabase.from("materiais").update(m).eq("id", id);
      if (error) {
        toast.error("Erro ao atualizar material");
      } else {
        setDb(prev => ({
          ...prev,
          materiais: prev.materiais.map(item => item.id === id ? { ...item, ...m } : item)
        }));
      }
    },
    ajustarEstoque: async (id, delta) => {
      const material = db.materiais.find(m => m.id === id);
      if (material) {
        const novaQtd = Math.max(0, material.estoque + delta);
        const { error } = await supabase.from("materiais")
          .update({ estoque: novaQtd })
          .eq("id", id);
        
        if (!error) {
          setDb(prev => ({
            ...prev,
            materiais: prev.materiais.map(item => item.id === id ? { ...item, estoque: novaQtd } : item)
          }));
          await supabase.from("historico_estoque").insert([{
            material_id: id,
            campaign_id: material.campaign_id,
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
      if (error) {
        toast.error("Erro ao arquivar material");
      } else {
        setDb(prev => ({
          ...prev,
          materiais: prev.materiais.map(item => item.id === id ? { ...item, arquivado: true } : item)
        }));
      }
    },
    addKit: async (k) => {
      const payload = { ...k, arquivado: false };
      const { data, error } = await supabase.from("kits").insert([payload]).select().single();
      if (error) {
        toast.error("Erro ao adicionar kit");
      } else if (data) {
        setDb(prev => ({ ...prev, kits: [data as any, ...prev.kits] }));
      }
    },
    updateKit: async (id, k) => {
      const { error } = await supabase.from("kits").update(k).eq("id", id);
      if (error) {
        toast.error("Erro ao atualizar kit");
      } else {
        setDb(prev => ({
          ...prev,
          kits: prev.kits.map(item => item.id === id ? { ...item, ...k } : item)
        }));
      }
    },
    archiveKit: async (id) => {
      const { error } = await supabase.from("kits").update({ arquivado: true }).eq("id", id);
      if (error) {
        toast.error("Erro ao arquivar kit");
      } else {
        setDb(prev => ({
          ...prev,
          kits: prev.kits.map(item => item.id === id ? { ...item, arquivado: true } : item)
        }));
      }
    },
    registrarSaida: async (s) => {
      const { data: saidaCriada, error: errorSaida } = await supabase.from("saidas").insert([s]).select().single();
      if (errorSaida) {
        toast.error(`Erro ao registrar saída: ${errorSaida.message}`);
        throw errorSaida;
      }
      
      if (saidaCriada) {
        setDb(prev => ({ ...prev, saidas: [saidaCriada as any, ...prev.saidas] }));
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
            campaign_id: s.campaign_id || mat.campaign_id,
            quantidade_anterior: mat.estoque,
            quantidade_nova: novaQtd,
            diferenca: -item.quantidade,
            tipo: "saida",
            observacao: `Saída registrada (Pedido: ${s.numero_pedido || saidaCriada?.id || ""})`
          }]);
        }
      }
    },
    addSolicitacao: async (s) => {
      const { data, error } = await supabase.from("solicitacoes").insert([{ ...s, status: "pendente" }]).select().single();
      if (error) {
        toast.error("Erro ao registrar solicitação");
      } else if (data) {
        setDb(prev => ({ ...prev, solicitacoes: [data as any, ...prev.solicitacoes] }));
        toast.success("Solicitação enviada com sucesso!");
      }
    },
    updateSolicitacao: async (id, s) => {
      const { error } = await supabase.from("solicitacoes").update(s).eq("id", id);
      if (error) {
        toast.error("Erro ao atualizar solicitação");
      } else {
        setDb(prev => ({
          ...prev,
          solicitacoes: prev.solicitacoes.map(item => item.id === id ? { ...item, ...s } : item)
        }));
      }
    },
    despacharSolicitacao: async (id) => {
      const sol = db.solicitacoes.find(s => s.id === id);
      if (!sol) return;

      const { error } = await supabase.from("solicitacoes").update({ status: "entregue" }).eq("id", id);
      if (error) {
        toast.error("Erro ao atualizar status da solicitação");
        return;
      }

      setDb(prev => ({
        ...prev,
        solicitacoes: prev.solicitacoes.map(item => item.id === id ? { ...item, status: "entregue" } : item)
      }));

      // Registrar saída correspondente no estoque
      try {
        const saidaPayload: Omit<Saida, "id" | "criado_em"> = {
          comite_id: sol.comite_id || db.comites[0]?.id || "",
          pessoa_id: sol.lideranca_id || "",
          campaign_id: sol.campaign_id,
          numero_pedido: `SOL-${Date.now().toString().slice(-4)}`,
          kits: [],
          itens: sol.itens.map(i => ({
            material_id: i.material_id,
            quantidade: i.quantidade
          }))
        };

        const { data: saidaData, error: errSaida } = await supabase.from("saidas").insert([saidaPayload]).select().single();
        if (!errSaida && saidaData) {
          setDb(prev => ({ ...prev, saidas: [saidaData as any, ...prev.saidas] }));
        }

        // Abater estoque
        for (const item of sol.itens) {
          const mat = db.materiais.find(m => m.id === item.material_id);
          if (mat) {
            const novaQtd = Math.max(0, mat.estoque - item.quantidade);
            await supabase.from("materiais").update({ estoque: novaQtd }).eq("id", mat.id);
            await supabase.from("historico_estoque").insert([{
              material_id: mat.id,
              campaign_id: sol.campaign_id || mat.campaign_id,
              quantidade_anterior: mat.estoque,
              quantidade_nova: novaQtd,
              diferenca: -item.quantidade,
              tipo: "saida",
              observacao: `Despacho de Solicitação #${id}`
            }]);
          }
        }

        toast.success("Solicitação despachada e estoque baixado com sucesso!");
      } catch (err) {
        console.error("Erro ao registrar baixa da solicitação:", err);
      }
    },
    updateCidadeMeta: async (id, cm) => {
      const { error } = await supabase.from("cidade_metas").update(cm).eq("id", id);
      if (error) toast.error("Erro ao atualizar meta");
    },
    updateConfig: async (config) => {
      const { error } = await supabase.from("config_campanha").upsert([{ id: "default", ...config }]);
      if (error) toast.error("Erro ao atualizar configurações");
    },
    addBoletim: async (b) => {
      const { error } = await supabase.from("boletins_urna").insert([b]);
      if (error) toast.error("Erro ao salvar Boletim de Urna");
    },
    processarInventario: async (ajustes) => {
      for (const aj of ajustes) {
        const mat = db.materiais.find(m => m.id === aj.material_id);
        if (mat && mat.estoque !== aj.quantidade_real) {
          const diferenca = aj.quantidade_real - mat.estoque;
          await supabase.from("materiais").update({ estoque: aj.quantidade_real }).eq("id", mat.id);
          await supabase.from("historico_estoque").insert([{
            material_id: mat.id,
            campaign_id: mat.campaign_id,
            quantidade_anterior: mat.estoque,
            quantidade_nova: aj.quantidade_real,
            diferenca,
            tipo: "ajuste_inventario",
            observacao: "Ajuste via balanço de inventário"
          }]);
        }
      }
      toast.success("Inventário atualizado com sucesso!");
    },
    verificarCampanhaExiste: async (uf: string, numero: string, cargo?: string) => {
      try {
        const cleanUf = uf.toUpperCase().trim();
        const cleanNr = numero.trim();

        let query = supabase
          .from("campaigns")
          .select("*")
          .eq("uf", cleanUf)
          .eq("nr_candidato", cleanNr);
        
        if (cargo) {
          query = query.ilike("cargo", cargo.trim());
        }

        const { data, error } = await query.limit(1).maybeSingle();
        if (error) throw error;

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

        return null;
      } catch (e) {
        console.warn("Erro ao consultar campaigns no Supabase:", e);
        throw e;
      }
    },
    addCampanhaRegistro: async (camp) => {
      try {
        const session = (await supabase.auth.getSession()).data.session;
        const adminUserId = session?.user?.id || null;

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
          const registroRetorno: CampanhaRegistro = {
            ...camp,
            id: data.id,
            criado_em: data.created_at,
          };
          setDb(prev => ({ ...prev, campanhas_registradas: [registroRetorno, ...prev.campanhas_registradas] }));
          return registroRetorno;
        } else if (error) {
          console.warn("Erro inserindo na tabela campaigns do Supabase:", error);
          toast.error(`Erro ao registrar campanha: ${error.message}`);
        }
      } catch (err) {
        console.warn("Erro ao salvar campanha no Supabase:", err);
      }

      return null;
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
        console.warn("Erro ao salvar adesão:", err);
      }
    },
    resetarDados: async () => {
      toast.info("Apenas o administrador do banco de dados pode resetar os registros.");
    },
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
