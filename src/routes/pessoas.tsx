import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, MessageCircle, Plus, Search, Trash2, Send, Copy } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { useStore } from "@/lib/store";
import { formatTelefone, whatsappLink, type TipoPessoa } from "@/lib/db";
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
        content: "Equipe de campo organizada por comitê, função e zona de atuação.",
      },
    ],
  }),
  component: PessoasPage,
});

function PessoasPage() {
  const { db, addPessoa, removePessoa } = useStore();
  const [busca, setBusca] = useState("");
  const [open, setOpen] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [tipoAtivo, setTipoAtivo] = useState<TipoPessoa>("responsavel");
  const [form, setForm] = useState({
    nome: "",
    cpf: "",
    funcao: "",
    comite_id: db.comites[0]?.id ?? "",
    municipio: "Fortaleza",
    telefone: "",
    zona: "",
  });

  const lista = (tipo: TipoPessoa) =>
    db.pessoas.filter(
      (p) =>
        p.tipo === tipo &&
        `${p.nome} ${p.funcao} ${p.zona} ${p.municipio}`.toLowerCase().includes(busca.toLowerCase()),
    );

  async function salvar() {
    if (!form.nome.trim()) {
      toast.error("Informe o nome completo.");
      return;
    }
    setSalvando(true);
    await addPessoa({ ...form, tipo: tipoAtivo });
    setSalvando(false);
    setOpen(false);
    setForm({
      nome: "",
      cpf: "",
      funcao: "",
      comite_id: db.comites[0]?.id ?? "",
      municipio: "Fortaleza",
      telefone: "",
      zona: "",
    });
    toast.success("Cadastro realizado.");
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
          <DialogTrigger className="flex w-full items-center justify-between rounded-xl bg-foreground px-6 py-4 font-bold text-background transition-transform active:scale-95">
            Novo Cadastro
            <Plus className="size-5" strokeWidth={3} />
          </DialogTrigger>
          <DialogContent className="max-w-[400px] rounded-2xl">
            <DialogHeader>
              <DialogTitle>
                {tipoAtivo === "responsavel"
                  ? "Novo Responsável"
                  : "Novo Apoiador / Cabo Eleitoral"}
              </DialogTitle>
              <DialogDescription>
                O cadastro segue a aba selecionada na tela.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
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
              <Campo label="Função / Cargo">
                <Input
                  value={form.funcao}
                  onChange={(e) => setForm({ ...form, funcao: e.target.value })}
                  placeholder="Cabo Eleitoral, Coordenador..."
                />
              </Campo>
              <Campo label="Município">
                <Input
                  value={form.municipio}
                  onChange={(e) => setForm({ ...form, municipio: e.target.value })}
                  placeholder="Fortaleza, Caucaia..."
                />
              </Campo>
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
              <Campo label="Telefone / WhatsApp">
                <Input
                  value={form.telefone}
                  inputMode="numeric"
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                  placeholder="85988887777"
                />
              </Campo>
              <Campo label="Zona de Atuação">
                <Input
                  value={form.zona}
                  onChange={(e) => setForm({ ...form, zona: e.target.value })}
                  placeholder="Zona 001"
                />
              </Campo>
              <button
                onClick={salvar}
                disabled={salvando}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-bold text-primary-foreground disabled:opacity-60"
              >
                {salvando && <Loader2 className="size-4 animate-spin" />}
                Salvar Cadastro
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
                    <p className="truncate font-bold leading-tight">{p.nome}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {p.funcao} • {p.zona} • {p.municipio}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {comite?.nome ?? "Sem comitê"}
                    </p>
                  </div>
                  {p.telefone && (
                    <a
                      href={whatsappLink(p.telefone)}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Chamar ${p.nome} no WhatsApp (${formatTelefone(p.telefone)})`}
                      className="flex size-10 items-center justify-center rounded-xl bg-accent/10 text-accent"
                    >
                      <MessageCircle className="size-5" />
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
