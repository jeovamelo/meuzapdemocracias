import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Archive,
  Edit,
  FileText,
  Flag,
  History,
  Loader2,
  Minus,
  Package,
  Plus,
  Search,
  Shirt,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { useStore } from "@/lib/store";
import {
  CATEGORIAS,
  formatNumero,
  isCritico,
  type CategoriaMaterial,
  type KitItem,
} from "@/lib/db";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export const Route = createFileRoute("/materiais")({
  head: () => ({
    meta: [
      { title: "Materiais e Kits — Estoque de Campanha" },
      {
        name: "description",
        content:
          "Catálogo de materiais de campanha com estoque mínimo e composição de kits padronizados.",
      },
      { property: "og:title", content: "Materiais e Kits — Estoque de Campanha" },
      {
        property: "og:description",
        content:
          "Santinhos, bandeiras, adesivos e vestuário com controle de estoque e kits prontos.",
      },
    ],
  }),
  component: MateriaisPage,
});

const iconeCategoria = (c: CategoriaMaterial) =>
  c === "Papelaria" ? FileText : c === "Grande Formato" ? Flag : Shirt;

function MateriaisPage() {
  const { db } = useStore();
  return (
    <>
      <PageHeader
        eyebrow="Catálogo"
        title="Materiais"
        right={
          <span className="font-mono text-xs text-muted-foreground">
            {db.materiais.length} ITENS
          </span>
        }
      />
      <Tabs defaultValue="itens" className="px-5 py-6 pb-10">
        <TabsList className="grid w-full grid-cols-2 rounded-xl bg-surface">
          <TabsTrigger value="itens" className="rounded-lg text-xs font-bold">
            Estoque
          </TabsTrigger>
          <TabsTrigger value="kits" className="rounded-lg text-xs font-bold">
            Kits
          </TabsTrigger>
        </TabsList>
        <TabsContent value="itens" className="mt-4">
          <Estoque />
        </TabsContent>
        <TabsContent value="kits" className="mt-4">
          <Kits />
        </TabsContent>
      </Tabs>
    </>
  );
}

