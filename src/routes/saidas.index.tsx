import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { 
  ArrowRightLeft, 
  Plus, 
  Share2, 
  Clock, 
  MapPin, 
  User, 
  Package, 
  CheckCircle2, 
  Send, 
  Copy, 
  ExternalLink,
  Truck,
  Target
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useStore } from "@/lib/store";
import { useCampaignScope } from "@/hooks/useCampaignScope";
import { formatData, formatHora, formatNumero, formatTelefone, whatsappLink } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/saidas/")({
  head: () => ({
    meta: [
      { title: "Logística e Saídas — Estoque de Campanha" },
      {
        name: "description",
        content:
          "Histórico de saídas de material, baixa de estoque e fila de solicitações externas de campanha.",
      },
      { property: "og:title", content: "Logística e Saídas — Estoque de Campanha" },
      {
        property: "og:description",
        content: "Controle de entregas, histórico de retiradas e fila de pedidos pendentes.",
      },
    ],
  }),
  component: SaidasPage,
});

function SaidasPage() {
  const { db, despacharSolicitacao } = useStore();
  const { campaign } = useCampaignScope();
  const [despachandoId, setDespachandoId] = useState<string | null>(null);
  const [openLinkModal, setOpenLinkModal] = useState(false);

  const linkSolicitacao = typeof window !== "undefined" 
    ? `${window.location.origin}/public/solicitar?campanha=${campaign?.id || ""}&uf=${campaign?.uf || "CE"}&nr=${campaign?.numero || ""}`
    : `https://democracias.org/public/solicitar`;

  const mensagemWhatsApp = `Olá! 🚩 Acesse o link oficial da nossa campanha para solicitar materiais (adesivos, santinhos, bandeiras) e mobilizar sua região:\n\n👉 ${linkSolicitacao}\n\nPreencha seus dados e escolha seus materiais!`;

  const saidasFiltradas = db.saidas
    .filter((s) => !campaign?.id || !s.campaign_id || s.campaign_id === campaign.id)
    .sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime());

  const solicitacoesPendentes = db.solicitacoes
    .filter((s) => (!campaign?.id || !s.campaign_id || s.campaign_id === campaign.id) && s.status !== "entregue" && s.status !== "cancelado")
    .sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime());

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(linkSolicitacao);
      toast.success("Link de solicitação copiado para a área de transferência!");
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  };

  const handleDespachar = async (solicitacaoId: string) => {
    setDespachandoId(solicitacaoId);
    try {
      await despacharSolicitacao(solicitacaoId);
    } finally {
      setDespachandoId(null);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Logística de Campanha"
        title="Saídas e Entregas"
        right={
          <span className="font-mono text-xs text-muted-foreground">
            {saidasFiltradas.length} SAÍDAS • {solicitacoesPendentes.length} PENDENTES
          </span>
        }
      />

      <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          to="/saidas/nova"
          className="flex items-center justify-between rounded-2xl bg-foreground px-5 py-4 text-sm font-bold text-background shadow-md transition-transform active:scale-95"
        >
          <div className="flex items-center gap-2">
            <Plus className="size-4" strokeWidth={3} />
            <span>Nova Saída de Material</span>
          </div>
          <span className="text-xs opacity-75">Check-out Rápido →</span>
        </Link>

        <Dialog open={openLinkModal} onOpenChange={setOpenLinkModal}>
          <DialogTrigger asChild>
            <button
              className="flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 hover:bg-primary/10 px-5 py-4 text-sm font-bold text-primary shadow-sm transition-all active:scale-95"
            >
              <div className="flex items-center gap-2">
                <Share2 className="size-4" />
                <span>Link de Solicitação Externa</span>
              </div>
              <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-mono uppercase">
                WhatsApp
              </span>
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Share2 className="size-5 text-primary" />
                Link de Auto-Solicitação
              </DialogTitle>
              <DialogDescription>
                Envie este link para apoiadores e lideranças solicitarem materiais diretamente para a campanha de {campaign?.nomeUrna || "Candidato"}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="rounded-xl border border-border bg-surface p-3 font-mono text-xs break-all text-muted-foreground">
                {linkSolicitacao}
              </div>
              <div className="flex gap-2">
                <Button onClick={copiarLink} className="flex-1 gap-2 font-bold">
                  <Copy className="size-4" /> Copiar Link
                </Button>
                <a
                  href={whatsappLink("", mensagemWhatsApp)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#25D366] text-white font-bold text-sm shadow-sm hover:bg-[#128C7E] transition-all"
                >
                  <Send className="size-4" /> WhatsApp
                </a>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="historico" className="px-5 pb-20">
        <TabsList className="grid w-full grid-cols-2 rounded-xl bg-surface p-1">
          <TabsTrigger value="historico" className="rounded-lg text-xs font-bold">
            Histórico de Saídas ({saidasFiltradas.length})
          </TabsTrigger>
          <TabsTrigger value="pendentes" className="rounded-lg text-xs font-bold relative">
            Fila de Pendências
            {solicitacoesPendentes.length > 0 && (
              <span className="ml-1.5 rounded-full bg-critical text-critical-foreground px-1.5 py-0.2 text-[9px] font-mono font-bold">
                {solicitacoesPendentes.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ABA: HISTÓRICO DE SAÍDAS */}
        <TabsContent value="historico" className="mt-4 space-y-3">
          {saidasFiltradas.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface p-12 text-center">
              <Package className="mx-auto mb-3 size-10 text-muted-foreground/30" />
              <p className="text-sm font-semibold text-muted-foreground">Nenhuma saída registrada ainda.</p>
              <p className="text-xs text-muted-foreground mt-1">Clique em "Nova Saída de Material" para dar baixa.</p>
            </div>
          ) : (
            saidasFiltradas.map((s) => {
              const pessoa = db.pessoas.find((p) => p.id === s.pessoa_id);
              const comite = db.comites.find((c) => c.id === s.comite_id);
              const totalUnidades = s.itens.reduce((acc, i) => acc + i.quantidade, 0);

              return (
                <article
                  key={s.id}
                  className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-all hover:shadow-md"
                >
                  <div className="flex items-center justify-between border-b border-border/50 bg-muted/5 px-4 py-2.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <Clock className="size-3" />
                      {formatData(s.criado_em)} às {formatHora(s.criado_em)}
                    </div>
                    <span className="font-mono text-[10px] font-black uppercase text-primary">
                      {formatNumero(totalUnidades)} ITENS
                    </span>
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <ArrowRightLeft className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold leading-tight text-sm">{pessoa?.nome || "Responsável não identificado"}</p>
                        <p className="text-xs text-muted-foreground">
                          {pessoa?.funcao ? `${pessoa.funcao} • ` : ""}{pessoa?.municipio || comite?.municipio || "CE"}
                        </p>
                        <p className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                          <MapPin className="size-3 shrink-0" /> {comite?.nome || "Comitê Central"}
                        </p>
                      </div>
                      {pessoa?.telefone && (
                        <a
                          href={whatsappLink(pessoa.telefone)}
                          target="_blank"
                          rel="noreferrer"
                          title="Contato no WhatsApp"
                          className="flex size-8 items-center justify-center rounded-lg bg-[#25D366]/15 text-[#128C7E] hover:bg-[#25D366] hover:text-white transition-all shadow-sm"
                        >
                          <Send className="size-3.5" />
                        </a>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/50">
                      {s.kits.map((k, idx) => {
                        const kit = db.kits.find((x) => x.id === k.kit_id);
                        return (
                          <Badge key={idx} variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px]">
                            <Package className="size-2.5 mr-1" />
                            {k.quantidade}x {kit?.nome || "Kit"}
                          </Badge>
                        );
                      })}
                      {s.itens.map((i, idx) => {
                        const m = db.materiais.find((x) => x.id === i.material_id);
                        return (
                          <Badge key={idx} variant="secondary" className="text-[10px]">
                            {formatNumero(i.quantidade)} {m?.unidade || "un"} {m?.nome || "Item"}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </TabsContent>

        {/* ABA: FILA DE PENDÊNCIAS */}
        <TabsContent value="pendentes" className="mt-4 space-y-3">
          {solicitacoesPendentes.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface p-12 text-center">
              <CheckCircle2 className="mx-auto mb-3 size-10 text-green-500/40" />
              <p className="text-sm font-semibold text-muted-foreground">Nenhuma solicitação pendente.</p>
              <p className="text-xs text-muted-foreground mt-1">Todos os pedidos externos foram despachados!</p>
            </div>
          ) : (
            solicitacoesPendentes.map((sol) => {
              const pessoaVinculada = db.pessoas.find(p => p.id === sol.lideranca_id || p.nome === sol.nome);
              const totalItens = sol.itens.reduce((acc, i) => acc + i.quantidade, 0);

              return (
                <article
                  key={sol.id}
                  className="overflow-hidden rounded-2xl border border-amber-500/30 bg-surface shadow-sm"
                >
                  <div className="flex items-center justify-between border-b border-border/50 bg-amber-500/5 px-4 py-2.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                      <Clock className="size-3" />
                      Solicitado em {formatData(sol.criado_em)}
                    </div>
                    <Badge className="bg-amber-500 text-white font-bold text-[9px] uppercase">
                      Pendente de Envio
                    </Badge>
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-sm leading-tight">{sol.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {sol.municipio || "Município não informado"}
                          {sol.endereco_entrega ? ` • ${sol.endereco_entrega}` : ""}
                        </p>
                        {pessoaVinculada?.meta_votos ? (
                          <p className="flex items-center gap-1 text-xs font-bold text-primary mt-1">
                            <Target className="size-3.5" />
                            Compromisso de Mobilização: {formatNumero(pessoaVinculada.meta_votos)} votos
                          </p>
                        ) : null}
                      </div>

                      <div className="text-right">
                        <span className="font-mono text-xs font-black text-muted-foreground">
                          {formatNumero(totalItens)} itens
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 rounded-xl border border-border bg-background p-3">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground">Materiais Pedidos:</p>
                      {sol.itens.map((item, idx) => {
                        const m = db.materiais.find(mat => mat.id === item.material_id);
                        return (
                          <div key={idx} className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground">{m?.nome || "Material"}</span>
                            <span className="font-mono font-bold">{formatNumero(item.quantidade)} {m?.unidade || "un"}</span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        onClick={() => handleDespachar(sol.id)}
                        disabled={despachandoId === sol.id}
                        className="flex-1 gap-2 font-bold bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Truck className="size-4" />
                        {despachandoId === sol.id ? "Baixando Estoque..." : "Despachar e Baixar Estoque"}
                      </Button>
                      {pessoaVinculada?.telefone && (
                        <a
                          href={whatsappLink(pessoaVinculada.telefone, `Olá ${sol.nome}! Estamos preparando seu material de campanha.`)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex size-10 items-center justify-center rounded-xl bg-[#25D366] text-white hover:bg-[#128C7E] transition-all shadow-sm"
                        >
                          <Send className="size-4" />
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
