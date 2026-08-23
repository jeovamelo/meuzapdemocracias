import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Loader2, Plus, Search, Trash2, Send, Copy, Pencil, ShieldCheck, ShieldAlert, Key } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { useStore } from "@/lib/store";
import { formatTelefone, whatsappLink, type TipoPessoa, type Pessoa } from "@/lib/db";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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

export const Route = createFileRoute("/pessoas")({
  head: () => ({
    meta: [
      { title: "Responsáveis e Apoiadores — Estoque de Campanha" },
      {
        name: "description",
        content:
          "Cadastro de coordenadores de comitê e cabos eleitorais com função, zona de atuação e WhatsApp.",
      },
      {
        property: "og:title",
        content: "Responsáveis e Apoiadores — Estoque de Campanha",
      },
      {
        property: "og:description",
        content: "Equipe de campo conectada aos comitês e pronta para retirada de material.",
      },
    ],
  }),
  component: PessoasPage,
});

function PessoasPage() {
  const { db, addPessoa, updatePessoa, removePessoa } = useStore();
  const { campaign } = useCampaignScope();
  const [tipoAtivo, setTipoAtivo] = useState<TipoPessoa>("responsavel");
  const [busca, setBusca] = useState("");
  const [open, setOpen] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const initialForm = {
    nome: "",
    cpf: "",
    funcao: "",
    comite_id: db.comites[0]?.id ?? "",
    cep: "",
    endereco: "",
    numero: "",
    complemento: "",
    bairro: "",
    municipio: "Fortaleza",
    uf: campaign?.uf || db.config.uf || "CE",
    telefone: "",
    zona: "",
    meta_votos: 0,
  };

  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    if (!open) {
      setEditandoId(null);
      setForm(initialForm);
    }
  }, [open, campaign]);

  const lista = (tipo: TipoPessoa) =>
    db.pessoas.filter(
      (p) =>
        p.tipo === tipo &&
        (!campaign?.id || !p.campanha_id || p.campanha_id === campaign.id) &&
        (!p.uf || p.uf === (campaign?.uf || db.config.uf)) &&
        `${p.nome} ${p.funcao} ${p.zona} ${p.municipio}`.toLowerCase().includes(busca.toLowerCase()),
    );

  function handleEdit(p: Pessoa) {
    setEditandoId(p.id);
    setTipoAtivo(p.tipo || "responsavel");
    setForm({
      nome: p.nome || "",
      cpf: p.cpf || "",
      funcao: p.funcao || "",
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
    });
    setOpen(true);
  }

  async function salvar() {
    if (!form.nome.trim()) {
      toast.error("Informe o nome completo.");
      return;
    }
    setSalvando(true);
    if (editandoId) {
      await updatePessoa(editandoId, { 
        ...form, 
        tipo: tipoAtivo, 
        status: "ativo",
        campanha_id: campaign?.id || undefined 
      });
      toast.success("Cadastro atualizado com sucesso!");
    } else {
      await addPessoa({ 
        ...form, 
        tipo: tipoAtivo, 
        status: "ativo",
        campanha_id: campaign?.id || undefined 
      });
      toast.success("Pessoa cadastrada com sucesso!");
    }
    setSalvando(false);
    setOpen(false);
    setEditandoId(null);
    setForm(initialForm);
  }

  return (
    <>
      <PageHeader
        eyebrow="Equipe de Campo"
        title="Pessoas"
        right={
          <span className="font-mono text-xs text-muted-foreground">
            {db.pessoas.length} ATIVOS
          </span>
        }
      />

      <div className="space-y-3 px-5 py-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, função ou zona"
            className="h-12 rounded-xl bg-surface pl-9"
          />
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger 
            onClick={() => { setEditandoId(null); setForm(initialForm); }}
            className="flex w-full items-center justify-between rounded-xl bg-foreground px-6 py-4 font-bold text-background transition-transform active:scale-95"
          >
            Novo Cadastro
            <Plus className="size-5" strokeWidth={3} />
          </DialogTrigger>
          <DialogContent className="max-w-[500px] max-h-[90vh] overflow-y-auto rounded-2xl">
            <DialogHeader>
              <DialogTitle>
                {editandoId
                  ? "Editar Cadastro"
                  : tipoAtivo === "responsavel"
                  ? "Novo Responsável"
                  : "Novo Apoiador / Cabo Eleitoral"}
              </DialogTitle>
              <DialogDescription>
                {editandoId ? "Altere as informações da pessoa na equipe de campo." : "Preencha os dados da equipe de campo."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <section className="space-y-3">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-primary/60">Dados Pessoais</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Campo label="Nome completo">
                    <Input
                      value={form.nome}
                      onChange={(e) => setForm({ ...form, nome: e.target.value })}
                      placeholder="Nome e sobrenome"
                    />
                  </Campo>
                  <Campo label="CPF">
                    <Input
                      value={form.cpf}
                      onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                      placeholder="000.000.000-00"
                    />
                  </Campo>
                </div>
                <Campo label="Meta de Votos (Estimativa)">
                  <Input
                    type="number"
                    value={form.meta_votos || ""}
                    onChange={(e) => setForm({ ...form, meta_votos: Number(e.target.value) })}
                    placeholder="0"
                  />
                </Campo>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Campo label="Telefone / WhatsApp">
                    <Input
                      value={form.telefone}
                      inputMode="numeric"
                      onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                      placeholder="85988887777"
                    />
                  </Campo>
                  <Campo label="Função / Cargo">
                    <div className="relative">
                      <Input
                        value={form.funcao}
                        onChange={(e) => setForm({ ...form, funcao: e.target.value })}
                        placeholder="Selecione ou digite..."
                        list="funcoes-list"
                      />
                      <datalist id="funcoes-list">
                        <option value="Cabo Eleitoral" />
                        <option value="Apoiador" />
                        <option value="Coordenador" />
                      </datalist>
                    </div>
                  </Campo>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-primary/60">Endereço</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Campo label="CEP">
                    <Input
                      value={form.cep}
                      maxLength={9}
                      onChange={async (e) => {
                        const cep = e.target.value.replace(/\D/g, "");
                        const formatted = cep.length > 5 ? `${cep.slice(0, 5)}-${cep.slice(5, 8)}` : cep;
                        setForm({ ...form, cep: formatted });
                        
                        if (cep.length === 8) {
                          try {
                            const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                            const data = await res.json();
                            if (!data.erro) {
                              setForm(prev => ({
                                ...prev,
                                cep: formatted,
                                endereco: data.logradouro,
                                bairro: data.bairro,
                                municipio: data.localidade
                              }));
                            }
                          } catch (err) {
                            console.error("Erro ao buscar CEP", err);
                          }
                        }
                      }}
                      placeholder="00000-000"
                    />
                  </Campo>
                </div>
                <EstadoCidadeSelect
                  uf={form.uf}
                  cidade={form.municipio}
                  onUfChange={(newUf) => setForm({ ...form, uf: newUf })}
                  onCidadeChange={(newMunicipio) => setForm({ ...form, municipio: newMunicipio })}
                />
                <Campo label="Endereço">
                  <Input
                    value={form.endereco}
                    onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                    placeholder="Logradouro"
                  />
                </Campo>
                <div className="grid grid-cols-2 gap-3">
                  <Campo label="Número">
                    <Input
                      value={form.numero}
                      onChange={(e) => setForm({ ...form, numero: e.target.value })}
                      placeholder="123"
                    />
                  </Campo>
                  <Campo label="Bairro">
                    <Input
                      value={form.bairro}
                      onChange={(e) => setForm({ ...form, bairro: e.target.value })}
                      placeholder="Nome do bairro"
                    />
                  </Campo>
                </div>
                <Campo label="Complemento (Opcional)">
                  <Input
                    value={form.complemento}
                    onChange={(e) => setForm({ ...form, complemento: e.target.value })}
                    placeholder="Apto, Sala, Bloco..."
                  />
                </Campo>
              </section>

              <section className="space-y-3">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-primary/60">Vínculo e Atuação</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Campo label="Comitê Vinculado">
                    <Select
                      value={form.comite_id}
                      onValueChange={(v) => setForm({ ...form, comite_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o comitê" />
                      </SelectTrigger>
                      <SelectContent>
                        {db.comites.map((c) => (
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
                      placeholder="Zona 001"
                    />
                  </Campo>
                </div>
              </section>
              <button
                onClick={salvar}
                disabled={salvando}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-bold text-primary-foreground disabled:opacity-60"
              >
                {salvando && <Loader2 className="size-4 animate-spin" />}
                {editandoId ? "Salvar Alterações" : "Salvar Cadastro"}
              </button>
            </div>
          </DialogContent>
        </Dialog>
        <button
          onClick={() => {
            const url = window.location.origin + "/public/cadastro";
            navigator.clipboard.writeText(url);
            toast.success("Link copiado para a área de transferência!");
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-primary/30 bg-primary/5 py-4 font-bold text-primary"
        >
          <Send className="size-4" />
          Compartilhar Link de Auto-Cadastro
          <Copy className="ml-auto size-4 opacity-50" />
        </button>
      </div>

      <Tabs
        value={tipoAtivo}
        onValueChange={(v) => setTipoAtivo(v as TipoPessoa)}
        className="px-5 pb-10"
      >
        <TabsList className="grid w-full grid-cols-2 rounded-xl bg-surface">
          <TabsTrigger value="responsavel" className="rounded-lg text-xs font-bold">
            Responsáveis
          </TabsTrigger>
          <TabsTrigger value="apoiador" className="rounded-lg text-xs font-bold">
            Apoiadores
          </TabsTrigger>
        </TabsList>

        {(["responsavel", "apoiador"] as TipoPessoa[]).map((tipo) => (
          <TabsContent key={tipo} value={tipo} className="mt-4 space-y-2">
            {lista(tipo).length === 0 && (
              <p className="rounded-xl border border-border bg-surface p-4 text-sm text-muted-foreground">
                Nenhum registro nesta aba.
              </p>
            )}
            {lista(tipo).map((p) => {
              const comite = db.comites.find((c) => c.id === p.comite_id);
              return (
                <article
                  key={p.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3"
                >
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-bold text-primary">
                    {p.nome
                      .split(" ")
                      .slice(0, 2)
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-bold leading-tight">{p.nome}</p>
                      {tipo === "responsavel" && (
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          p.status === "ativo" 
                            ? "bg-green-100 text-green-700" 
                            : "bg-amber-100 text-amber-700"
                        }`}>
                          {p.status === "ativo" ? "Acesso Liberado" : "Pendente"}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {p.funcao || "Membro"} • {p.zona || "Sem Zona"} • {p.municipio || "CE"}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {comite?.nome ?? "Sem comitê"}
                    </p>
                  </div>
                  {tipo === "responsavel" && (
                    <button
                      onClick={async () => {
                        const novoStatus = p.status === "ativo" ? "pendente_aprovacao" : "ativo";
                        await updatePessoa(p.id, { ...p, status: novoStatus });
                        toast.success(
                          novoStatus === "ativo"
                            ? `Acesso ao painel liberado para ${p.nome}!`
                            : `Acesso suspenso para ${p.nome}.`
                        );
                      }}
                      title={p.status === "ativo" ? "Clique para suspender acesso" : "Clique para liberar acesso ao painel"}
                      className={`flex size-10 items-center justify-center rounded-xl transition-colors ${
                        p.status === "ativo"
                          ? "bg-green-500/10 text-green-700 hover:bg-green-500/20"
                          : "bg-amber-500/10 text-amber-700 hover:bg-amber-500/20"
                      }`}
                    >
                      <ShieldCheck className="size-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(p)}
                    aria-label={`Editar ${p.nome}`}
                    title="Editar Cadastro"
                    className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    <Pencil className="size-4" />
                  </button>
                  {p.telefone && (
                    <a
                      href={whatsappLink(p.telefone)}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Chamar ${p.nome} no WhatsApp (${formatTelefone(p.telefone)})`}
                      title={`Chamar ${p.nome} no WhatsApp`}
                      className="flex size-10 items-center justify-center rounded-xl bg-[#25D366]/15 text-[#128C7E] hover:bg-[#25D366] hover:text-white transition-all shadow-sm"
                    >
                      <svg className="size-5 fill-current" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                        </svg>
                    </a>
                  )}
                  <button
                    onClick={async () => {
                      await removePessoa(p.id);
                      toast.success(`${p.nome} removido.`);
                    }}
                    aria-label={`Excluir ${p.nome}`}
                    className="rounded-lg p-2 text-muted-foreground active:bg-critical/10 active:text-critical"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </article>
              );
            })}
          </TabsContent>
        ))}
      </Tabs>
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
