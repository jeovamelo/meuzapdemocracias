import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { 
  Loader2, 
  Plus, 
  Search, 
  Trash2, 
  Send, 
  Copy, 
  Pencil, 
  ShieldCheck, 
  ShieldAlert, 
  User, 
  Users, 
  MapPin,
  Sparkles,
  Target
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { 
  formatTelefone, 
  whatsappLink, 
  formatNumero,
  type Pessoa, 
  PAPEIS_CAMPANHA_OPCOES 
} from "@/lib/db";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EstadoCidadeSelect } from "@/components/EstadoCidadeSelect";
import { useCampaignScope } from "@/hooks/useCampaignScope";
import { Badge } from "@/components/ui/badge";
import { buscarCep, formatarCep } from "@/lib/cep";

export const Route = createFileRoute("/pessoas")({
  head: () => ({
    meta: [
      { title: "Pessoas e Equipe de Campo — Democracias" },
      {
        name: "description",
        content:
          "Gestão unificada de lideranças, coordenadores e apoiadores de campanha eleitoral.",
      },
      {
        property: "og:title",
        content: "Pessoas e Equipe de Campo — Democracias",
      },
      {
        property: "og:description",
        content: "Equipe de campo conectada aos comitês e pronta para mobilização.",
      },
    ],
  }),
  component: PessoasPage,
});

const OPCOES_CARGOS = [
  "Coordenador(a) Geral / Chefe de Campanha",
  "Coordenador(a) de Mobilização / Rua",
  "Coordenador(a) de Comitê",
  "Lideranças Comunitárias",
  "Lideranças Religiosas",
  "Cabo Eleitoral / Mobilizador(a)",
  "Coordenador(a) de Comunicação e Redes Sociais",
  "Advogado(a) Eleitoral (Jurídico)",
  "Contador(a) Eleitoral",
  "Tesoureiro(a) / Diretor(a) Financeiro(a)",
  "Apoiador(a) / Eleitor(a) Simpatizante",
  "Eleitor e Outros",
];

