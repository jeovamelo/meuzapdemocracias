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
  Target,
  QrCode,
  Download,
  Printer
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
  const [openQrModal, setOpenQrModal] = useState(false);

  const linkSolicitacao = typeof window !== "undefined" 
    ? `${window.location.origin}/public/solicitar?campanha=${campaign?.id || ""}&uf=${campaign?.uf || "CE"}&nr=${campaign?.numero || ""}`
    : `https://democracias.org/public/solicitar`;

  const mensagemWhatsApp = `Olá! 🚩 Acesse o link oficial da nossa campanha para solicitar materiais (adesivos, santinhos, bandeiras) e mobilizar sua região:\n\n👉 ${linkSolicitacao}\n\nPreencha seus dados e escolha seus materiais!`;

  const saidasFiltradas = (db.saidas || [])
    .filter((s) => !campaign?.id || !s.campaign_id || s.campaign_id === campaign.id)
    .sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime());

  const solicitacoesPendentes = (db.solicitacoes || [])
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

  const baixarQrCode = async () => {
    try {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=800x800&data=${encodeURIComponent(linkSolicitacao)}`;
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `qrcode-solicitar-${campaign?.numero || "campanha"}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      toast.success("Download do QR Code em alta resolução iniciado!");
    } catch (e) {
      toast.error("Não foi possível baixar o QR Code.");
    }
  };

  const imprimirQrCode = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Permita popups no navegador para imprimir o cartaz.");
      return;
    }
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(linkSolicitacao)}`;
    const nomeCandidato = campaign?.candidato_urna || campaign?.nomeUrna || "Campanha Oficial";
    const numeroCandidato = campaign?.numero ? `• ${campaign.numero}` : "";
    const ufCandidato = campaign?.uf ? `(${campaign.uf})` : "";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>Cartaz QR Code - Solicitar Materiais - ${nomeCandidato}</title>
          <style>
            @page { size: A4 portrait; margin: 15mm; }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              display: flex; 
              flex-direction: column; 
              align-items: center; 
              justify-content: center; 
              min-height: 95vh; 
              text-align: center; 
              color: #0f172a; 
              padding: 20px;
            }
            .card {
              border: 3px solid #0f172a;
              border-radius: 28px;
              padding: 36px 28px;
              max-width: 480px;
              width: 100%;
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .badge { 
              background: #ea580c; 
              color: #ffffff; 
              padding: 8px 20px; 
              border-radius: 9999px; 
              font-weight: 800; 
              font-size: 13px; 
              text-transform: uppercase; 
              letter-spacing: 1.5px; 
              display: inline-block;
              margin-bottom: 16px;
            }
            h1 { 
              font-size: 26px; 
              font-weight: 900; 
              color: #0f172a; 
              line-height: 1.2;
              margin-bottom: 4px;
            }
            .sub { 
              color: #64748b; 
              font-size: 15px; 
              margin-bottom: 24px; 
              font-weight: 600; 
            }
            .qr-container { 
              background: #ffffff; 
              border: 2px solid #e2e8f0; 
              padding: 16px; 
              border-radius: 20px; 
              box-shadow: 0 4px 12px rgba(0,0,0,0.06);
              margin-bottom: 24px;
            }
            .qr-container img { 
              width: 260px; 
              height: 260px; 
              display: block; 
            }
            .desc { 
              font-size: 17px; 
              font-weight: 800; 
              color: #0f172a; 
              max-width: 360px; 
              line-height: 1.4; 
              margin-bottom: 12px;
            }
            .link-text { 
              font-size: 11px; 
              color: #64748b; 
              font-family: monospace; 
              word-break: break-all;
              max-width: 380px;
            }
            .footer-brand {
              margin-top: 24px;
              font-size: 11px;
              color: #94a3b8;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <span class="badge">Mobilização Oficial</span>
            <h1>${nomeCandidato} ${numeroCandidato}</h1>
            <p class="sub">Portal de Solicitação de Materiais ${ufCandidato}</p>
            <div class="qr-container">
              <img src="${qrUrl}" alt="QR Code" />
            </div>
            <p class="desc">Aponte a câmera do celular no QR Code para solicitar materiais de campanha</p>
            <p class="link-text">${linkSolicitacao}</p>
            <p class="footer-brand">democracias.org • Plataforma Eleitoral</p>
          </div>
          <script>
            window.onload = () => {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
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

        {/* MODAL PRINCIPAL: LINK DE AUTO-SOLICITAÇÃO */}
        <Dialog open={openLinkModal} onOpenChange={setOpenLinkModal}>
          <DialogTrigger asChild>
            <button
              className="flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 hover:bg-primary/10 px-5 py-4 text-sm font-bold text-primary shadow-sm transition-all active:scale-95 cursor-pointer"
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
          <DialogContent className="max-w-md rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-extrabold">
                <Share2 className="size-5 text-orange-600" />
                Link de Auto-Solicitação
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Envie este link para apoiadores e lideranças solicitarem materiais diretamente para a campanha de {campaign?.nomeUrna || "Candidato"}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs break-all text-slate-700 select-all">
                {linkSolicitacao}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button 
                  onClick={copiarLink} 
                  style={{ backgroundColor: '#ea580c', color: '#ffffff' }}
                  className="w-full gap-2 font-bold shadow-sm hover:bg-orange-700 cursor-pointer"
                >
                  <Copy className="size-4" /> Copiar Link
                </Button>
                <a
                  href={whatsappLink("", mensagemWhatsApp)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#25D366] text-white font-bold text-sm shadow-sm hover:bg-[#128C7E] transition-all"
                >
                  <Send className="size-4" /> WhatsApp
                </a>
              </div>

              {/* OPÇÃO DEDICADA PARA IMPRESSÃO DE QR CODE */}
              <div className="pt-3 border-t border-slate-200/80 space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Impressão e Material Gráfico
                </p>
                <Button
                  variant="outline"
                  onClick={() => setOpenQrModal(true)}
                  className="w-full flex items-center justify-center gap-2 h-11 rounded-xl text-xs font-bold border-slate-300 hover:bg-slate-50 cursor-pointer text-slate-800"
                >
                  <QrCode className="size-4 text-orange-600" />
                  <span>Baixar / Imprimir QR Code para Papel</span>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* MODAL DEDICADO DE QR CODE PARA IMPRESSÃO */}
        <Dialog open={openQrModal} onOpenChange={setOpenQrModal}>
          <DialogContent className="max-w-md rounded-2xl p-6 text-center">
            <DialogHeader className="text-center sm:text-center">
              <DialogTitle className="flex items-center justify-center gap-2 text-base font-extrabold">
                <QrCode className="size-5 text-orange-600" />
                QR Code para Impressão
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Otimizado para impressão em panfletos, cartazes ou papéis de divulgação.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-3">
              {/* CARTAZ DE PREVIEW LIMPO */}
              <div className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3 shadow-sm text-center">
                <div className="inline-block bg-orange-500 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                  Mobilização Oficial
                </div>
                <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                  {campaign?.candidato_urna || campaign?.nomeUrna || "Campanha Oficial"} {campaign?.numero ? `• ${campaign.numero}` : ""}
                </h3>
                
                <div className="p-2 bg-white rounded-xl border border-slate-200 inline-block shadow-xs">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(linkSolicitacao)}`}
                    alt="QR Code de Solicitação"
                    className="size-48 mx-auto"
                  />
                </div>

                <p className="text-xs font-bold text-slate-800 max-w-xs mx-auto leading-tight">
                  Aponte a câmera do seu celular para solicitar materiais oficiais de campanha
                </p>
                <p className="text-[10px] text-slate-400 font-mono break-all line-clamp-1">
                  {linkSolicitacao}
                </p>
              </div>

              {/* BOTÕES DE AÇÃO */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={baixarQrCode}
                  variant="outline"
                  className="w-full gap-1.5 text-xs font-bold h-11 rounded-xl border-slate-300 hover:bg-slate-50 cursor-pointer text-slate-800"
                >
                  <Download className="size-4 text-slate-600" />
                  <span>Baixar Imagem PNG</span>
                </Button>
                <Button
                  onClick={imprimirQrCode}
                  style={{ backgroundColor: '#0f172a', color: '#ffffff' }}
                  className="w-full gap-1.5 text-xs font-bold h-11 rounded-xl hover:bg-slate-800 cursor-pointer"
                >
                  <Printer className="size-4 text-white" />
                  <span>Imprimir Cartaz</span>
                </Button>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              {saidasFiltradas.map((s) => {
                const pessoa = (db.pessoas || []).find((p) => p.id === s.pessoa_id);
                const comite = (db.comites || []).find((c) => c.id === s.comite_id);
                const totalUnidades = s.itens.reduce((acc, i) => acc + i.quantidade, 0);

                return (
                  <article
                    key={s.id}
                    className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-all hover:shadow-md"
                  >
                    <div className="flex items-center justify-between border-b border-border/50 bg-muted/5 px-4 py-2.5">
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <Clock className="size-3" />
                        {formatData(s.criado_em)} às {formatHora(s.criado_em)}
                        {s.numero_pedido && (
                          <span className="font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[9px] font-black">
                            {s.numero_pedido}
                          </span>
                        )}
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
                            <MapPin className="size-3 shrink-0" /> {comite?.nome || "Comitê Central / Sede"}
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
                        {(s.kits || []).map((k, idx) => {
                          const kit = (db.kits || []).find((x) => x.id === k.kit_id);
                          return (
                            <Badge key={idx} variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px]">
                              <Package className="size-2.5 mr-1" />
                              {k.quantidade}x {kit?.nome || "Kit"}
                            </Badge>
                          );
                        })}
                        {(s.itens || []).map((i, idx) => {
                          const m = (db.materiais || []).find((x) => x.id === i.material_id);
                          return (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 rounded-md bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground font-mono"
                            >
                              <strong>{i.quantidade}x</strong> {m?.nome || "Material"}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ABA: FILA DE PENDÊNCIAS */}
        <TabsContent value="pendentes" className="mt-4 pb-24">
          {solicitacoesPendentes.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface p-12 text-center">
              <CheckCircle2 className="mx-auto mb-3 size-10 text-success" />
              <p className="text-sm font-semibold text-foreground">Nenhuma solicitação pendente no momento!</p>
              <p className="text-xs text-muted-foreground mt-1">Todos os pedidos externos foram atendidos.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              {solicitacoesPendentes.map((sol) => {
                const lider = (db.pessoas || []).find((p) => p.id === sol.lideranca_id);
                const totalQtd = (sol.itens || []).reduce((acc, i) => acc + i.quantidade, 0);

                return (
                  <article
                    key={sol.id}
                    className="flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-surface shadow-sm hover:shadow-md transition-all"
                  >
                    {/* Card Content Wrapper */}
                    <div className="p-5 flex-1 space-y-4">
                      {/* Name of requester in bold/large font */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="size-2.5 rounded-full bg-critical animate-pulse shrink-0" />
                            <h3 className="font-extrabold text-base sm:text-lg text-foreground tracking-tight truncate leading-tight">
                              {sol.nome || lider?.nome || "Solicitante Avulso"}
                            </h3>
                          </div>
                          
                          {sol.numero_pedido && (
                            <span className="font-mono bg-orange-100 text-orange-800 border border-orange-200 px-2 py-0.5 rounded-lg text-[10px] font-black inline-block">
                              {sol.numero_pedido}
                            </span>
                          )}
                          
                          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                            <p className="flex items-center gap-1.5 font-medium">
                              <MapPin className="size-3.5 shrink-0 text-muted-foreground/80" /> 
                              <span className="truncate">
                                {sol.municipio || lider?.municipio || "CE"} {sol.endereco_entrega ? `• ${sol.endereco_entrega}` : ""}
                              </span>
                            </p>
                            {lider?.meta_votos && lider.meta_votos > 0 && (
                              <p className="font-bold text-orange-600 flex items-center gap-1.5">
                                <Target className="size-3.5 shrink-0 text-orange-600" />
                                <span>Meta de Mobilização: {formatNumero(lider.meta_votos)} votos</span>
                              </p>
                            )}
                          </div>
                        </div>

                        {lider?.telefone && (
                          <a
                            href={whatsappLink(lider.telefone)}
                            target="_blank"
                            rel="noreferrer"
                            title="Contato no WhatsApp"
                            className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366] hover:text-white transition-all shadow-xs"
                          >
                            <Send className="size-4" />
                          </a>
                        )}
                      </div>

                      {/* Chips/Tags List */}
                      <div className="flex flex-wrap gap-2 pt-3 border-t border-border/60">
                        {(sol.itens || []).map((i, idx) => {
                          const m = (db.materiais || []).find((x) => x.id === i.material_id);
                          return (
                            <div
                              key={idx}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-primary/5 hover:bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs font-bold text-primary transition-colors"
                            >
                              <span className="bg-primary text-primary-foreground px-1.5 py-0.5 rounded-md text-[10px] font-mono font-black">
                                {i.quantidade}x
                              </span>
                              <span className="truncate max-w-[200px]">{m?.nome || "Material"}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Edge-to-Edge Action Button */}
                    <button
                      disabled={despachandoId === sol.id}
                      onClick={() => handleDespachar(sol.id)}
                      className="w-full h-12 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-sm border-t border-green-700/20 cursor-pointer transition-all active:scale-[0.99] py-3.5"
                    >
                      <CheckCircle2 className="size-4" />
                      <span>{despachandoId === sol.id ? "Despachando..." : "Despachar e Baixar Estoque"}</span>
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