function Estoque() {
  const { db, addMaterial, ajustarEstoque, removeMaterial } = useStore();
  const [busca, setBusca] = useState("");
  const [open, setOpen] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState<{
    nome: string;
    categoria: CategoriaMaterial;
    estoque: string;
    estoque_minimo: string;
  }>({ nome: "", categoria: "Papelaria", estoque: "", estoque_minimo: "" });

  const filtrados = db.materiais.filter((m) =>
    `${m.nome} ${m.categoria}`.toLowerCase().includes(busca.toLowerCase()),
  );

  async function salvar() {
    if (!form.nome.trim()) {
      toast.error("Informe o nome do item.");
      return;
    }
    setSalvando(true);
    await addMaterial({
      nome: form.nome,
      categoria: form.categoria,
      estoque: Number(form.estoque) || 0,
      estoque_minimo: Number(form.estoque_minimo) || 0,
    });
    setSalvando(false);
    setOpen(false);
    setForm({ nome: "", categoria: "Papelaria", estoque: "", estoque_minimo: "" });
    toast.success("Material cadastrado.");
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar item ou categoria"
          className="h-12 rounded-xl bg-surface pl-9"
        />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger className="flex w-full items-center justify-between rounded-xl bg-foreground px-6 py-4 font-bold text-background transition-transform active:scale-95">
          Adicionar Material
          <Plus className="size-5" strokeWidth={3} />
        </DialogTrigger>
        <DialogContent className="max-w-[400px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Novo Material</DialogTitle>
            <DialogDescription>Item de estoque da campanha.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Campo label="Nome do item">
              <Input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Santinho, Bandeira 1x0,7m..."
              />
            </Campo>
            <Campo label="Categoria">
              <Select
                value={form.categoria}
                onValueChange={(v) =>
                  setForm({ ...form, categoria: v as CategoriaMaterial })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Estoque atual">
                <Input
                  inputMode="numeric"
                  value={form.estoque}
                  onChange={(e) => setForm({ ...form, estoque: e.target.value })}
                  placeholder="0"
                />
              </Campo>
              <Campo label="Estoque mínimo">
                <Input
                  inputMode="numeric"
                  value={form.estoque_minimo}
                  onChange={(e) => setForm({ ...form, estoque_minimo: e.target.value })}
                  placeholder="0"
                />
              </Campo>
            </div>
            <button
              onClick={salvar}
              disabled={salvando}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-bold text-primary-foreground disabled:opacity-60"
            >
              {salvando && <Loader2 className="size-4 animate-spin" />}
              Salvar Material
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-2">
        {filtrados.map((m) => {
          const Icon = iconeCategoria(m.categoria);
          const critico = isCritico(m);
          return (
            <article
              key={m.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3"
            >
              <div
                className={`flex size-11 shrink-0 items-center justify-center rounded ${critico ? "bg-critical/10 text-critical" : "bg-foreground/5"}`}
              >
                <Icon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold leading-tight">{m.nome}</p>
                <p className="text-xs text-muted-foreground">{m.categoria}</p>
                <p
                  className={`font-mono text-[10px] uppercase ${critico ? "text-critical" : "text-muted-foreground"}`}
                >
                  {formatNumero(m.estoque)} {m.unidade} • mín {formatNumero(m.estoque_minimo)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => ajustarEstoque(m.id, -10)}
                  aria-label={`Reduzir estoque de ${m.nome}`}
                  className="flex size-9 items-center justify-center rounded-lg border border-border"
                >
                  <Minus className="size-4" />
                </button>
                <button
                  onClick={() => ajustarEstoque(m.id, 10)}
                  aria-label={`Aumentar estoque de ${m.nome}`}
                  className="flex size-9 items-center justify-center rounded-lg border border-border"
                >
                  <Plus className="size-4" />
                </button>
                <button
                  onClick={async () => {
                    await removeMaterial(m.id);
                    toast.success(`${m.nome} excluído.`);
                  }}
                  aria-label={`Excluir ${m.nome}`}
                  className="rounded-lg p-2 text-muted-foreground active:text-critical"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Kits() {
  const { db, addKit, removeKit } = useStore();
  const [open, setOpen] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [itens, setItens] = useState<KitItem[]>([]);

  function setQtd(material_id: string, quantidade: number) {
    setItens((prev) => {
      const outros = prev.filter((i) => i.material_id !== material_id);
      return quantidade > 0 ? [...outros, { material_id, quantidade }] : outros;
    });
  }

  async function salvar() {
    if (!nome.trim() || itens.length === 0) {
      toast.error("Informe o nome e ao menos um item.");
      return;
    }
    setSalvando(true);
    await addKit({ nome, descricao, itens });
    setSalvando(false);
    setOpen(false);
    setNome("");
    setDescricao("");
    setItens([]);
    toast.success("Kit criado.");
  }

  return (
    <div className="space-y-3">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger className="flex w-full items-center justify-between rounded-xl bg-foreground px-6 py-4 font-bold text-background transition-transform active:scale-95">
          Compor Novo Kit
          <Plus className="size-5" strokeWidth={3} />
        </DialogTrigger>
        <DialogContent className="max-h-[85vh] max-w-[400px] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>Composição de Kit</DialogTitle>
            <DialogDescription>
              Ao distribuir o kit, o estoque de cada item é abatido automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Campo label="Nome do kit">
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Kit Rua Padrão"
              />
            </Campo>
            <Campo label="Descrição">
              <Input
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Uso diário em rua"
              />
            </Campo>
            <p className="pt-2 text-[11px] font-semibold uppercase text-muted-foreground">
              Itens do kit
            </p>
            <div className="space-y-2">
              {db.materiais.map((m) => {
                const atual = itens.find((i) => i.material_id === m.id)?.quantidade ?? 0;
                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-2 rounded-lg border border-border p-2"
                  >
                    <span className="min-w-0 flex-1 truncate text-xs font-semibold">
                      {m.nome}
                    </span>
                    <Input
                      inputMode="numeric"
                      value={atual || ""}
                      onChange={(e) => setQtd(m.id, Number(e.target.value) || 0)}
                      placeholder="0"
                      className="h-9 w-20 text-center font-mono"
                    />
                  </div>
                );
              })}
            </div>
            <button
              onClick={salvar}
              disabled={salvando}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-bold text-primary-foreground disabled:opacity-60"
            >
              {salvando && <Loader2 className="size-4 animate-spin" />}
              Salvar Kit
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {db.kits.map((k) => (
        <article key={k.id} className="rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="flex items-center gap-2 font-bold leading-tight">
                <Package className="size-4 text-primary" />
                {k.nome}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">{k.descricao}</p>
            </div>
            <button
              onClick={async () => {
                await removeKit(k.id);
                toast.success(`${k.nome} excluído.`);
              }}
              aria-label={`Excluir ${k.nome}`}
              className="rounded-lg p-2 text-muted-foreground active:text-critical"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
          <ul className="mt-3 space-y-1 border-t border-border pt-3">
            {k.itens.map((i) => {
              const m = db.materiais.find((x) => x.id === i.material_id);
              return (
                <li key={i.material_id} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{m?.nome ?? "Item removido"}</span>
                  <span className="font-mono font-bold">{formatNumero(i.quantidade)}</span>
                </li>
              );
            })}
          </ul>
        </article>
      ))}
    </div>
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
