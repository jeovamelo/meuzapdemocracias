import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { MapPin, Plus, Search, Trash2, UserRound, Loader2, Pencil, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { useStore } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/comites")({
  head: () => ({
    meta: [
      { title: "Comitês e Bases — Estoque de Campanha" },
      {
        name: "description",
        content:
          "Cadastro de comitês, bases e pontos de rua com endereço, zona e coordenador responsável.",
      },
      { property: "og:title", content: "Comitês e Bases — Estoque de Campanha" },
      {
        property: "og:description",
        content: "Cadastre e localize comitês, bases e pontos de distribuição da campanha.",
      },
    ],
  }),
  component: ComitesPage,
});

function ComitesPage() {
  const { db, addComite, removeComite, updateComite } = useStore();
  const [busca, setBusca] = useState("");
  const [abaInterna, setAbaInterna] = useState<"ativos" | "validacoes">("ativos");
  const [open, setOpen] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [cepLoading, setCepLoading] = useState(false);
  
  const initialForm = {
    nome: "",
    cep: "",
    endereco: "",
    numero: "",
    complemento: "",
    bairro: "",
    municipio: "Fortaleza",
    uf: db.config.uf || "CE",
    coordenador: "",
    whatsapp_coordenador: "",
    ponto_referencia: "",
    observacoes: "",
    meta_votos: 0,
  };

  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    if (!open) {
      setEditandoId(null);
      setForm(initialForm);
    }
  }, [open]);

  const handleCepChange = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, "");
    setForm((prev) => ({ ...prev, cep }));

    if (cleanCep.length === 8) {
      setCepLoading(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setForm((prev) => ({
            ...prev,
            endereco: data.logradouro || prev.endereco,
            bairro: data.bairro || prev.bairro,
            municipio: data.localidade || prev.municipio,
            uf: data.uf || prev.uf,
          }));
          toast.success("Endereço preenchido via CEP.");
        }
      } catch (error) {
        console.error("Erro ao buscar CEP:", error);
      } finally {
        setCepLoading(false);
      }
    }
  };

  function handleEdit(comite: any) {
    setEditandoId(comite.id);
    setForm({
      nome: comite.nome,
      cep: comite.cep || "",
      endereco: comite.endereco,
      numero: comite.numero || "",
      complemento: comite.complemento || "",
      bairro: comite.bairro,
      municipio: comite.municipio,
      uf: comite.uf,
      coordenador: comite.coordenador,
      whatsapp_coordenador: comite.whatsapp_coordenador || "",
      ponto_referencia: comite.ponto_referencia || "",
      observacoes: comite.observacoes || "",
      meta_votos: comite.meta_votos || 0,
    });
    setOpen(true);
  }

  const filtrados = db.comites.filter((c) => {
    const matchesUf = c.uf === db.config.uf;
    const matchesBusca = `${c.nome} ${c.bairro} ${c.coordenador} ${c.municipio}`.toLowerCase().includes(busca.toLowerCase());
    const matchesStatus = abaInterna === "ativos" ? c.status === "ativo" : c.status === "pendente_validacao";
    return matchesUf && matchesBusca && matchesStatus;
  });

  async function salvar() {
    if (!form.nome.trim()) {
      toast.error("Informe o nome do comitê.");
      return;
    }
    setSalvando(true);
    if (editandoId) {
      await updateComite(editandoId, { ...form, status: "ativo" });
      toast.success("Comitê atualizado.");
    } else {
      await addComite({ ...form, status: "ativo" });
      toast.success("Comitê cadastrado.");
    }
    setSalvando(false);
    setOpen(false);
    setForm(initialForm);
  }

  async function excluir(id: string, nome: string) {
    await removeComite(id);
    toast.success(`${nome} removido.`);
  }

  return (
    <>
      <PageHeader
        eyebrow="Cadastro"
        title="Comitês e Locais"
        right={
          <span className="font-mono text-xs text-muted-foreground">
            {db.comites.filter(c => c.status === "ativo").length} BASES
          </span>
        }
      />

      <div className="space-y-4 px-5 py-6">
        <Tabs value={abaInterna} onValueChange={(v) => setAbaInterna(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-xl bg-surface">
            <TabsTrigger value="ativos" className="rounded-lg text-xs font-bold">Ativos</TabsTrigger>
            <TabsTrigger value="validacoes" className="relative rounded-lg text-xs font-bold">
              Validações
              {db.comites.filter(c => c.status === "pendente_validacao").length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[8px] text-white">
                  {db.comites.filter(c => c.status === "pendente_validacao").length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar comitê, bairro ou coordenador"
            className="h-12 rounded-xl bg-surface pl-9"
          />
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger className="flex w-full items-center justify-between rounded-xl bg-foreground px-6 py-4 font-bold text-background transition-transform active:scale-95">
            Adicionar Comitê
            <Plus className="size-5" strokeWidth={3} />
          </DialogTrigger>
          <DialogContent className="max-w-[400px] rounded-2xl">
            <DialogHeader>
              <DialogTitle>{editandoId ? "Editar Comitê" : "Novo Comitê / Base"}</DialogTitle>
              <DialogDescription>
                Cadastre um local de distribuição de material.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Campo label="Nome do Comitê/Base">
                <Input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Base Norte - Vila Maria"
                />
              </Campo>
                  <Campo label="Coordenador Responsável">
                    <Input
                      value={form.coordenador}
                      onChange={(e) => setForm({ ...form, coordenador: e.target.value })}
                      placeholder="Nome do responsável"
                    />
                  </Campo>
                  <Campo label="Meta de Votos (Estimativa)">
                    <Input
                      type="number"
                      value={form.meta_votos || ""}
                      onChange={(e) => setForm({ ...form, meta_votos: Number(e.target.value) })}
                      placeholder="0"
                    />
                  </Campo>
                  <Campo label="WhatsApp Coordenador">
                <Input
                  value={form.whatsapp_coordenador}
                  onChange={(e) => setForm({ ...form, whatsapp_coordenador: e.target.value })}
                  placeholder="85 9..."
                />
              </Campo>
              <Campo label="CEP">
                <div className="relative">
                  <Input
                    value={form.cep}
                    onChange={(e) => handleCepChange(e.target.value)}
                    placeholder="00000-000"
                    maxLength={9}
                  />
                  {cepLoading && (
                    <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-primary" />
                  )}
                </div>
              </Campo>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Campo label="Endereço">
                    <Input
                      value={form.endereco}
                      onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                      placeholder="Av. Paulista..."
                    />
                  </Campo>
                </div>
                <div>
                  <Campo label="Número">
                    <Input
                      value={form.numero}
                      onChange={(e) => setForm({ ...form, numero: e.target.value })}
                      placeholder="123"
                    />
                  </Campo>
                </div>
              </div>
              <Campo label="Complemento">
                <Input
                  value={form.complemento}
                  onChange={(e) => setForm({ ...form, complemento: e.target.value })}
                  placeholder="Apto 101, Bloco A"
                />
              </Campo>
              <Campo label="Bairro / Zona">
                <Input
                  value={form.bairro}
                  onChange={(e) => setForm({ ...form, bairro: e.target.value })}
                  placeholder="Vila Maria / Zona Norte"
                />
              </Campo>
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-3">
                  <Campo label="Município">
                    <Input
                      value={form.municipio}
                      onChange={(e) => setForm({ ...form, municipio: e.target.value })}
                      placeholder="Fortaleza, Caucaia..."
                    />
                  </Campo>
                </div>
                <div>
                  <Campo label="UF">
                    <Input
                      value={form.uf}
                      onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })}
                      placeholder="CE"
                      maxLength={2}
                    />
                  </Campo>
                </div>
              </div>
              <Campo label="Ponto de Referência">
                <Input
                  value={form.ponto_referencia}
                  onChange={(e) => setForm({ ...form, ponto_referencia: e.target.value })}
                  placeholder="Ex: Perto do mercadinho..."
                />
              </Campo>
              <Campo label="Observações">
                <Textarea
                  value={form.observacoes}
                  onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                  placeholder="Horário, chaves, restrições..."
                />
              </Campo>
              <button
                onClick={salvar}
                disabled={salvando}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-bold text-primary-foreground disabled:opacity-60"
              >
                {salvando && <Loader2 className="size-4 animate-spin" />}
                Salvar Comitê
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3 px-5 pb-10">
        {filtrados.length === 0 && (
          <p className="rounded-xl border border-border bg-surface p-4 text-sm text-muted-foreground">
            Nenhum comitê encontrado.
          </p>
        )}
        {filtrados.map((c) => {
          const vinculados = db.pessoas.filter((p) => p.comite_id === c.id).length;
          return (
            <article
              key={c.id}
              className="rounded-2xl border border-border bg-surface p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold leading-tight">{c.nome}</h2>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="size-3" /> {c.endereco}{c.numero ? `, ${c.numero}` : ""}{c.complemento ? ` (${c.complemento})` : ""} - {c.municipio}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {c.status === "pendente_validacao" ? (
                    <>
                      <button
                        onClick={async () => {
                          await updateComite(c.id, { status: "ativo" });
                          toast.success("Comitê aprovado!");
                        }}
                        className="rounded-lg p-2 text-green-600 active:bg-green-500/10"
                        title="Aprovar"
                      >
                        <CheckCircle className="size-5" />
                      </button>
                      <button
                        onClick={() => excluir(c.id, c.nome)}
                        className="rounded-lg p-2 text-critical active:bg-critical/10"
                        title="Recusar"
                      >
                        <XCircle className="size-5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleEdit(c)}
                        aria-label={`Editar ${c.nome}`}
                        className="rounded-lg p-2 text-muted-foreground active:bg-accent/10 active:text-accent"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        onClick={() => excluir(c.id, c.nome)}
                        aria-label={`Excluir ${c.nome}`}
                        className="rounded-lg p-2 text-muted-foreground active:bg-critical/10 active:text-critical"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <p className="mt-3 inline-block rounded bg-accent/10 px-2 py-1 font-mono text-[10px] uppercase text-accent">
                {c.bairro}
              </p>
              {c.ponto_referencia && (
                <p className="mt-1 text-[10px] italic text-muted-foreground">Ref: {c.ponto_referencia}</p>
              )}
              {c.observacoes && (
                <p className="mt-3 text-xs text-muted-foreground">{c.observacoes}</p>
              )}
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs">
                <span className="flex items-center gap-1 font-semibold">
                  <UserRound className="size-3.5" /> {c.coordenador || "Sem coordenador"}
                  {c.whatsapp_coordenador && (
                    <span className="text-[10px] text-muted-foreground ml-1">
                      ({c.whatsapp_coordenador})
                    </span>
                  )}
                </span>
                <span className="font-mono text-muted-foreground">
                  {vinculados} pessoas
                </span>
              </div>
            </article>
          );
        })}
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
