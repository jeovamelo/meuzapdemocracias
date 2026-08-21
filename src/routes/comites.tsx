import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MapPin, Plus, Search, Trash2, UserRound, Loader2 } from "lucide-react";
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
  const { db, addComite, removeComite } = useStore();
  const [busca, setBusca] = useState("");
  const [open, setOpen] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    endereco: "",
    bairro: "",
    coordenador: "",
    observacoes: "",
  });

  const filtrados = db.comites.filter((c) =>
    `${c.nome} ${c.bairro} ${c.coordenador}`.toLowerCase().includes(busca.toLowerCase()),
  );

  async function salvar() {
    if (!form.nome.trim()) {
      toast.error("Informe o nome do comitê.");
      return;
    }
    setSalvando(true);
    await addComite(form);
    setSalvando(false);
    setOpen(false);
    setForm({ nome: "", endereco: "", bairro: "", coordenador: "", observacoes: "" });
    toast.success("Comitê cadastrado.");
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
            {db.comites.length} BASES
          </span>
        }
      />

      <div className="space-y-3 px-5 py-6">
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
              <DialogTitle>Novo Comitê / Base</DialogTitle>
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
              <Campo label="Endereço">
                <Input
                  value={form.endereco}
                  onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                  placeholder="Rua, número"
                />
              </Campo>
              <Campo label="Bairro / Zona">
                <Input
                  value={form.bairro}
                  onChange={(e) => setForm({ ...form, bairro: e.target.value })}
                  placeholder="Vila Maria / Zona Norte"
                />
              </Campo>
              <Campo label="Coordenador Responsável">
                <Input
                  value={form.coordenador}
                  onChange={(e) => setForm({ ...form, coordenador: e.target.value })}
                  placeholder="Nome do responsável"
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
                    <MapPin className="size-3" /> {c.endereco}
                  </p>
                </div>
                <button
                  onClick={() => excluir(c.id, c.nome)}
                  aria-label={`Excluir ${c.nome}`}
                  className="rounded-lg p-2 text-muted-foreground active:bg-critical/10 active:text-critical"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              <p className="mt-3 inline-block rounded bg-accent/10 px-2 py-1 font-mono text-[10px] uppercase text-accent">
                {c.bairro}
              </p>
              {c.observacoes && (
                <p className="mt-3 text-xs text-muted-foreground">{c.observacoes}</p>
              )}
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs">
                <span className="flex items-center gap-1 font-semibold">
                  <UserRound className="size-3.5" /> {c.coordenador || "Sem coordenador"}
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
