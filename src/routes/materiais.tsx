import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
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
  Camera,
  X,
  Image as ImageIcon
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { useStore } from "@/lib/store";
import { useCampaignScope } from "@/hooks/useCampaignScope";
import {
  CATEGORIAS,
  formatNumero,
  formatDataHora,
  isCritico,
  type CategoriaMaterial,
  type KitItem,
  type Kit,
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
import { Badge } from "@/components/ui/badge";

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

const iconeCategoria = (c: CategoriaMaterial) => {
  if (c.includes("Adesivo")) return FileText;
  if (c.includes("Bandeira")) return Flag;
  if (c.includes("Santinho") || c === "Santão" || c === "Revista dobrada") return FileText;
  if (c.includes("Banner")) return Flag;
  if (c.includes("Vestuário") || c === "Bóton") return Shirt;
  return Package;
};

function MateriaisPage() {
  const { db } = useStore();
  const { campaign } = useCampaignScope();
  const materiaisAtivos = db.materiais.filter(
    (m) => !m.arquivado && (!campaign?.id || !m.campaign_id || m.campaign_id === campaign.id)
  );
  
  return (
    <>
      <PageHeader
        eyebrow="Catálogo"
        title="Materiais"
        right={
          <span className="font-mono text-xs text-muted-foreground">
            {materiaisAtivos.length} ITENS
          </span>
        }
      />
      <Tabs defaultValue="itens" className="px-5 py-6 pb-10">
        <TabsList className="grid w-full grid-cols-3 rounded-xl bg-surface">
          <TabsTrigger value="itens" className="rounded-lg text-xs font-bold">
            Estoque
          </TabsTrigger>
          <TabsTrigger value="kits" className="rounded-lg text-xs font-bold">
            Kits
          </TabsTrigger>
          <TabsTrigger value="historico" className="rounded-lg text-xs font-bold">
            Histórico
          </TabsTrigger>
        </TabsList>
        <TabsContent value="itens" className="mt-4">
          <Estoque />
        </TabsContent>
        <TabsContent value="kits" className="mt-4">
          <Kits />
        </TabsContent>
        <TabsContent value="historico" className="mt-4">
          <Historico />
        </TabsContent>
      </Tabs>
    </>
  );
}

function Estoque() {
  const { db, addMaterial, ajustarEstoque, archiveMaterial } = useStore();
  const { campaign } = useCampaignScope();
  const [busca, setBusca] = useState("");
  const [open, setOpen] = useState(false);
  const [openEntrada, setOpenEntrada] = useState(false);
  const [openInventario, setOpenInventario] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [entradas, setEntradas] = useState<Record<string, string>>({});
  const [inventario, setInventario] = useState<Record<string, string>>({});
  
  const [form, setForm] = useState<{
    nome: string;
    categoria: CategoriaMaterial;
    estoque: string;
    estoque_minimo: string;
    descricao: string;
    foto: string;
  }>({
    nome: "",
    categoria: "Folder / Santinho / Material Gráfico",
    estoque: "",
    estoque_minimo: "",
    descricao: "",
    foto: "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm(f => ({ ...f, foto: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const ativos = db.materiais.filter(
    (m) => !m.arquivado && (!campaign?.id || !m.campaign_id || m.campaign_id === campaign.id)
  );
  const filtrados = ativos.filter((m) =>
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
      descricao: form.descricao,
      foto: form.foto,
      campaign_id: campaign?.id || undefined,
    });
    setSalvando(false);
    setOpen(false);
    setForm({
      nome: "",
      categoria: "Folder / Santinho / Material Gráfico",
      estoque: "",
      estoque_minimo: "",
      descricao: "",
      foto: "",
    });
    toast.success("Material cadastrado.");
  }

  async function processarEntradaLote() {
    setSalvando(true);
    const promessas = Object.entries(entradas).map(([id, qtd]) => {
      const valor = Number(qtd);
      if (valor > 0) return ajustarEstoque(id, valor);
      return Promise.resolve();
    });
    await Promise.all(promessas);
    setSalvando(false);
    setOpenEntrada(false);
    setEntradas({});
    toast.success("Estoque atualizado com sucesso.");
  }

  async function processarInventarioFisico() {
    setSalvando(true);
    const ajustes = Object.entries(inventario)
      .filter(([_, qtd]) => qtd.trim() !== "")
      .map(([id, qtd]) => ({
        material_id: id,
        quantidade_real: Number(qtd),
      }));

    if (ajustes.length > 0) {
      await ajustarEstoqueGlobal(ajustes);
      toast.success("Inventário processado com sucesso.");
    }

    setSalvando(false);
    setOpenInventario(false);
    setInventario({});
  }

  const { processarInventario: ajustarEstoqueGlobal } = useStore();

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

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger className="flex items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-4 text-xs font-bold text-background transition-transform active:scale-95">
            Novo Material
            <Plus className="size-4" strokeWidth={3} />
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-[500px] overflow-y-auto rounded-2xl">
            <DialogHeader>
              <DialogTitle>Novo Material</DialogTitle>
              <DialogDescription>Item de estoque da campanha.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Área de Foto */}
              <div className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 p-4 transition-colors hover:bg-muted/50">
                {form.foto ? (
                  <div className="group relative h-32 w-full overflow-hidden rounded-lg">
                    <img src={form.foto} alt="Preview" className="h-full w-full object-contain" />
                    <button
                      onClick={() => setForm(f => ({ ...f, foto: "" }))}
                      className="absolute right-2 top-2 rounded-full bg-critical p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center gap-2 py-4"
                  >
                    <div className="flex size-12 items-center justify-center rounded-full bg-surface shadow-sm">
                      <Camera className="size-6 text-muted-foreground" />
                    </div>
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">
                      Adicionar Foto
                    </span>
                  </button>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFotoChange}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Campo label="Nome do item">
                    <Input
                      value={form.nome}
                      onChange={(e) => setForm({ ...form, nome: e.target.value })}
                      placeholder="Ex: Santinho 13123..."
                    />
                  </Campo>
                </div>

                <div className="md:col-span-2">
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
                </div>

                <div className="md:col-span-2">
                  <Campo label="Descrição / Especificações">
                    <textarea
                      value={form.descricao}
                      onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                      placeholder="Tamanho, cor, versão da arte, etc."
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </Campo>
                </div>

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

        <Dialog open={openEntrada} onOpenChange={setOpenEntrada}>
          <DialogTrigger className="flex items-center justify-center gap-2 rounded-xl bg-surface border border-border px-4 py-4 text-xs font-bold transition-transform active:scale-95">
            Entrada Lote
            <History className="size-4" />
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] max-w-[450px] overflow-y-auto rounded-2xl">
            <DialogHeader>
              <DialogTitle>Entrada em Lote</DialogTitle>
              <DialogDescription>
                Adicione quantidades aos itens ativos do estoque.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="divide-y divide-border">
                {ativos.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 py-3">
                    <div className="flex size-10 items-center justify-center rounded bg-foreground/5">
                      {(() => {
                        const Icon = iconeCategoria(m.categoria);
                        return <Icon className="size-4 text-muted-foreground" />;
                      })()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold leading-tight">{m.nome}</p>
                      <p className="font-mono text-[9px] uppercase text-muted-foreground">
                        Atual: {formatNumero(m.estoque)}
                      </p>
                    </div>
                    <div className="w-24">
                      <Input
                        inputMode="numeric"
                        placeholder="+0"
                        value={entradas[m.id] || ""}
                        onChange={(e) => setEntradas({ ...entradas, [m.id]: e.target.value })}
                        className="h-9 text-center font-mono"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={processarEntradaLote}
                disabled={salvando || Object.keys(entradas).length === 0}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-bold text-primary-foreground disabled:opacity-60"
              >
                {salvando && <Loader2 className="size-4 animate-spin" />}
                Confirmar Entradas
              </button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={openInventario} onOpenChange={setOpenInventario}>
          <DialogTrigger className="flex items-center justify-center gap-2 rounded-xl bg-accent text-accent-foreground px-4 py-4 text-xs font-bold transition-transform active:scale-95 md:col-span-1">
            Realizar Inventário
            <Package className="size-4" />
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] max-w-[500px] overflow-y-auto rounded-2xl">
            <DialogHeader>
              <DialogTitle>Balanço de Estoque</DialogTitle>
              <DialogDescription>
                Auditoria física: informe a quantidade real contada no comitê.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="divide-y divide-border">
                {ativos.map((m) => {
                  const valorContado = inventario[m.id] !== undefined ? Number(inventario[m.id]) : null;
                  const diferenca = valorContado !== null ? valorContado - m.estoque : 0;
                  
                  return (
                    <div key={m.id} className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded bg-foreground/5">
                          {m.foto ? (
                            <img src={m.foto} alt="" className="h-full w-full object-cover" />
                          ) : (
                            (() => {
                              const Icon = iconeCategoria(m.categoria);
                              return <Icon className="size-4 text-muted-foreground" />;
                            })()
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold leading-tight">{m.nome}</p>
                          <p className="text-[10px] text-muted-foreground">{m.categoria}</p>
                        </div>
                        <div className="w-24">
                          <Input
                            inputMode="numeric"
                            placeholder={String(m.estoque)}
                            value={inventario[m.id] || ""}
                            onChange={(e) => setInventario({ ...inventario, [m.id]: e.target.value })}
                            className="h-9 text-center font-mono font-bold"
                          />
                        </div>
                      </div>
                      
                      {inventario[m.id] !== "" && inventario[m.id] !== undefined && (
                        <div className="mt-2 flex items-center justify-end gap-2 px-1">
                          <span className="text-[10px] font-bold uppercase text-muted-foreground">Diferença:</span>
                          <span className={`font-mono text-xs font-black ${diferenca > 0 ? "text-green-600" : diferenca < 0 ? "text-critical" : "text-muted-foreground"}`}>
                            {diferenca > 0 ? "+" : ""}{diferenca}
                          </span>
                          <span className="text-[10px] font-medium text-muted-foreground">
                            ({diferenca > 0 ? "sobra" : diferenca < 0 ? "quebra" : "ok"})
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <button
                onClick={processarInventarioFisico}
                disabled={salvando || Object.keys(inventario).length === 0}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-bold text-primary-foreground shadow-lg disabled:opacity-60"
              >
                {salvando && <Loader2 className="size-4 animate-spin" />}
                Salvar Inventário
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

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
                className={`flex size-11 shrink-0 items-center justify-center overflow-hidden rounded border border-border/50 ${critico ? "bg-critical/10 text-critical" : "bg-foreground/5"}`}
              >
                {m.foto ? (
                  <img src={m.foto} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Icon className="size-5" />
                )}
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
                    if (confirm(`Arquivar ${m.nome}? Ele não aparecerá mais nas listas ativas.`)) {
                      await archiveMaterial(m.id);
                      toast.success(`${m.nome} arquivado.`);
                    }
                  }}
                  aria-label={`Arquivar ${m.nome}`}
                  className="rounded-lg p-2 text-muted-foreground active:text-critical"
                >
                  <Archive className="size-4" />
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
  const { db, addKit, updateKit, archiveKit } = useStore();
  const { campaign } = useCampaignScope();
  const [open, setOpen] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [itens, setItens] = useState<KitItem[]>([]);

  const kitsAtivos = db.kits.filter(
    (k) => !k.arquivado && (!campaign?.id || !k.campaign_id || k.campaign_id === campaign.id)
  );
  const materiaisAtivos = db.materiais.filter(
    (m) => !m.arquivado && (!campaign?.id || !m.campaign_id || m.campaign_id === campaign.id)
  );

  function setQtd(material_id: string, quantidade: number) {
    setItens((prev) => {
      const outros = prev.filter((i) => i.material_id !== material_id);
      return quantidade > 0 ? [...outros, { material_id, quantidade }] : outros;
    });
  }

  function handleEdit(kit: Kit) {
    setEditingId(kit.id);
    setNome(kit.nome);
    setDescricao(kit.descricao);
    setItens(kit.itens);
    setOpen(true);
  }

  async function salvar() {
    if (!nome.trim() || itens.length === 0) {
      toast.error("Informe o nome e ao menos um item.");
      return;
    }
    setSalvando(true);
    if (editingId) {
      await updateKit(editingId, { nome, descricao, itens, campaign_id: campaign?.id || undefined });
      toast.success("Kit atualizado.");
    } else {
      await addKit({ nome, descricao, itens, campaign_id: campaign?.id || undefined });
      toast.success("Kit criado.");
    }
    setSalvando(false);
    setOpen(false);
    resetForm();
  }

  function resetForm() {
    setEditingId(null);
    setNome("");
    setDescricao("");
    setItens([]);
  }

  return (
    <div className="space-y-3">
      <Dialog open={open} onOpenChange={(val) => {
        setOpen(val);
        if (!val) resetForm();
      }}>
        <DialogTrigger className="flex w-full items-center justify-between rounded-xl bg-foreground px-6 py-4 font-bold text-background transition-transform active:scale-95">
          Compor Novo Kit
          <Plus className="size-5" strokeWidth={3} />
        </DialogTrigger>
        <DialogContent className="max-h-[85vh] max-w-[400px] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Kit" : "Composição de Kit"}</DialogTitle>
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
              {materiaisAtivos.map((m) => {
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
              {editingId ? "Salvar Alterações" : "Salvar Kit"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {kitsAtivos.map((k) => (
        <article key={k.id} className="rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <h2 className="flex items-center gap-2 font-bold leading-tight">
                <Package className="size-4 text-primary" />
                <span className="truncate">{k.nome}</span>
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">{k.descricao}</p>
            </div>
            <div className="flex gap-1 ml-2">
              <button
                onClick={() => handleEdit(k)}
                aria-label={`Editar ${k.nome}`}
                className="rounded-lg p-2 text-muted-foreground active:text-primary"
              >
                <Edit className="size-4" />
              </button>
              <button
                onClick={async () => {
                  if (confirm(`Arquivar ${k.nome}? Ele não aparecerá mais na composição de saídas.`)) {
                    await archiveKit(k.id);
                    toast.success(`${k.nome} arquivado.`);
                  }
                }}
                aria-label={`Arquivar ${k.nome}`}
                className="rounded-lg p-2 text-muted-foreground active:text-critical"
              >
                <Archive className="size-4" />
              </button>
            </div>
          </div>
          <ul className="mt-3 space-y-1 border-t border-border pt-3">
            {k.itens.map((i) => {
              const m = db.materiais.find((x) => x.id === i.material_id);
              return (
                <li key={i.material_id} className="flex justify-between text-xs">
                  <span className="text-muted-foreground truncate mr-2">{m?.nome ?? "Item removido"}</span>
                  <span className="font-mono font-bold shrink-0">{formatNumero(i.quantidade)}</span>
                </li>
              );
            })}
          </ul>
        </article>
      ))}
    </div>
  );
}

function Historico() {
  const { db } = useStore();
  const { campaign } = useCampaignScope();
  
  const materiaisMap = new Map(db.materiais.map((m) => [m.id, m]));

  const historico = [...(db.historico_estoque || [])]
    .filter((h) => {
      if (!campaign?.id) return true;
      if (h.campaign_id) return h.campaign_id === campaign.id;
      const mat = materiaisMap.get(h.material_id);
      return !mat?.campaign_id || mat.campaign_id === campaign.id;
    })
    .sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime());

  return (
    <div className="space-y-3">
      {historico.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center">
          <History className="mx-auto mb-3 size-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada.</p>
        </div>
      ) : (
        historico.map((m) => {
          const material = db.materiais.find((mat) => mat.id === m.material_id);
          const Icon = material ? iconeCategoria(material.categoria) : Package;
          
          return (
            <div
              key={m.id}
              className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4"
            >
              <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${
                m.tipo === 'ajuste_inventario' ? 'bg-accent/10 text-accent' :
                m.diferenca > 0 ? 'bg-green-100 text-green-600' : 'bg-critical/10 text-critical'
              }`}>
                <Icon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-bold">{material?.nome ?? 'Item Removido'}</p>
                  {m.tipo === 'ajuste_inventario' && (
                    <Badge variant="outline" className="h-4 rounded-sm border-accent/30 bg-accent/5 px-1 text-[8px] font-black uppercase text-accent">
                      Ajuste de Inventário
                    </Badge>
                  )}
                </div>
                <p className="text-[10px] font-medium text-muted-foreground">
                  {formatDataHora(m.criado_em)} • {m.observacao}
                </p>
              </div>
              <div className="text-right">
                <p className={`font-mono text-sm font-black ${
                  m.diferenca > 0 ? 'text-green-600' : m.diferenca < 0 ? 'text-critical' : 'text-muted-foreground'
                }`}>
                  {m.diferenca > 0 ? '+' : ''}{m.diferenca}
                </p>
                <p className="text-[9px] uppercase text-muted-foreground">
                  Saldo: {m.quantidade_nova}
                </p>
              </div>
            </div>
          );
        })
      )}
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