function PessoasPage() {
  const { db, addPessoa, updatePessoa, removePessoa } = useStore();
  const { campaign } = useCampaignScope();
  const [busca, setBusca] = useState("");
  const [ordenacao, setOrdenacao] = useState<'nome-asc' | 'nome-desc' | 'recentes'>('nome-asc');
  const [open, setOpen] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const initialForm = {
    nome: "",
    cpf: "",
    funcao: "Apoiador(a) / Eleitor(a) Simpatizante",
    comite_id: db.comites[0]?.id || "",
    cep: "",
    endereco: "",
    numero: "",
    complemento: "",
    bairro: "",
    municipio: "Fortaleza",
    uf: campaign?.uf || db.config.uf || "CE",
    telefone: "",
    zona: "",
    meta_votos: 1,
    status: "ativo" as "ativo" | "pendente_aprovacao" | "inativo",
  };

  const [form, setForm] = useState(initialForm);

  const handleCepChange = async (novoCep: string) => {
    const formatado = formatarCep(novoCep);
    setForm((prev) => ({ ...prev, cep: formatado }));

    const clean = novoCep.replace(/\D/g, "");
    if (clean.length === 8) {
      setBuscandoCep(true);
      const resultado = await buscarCep(clean);
      setBuscandoCep(false);

      if (resultado) {
        setForm((prev) => ({
          ...prev,
          endereco: resultado.logradouro || prev.endereco,
          bairro: resultado.bairro || prev.bairro,
          municipio: resultado.localidade || prev.municipio,
          uf: resultado.uf || prev.uf,
        }));
        toast.success(`Endereço localizado: ${resultado.logradouro || "Logradouro"}, ${resultado.bairro || "Bairro"} - ${resultado.localidade}/${resultado.uf}`);
      }
    }
  };

  useEffect(() => {
    if (!open) {
      setEditandoId(null);
      setForm(initialForm);
    }
  }, [open, campaign]);

  const pessoasFiltradas = useMemo(() => {
    return db.pessoas
      .filter((p) => {
        const matchCamp = !campaign?.id || !p.campanha_id || p.campanha_id === campaign.id;
        const matchBusca = `${p.nome} ${p.funcao || ""} ${p.zona || ""} ${p.municipio || ""}`
          .toLowerCase()
          .includes(busca.toLowerCase());
        return matchCamp && matchBusca;
      })
      .sort((a, b) => {
        if (ordenacao === 'nome-asc') {
          return a.nome.localeCompare(b.nome, 'pt-BR');
        } else if (ordenacao === 'nome-desc') {
          return b.nome.localeCompare(a.nome, 'pt-BR');
        } else {
          const dataA = a.criado_em ? new Date(a.criado_em).getTime() : 0;
          const dataB = b.criado_em ? new Date(b.criado_em).getTime() : 0;
          return dataB - dataA;
        }
      });
  }, [db.pessoas, campaign, busca, ordenacao]);

  function handleEdit(p: Pessoa) {
    setEditandoId(p.id);
    setForm({
      nome: p.nome || "",
      cpf: p.cpf || "",
      funcao: p.funcao || p.papel_campanha || "Apoiador(a) / Eleitor(a) Simpatizante",
      comite_id: p.comite_id || db.comites[0]?.id || "",
      cep: p.cep || "",
      endereco: p.endereco || "",
      numero: p.numero || "",
      complemento: p.complemento || "",
      bairro: p.bairro || "",
      municipio: p.municipio || "Fortaleza",
      uf: p.uf || campaign?.uf || db.config.uf || "CE",
      telefone: p.telefone || "",
      zona: p.zona || "",
      meta_votos: p.meta_votos || 0,
      status: p.status || "ativo",
    });
    setOpen(true);
  }

  async function salvar() {
    if (!form.nome.trim()) {
      toast.error("Informe o nome completo.");
      return;
    }
    setSalvando(true);
    try {
      const isLideranca = form.funcao.includes("Coordenador") || form.funcao.includes("Liderança") || form.funcao.includes("Chefe");
      const tipoFinal = isLideranca ? "responsavel" : "apoiador";
      const finalMetaVotos = Number(form.meta_votos) > 0 ? Number(form.meta_votos) : 1;

      if (editandoId) {
        await updatePessoa(editandoId, { 
          ...form, 
          meta_votos: finalMetaVotos,
          tipo: tipoFinal,
          papel_campanha: form.funcao as any,
          campanha_id: campaign?.id
        } as any);
        toast.success("Cadastro atualizado com sucesso!");
      } else {
        await addPessoa({ 
          ...form, 
          meta_votos: finalMetaVotos,
          tipo: tipoFinal,
          papel_campanha: form.funcao as any,
          campanha_id: campaign?.id
        } as any);
        toast.success("Pessoa cadastrada com sucesso!");
      }
      setOpen(false);
      setEditandoId(null);
      setForm(initialForm);
    } catch {
      toast.error("Erro ao salvar cadastro.");
    } finally {
      setSalvando(false);
    }
  }

  const handleToggleAcesso = async (p: Pessoa) => {
    const novoStatus = p.status === "ativo" ? "pendente_aprovacao" : "ativo";
    
    // 1. Atualizar o status na tabela pessoas
    await updatePessoa(p.id, { ...p, status: novoStatus });
    
    // 2. Atualizar o status na tabela campaign_members (mapeando conforme as constraints do banco)
    try {
      const dbStatus = novoStatus === "ativo" ? "approved" : "pending";
      if (campaign?.id) {
        const { error: cmError } = await supabase
          .from("campaign_members")
          .update({ status: dbStatus })
          .eq("campaign_id", campaign.id)
          .eq("user_id", p.id);
          
        if (cmError) {
          console.warn("Erro ao atualizar status em campaign_members:", cmError);
        }
      }
    } catch (err) {
      console.warn("Falha ao atualizar campaign_members:", err);
    }

    toast.success(
      novoStatus === "ativo"
        ? `Acesso ao painel liberado para ${p.nome}!`
        : `Acesso suspenso para ${p.nome}.`
    );
  };

  return (
    <>
      <PageHeader
        eyebrow="Equipe de Campo"
        title="Pessoas"
        right={
          <span className="font-mono text-xs text-muted-foreground">
            {pessoasFiltradas.length} CADASTROS
          </span>
        }
      />

      <div className="space-y-3 px-5 py-6">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, função, cidade ou zona..."
              className="h-12 rounded-xl bg-surface pl-9"
            />
          </div>
          <Select value={ordenacao} onValueChange={(v: any) => setOrdenacao(v)}>
            <SelectTrigger className="h-12 w-[140px] rounded-xl bg-surface border-border font-medium">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nome-asc">Nome (A-Z)</SelectItem>
              <SelectItem value="nome-desc">Nome (Z-A)</SelectItem>
              <SelectItem value="recentes">Mais recentes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button 
              onClick={() => { setEditandoId(null); setForm(initialForm); }}
              className="flex w-full items-center justify-between rounded-xl bg-foreground px-6 py-4 font-bold text-background transition-transform active:scale-95 shadow-sm"
            >
              <span>Novo Cadastro</span>
              <Plus className="size-5" strokeWidth={3} />
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-[500px] max-h-[90vh] overflow-y-auto rounded-2xl">
            <DialogHeader>
              <DialogTitle>
                {editandoId ? "Editar Cadastro" : "Novo Cadastro na Campanha"}
              </DialogTitle>
              <DialogDescription>
                {editandoId ? "Altere as informações e a função da pessoa na equipe." : "Preencha os dados para registrar um membro na equipe de campo."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 pt-2">
              <section className="space-y-3">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-primary">Dados Pessoais</h3>
                
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Campo label="Nome completo">
                    <Input
                      value={form.nome}
                      onChange={(e) => setForm({ ...form, nome: e.target.value })}
                      placeholder="Nome e sobrenome"
                      className="bg-background"
                    />
                  </Campo>
                  <Campo label="CPF (Opcional)">
                    <Input
                      value={form.cpf}
                      onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                      placeholder="000.000.000-00"
                      className="bg-background"
                    />
                  </Campo>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Campo label="Telefone / WhatsApp">
                    <Input
                      value={form.telefone}
                      inputMode="numeric"
                      onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                      placeholder="85988887777"
                      className="bg-background"
                    />
                  </Campo>

                  <Campo label="Votos Esperados (Meta)">
                    <Input
                      type="number"
                      min="1"
                      value={form.meta_votos || ""}
                      onChange={(e) => setForm({ ...form, meta_votos: Number(e.target.value) })}
                      placeholder="1 (próprio voto)"
                      className="bg-background font-mono"
                    />
                  </Campo>
                </div>

                <Campo label="Função / Cargo na Campanha">
                  <Select
                    value={form.funcao}
                    onValueChange={(v) => setForm({ ...form, funcao: v })}
                  >
                    <SelectTrigger className="bg-background font-medium">
                      <SelectValue placeholder="Selecione a função..." />
                    </SelectTrigger>
                    <SelectContent>
                      {OPCOES_CARGOS.map((cargo) => (
                        <SelectItem key={cargo} value={cargo}>
                          {cargo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Campo>
              </section>

              <section className="space-y-3">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-primary">Endereço e Localidade</h3>
                
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Campo label="CEP">
                    <div className="relative">
                      <Input
                        value={form.cep}
                        maxLength={9}
                        onChange={(e) => handleCepChange(e.target.value)}
                        onBlur={(e) => handleCepChange(e.target.value)}
                        placeholder="60000-000"
                        className="bg-background pr-8"
                      />
                      {buscandoCep && (
                        <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 animate-spin text-primary" />
                      )}
                    </div>
                  </Campo>
                  <Campo label="Bairro">
                    <Input
                      value={form.bairro}
                      onChange={(e) => setForm({ ...form, bairro: e.target.value })}
                      placeholder="Nome do bairro"
                      className="bg-background"
                    />
                  </Campo>
                </div>

                <EstadoCidadeSelect
                  uf={form.uf}
                  cidade={form.municipio}
                  onUfChange={(uf) => setForm({ ...form, uf })}
                  onCidadeChange={(municipio) => setForm({ ...form, municipio })}
                />

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <Campo label="Logradouro">
                      <Input
                        value={form.endereco}
                        onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                        placeholder="Rua, Av..."
                        className="bg-background"
                      />
                    </Campo>
                  </div>
                  <div>
                    <Campo label="Número">
                      <Input
                        value={form.numero}
                        onChange={(e) => setForm({ ...form, numero: e.target.value })}
                        placeholder="123"
                        className="bg-background"
                      />
                    </Campo>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-primary">Vínculo e Atuação</h3>
                
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Campo label="Comitê Vinculado">
                    <Select
                      value={form.comite_id}
                      onValueChange={(comite_id) => setForm({ ...form, comite_id })}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Selecione o comitê" />
                      </SelectTrigger>
                      <SelectContent>
                        {db.comites
                          .filter((c) => !campaign?.id || !c.campaign_id || c.campaign_id === campaign.id)
                          .map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.nome}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </Campo>

                  <Campo label="Zona de Atuação">
                    <Input
                      value={form.zona}
                      onChange={(e) => setForm({ ...form, zona: e.target.value })}
                      placeholder="Zona 001 / Bairros"
                      className="bg-background"
                    />
                  </Campo>
                </div>
              </section>

              <button
                onClick={salvar}
                disabled={salvando}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-bold text-primary-foreground disabled:opacity-60 transition-all shadow-md"
              >
                {salvando && <Loader2 className="size-4 animate-spin" />}
                {editandoId ? "Salvar Alterações" : "Concluir Cadastro"}
              </button>
            </div>
          </DialogContent>
        </Dialog>

        <button
          onClick={() => {
            const url = `${window.location.origin}/public/cadastro?campanha=${campaign?.id || ""}&uf=${campaign?.uf || "CE"}&nr=${campaign?.numero || ""}`;
            navigator.clipboard.writeText(url);
            toast.success("Link exclusivo de auto-cadastro copiado!");
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 py-3.5 font-bold text-primary transition-all active:scale-95 shadow-sm"
        >
          <Send className="size-4" />
          <span>Compartilhar Link de Auto-Cadastro</span>
          <Copy className="ml-auto size-4 opacity-60" />
        </button>
      </div>

      {/* LISTAGEM UNIFICADA DE PESSOAS */}
      <div className="px-5 pb-20 space-y-2.5">
        {pessoasFiltradas.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-12 text-center">
            <Users className="mx-auto mb-3 size-10 text-muted-foreground/30" />
            <p className="text-sm font-semibold text-muted-foreground">Nenhuma pessoa encontrada.</p>
            <p className="text-xs text-muted-foreground mt-1">Use o botão "Novo Cadastro" para adicionar apoiadores ou lideranças.</p>
          </div>
        ) : (
          pessoasFiltradas.map((p) => {
            const comite = db.comites.find((c) => c.id === p.comite_id);
            const isAcessoAtivo = p.status === "ativo";

            return (
              <article
                key={p.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3.5 shadow-sm transition-all hover:shadow-md"
              >
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-mono text-xs font-bold text-primary">
                  {p.nome
                    .split(" ")
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join("")}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate font-bold leading-tight text-sm">{p.nome}</p>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${
                        isAcessoAtivo
                          ? "bg-green-500/10 text-green-700 border border-green-500/20"
                          : "bg-amber-500/10 text-amber-700 border border-amber-500/20"
                      }`}
                    >
                      <span className={`size-1.5 rounded-full ${isAcessoAtivo ? "bg-green-600" : "bg-amber-600"}`} />
                      {isAcessoAtivo ? "Acesso Liberado" : "Acesso Pendente"}
                    </span>
                  </div>

                  <p className="truncate text-xs text-muted-foreground mt-0.5">
                    <span className="font-semibold text-foreground/80">{p.funcao || p.papel_campanha || "Apoiador(a)"}</span>
                    {p.municipio ? ` • ${p.municipio}` : ""}
                    {p.zona ? ` • ${p.zona}` : ""}
                  </p>

                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1">
                    {comite && (
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="size-3 shrink-0" /> {comite.nome}
                      </span>
                    )}
                    {p.meta_votos ? (
                      <span className="flex items-center gap-1 font-mono font-bold text-primary shrink-0">
                        <Target className="size-3" /> {formatNumero(p.meta_votos)} votos
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* CONTROLE DE ACESSO */}
                <button
                  onClick={() => handleToggleAcesso(p)}
                  title={isAcessoAtivo ? "Clique para suspender/bloquear acesso" : "Clique para liberar acesso ao painel"}
                  className={`flex size-10 shrink-0 items-center justify-center rounded-xl transition-all ${
                    isAcessoAtivo
                      ? "bg-green-500/10 text-green-700 hover:bg-green-500/25 border border-green-500/20"
                      : "bg-amber-500/10 text-amber-700 hover:bg-amber-500/25 border border-amber-500/20"
                  }`}
                >
                  <ShieldCheck className="size-4" />
                </button>

                {/* EDITAR */}
                <button
                  onClick={() => handleEdit(p)}
                  aria-label={`Editar ${p.nome}`}
                  title="Editar Cadastro"
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  <Pencil className="size-4" />
                </button>

                {/* WHATSAPP */}
                {p.telefone && (
                  <a
                    href={whatsappLink(p.telefone)}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Chamar ${p.nome} no WhatsApp`}
                    title={`Chamar ${p.nome} no WhatsApp`}
                    className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#25D366]/15 text-[#128C7E] hover:bg-[#25D366] hover:text-white transition-all shadow-sm"
                  >
                    <svg className="size-4 fill-current" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                    </svg>
                  </a>
                )}

                {/* EXCLUIR */}
                <button
                  onClick={async () => {
                    if (confirm(`Excluir o cadastro de ${p.nome}?`)) {
                      await removePessoa(p.id);
                      toast.success(`${p.nome} removido.`);
                    }
                  }}
                  aria-label={`Excluir ${p.nome}`}
                  className="rounded-xl p-2.5 text-muted-foreground hover:bg-critical/10 hover:text-critical transition-colors"
                >
                  <Trash2 className="size-4" />
                </button>
              </article>
            );
          })
        )}
      </div>
    </>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-semibold uppercase text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
