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
  Printer,
  RotateCcw,
  AlertTriangle,
  FileText,
  Eye,
  Check,
  Loader2,
  Edit3,
  Pencil,
  Trash2,
  Minus,
  Save,
  X,
  Phone
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useStore } from "@/lib/store";
import { useCampaignScope } from "@/hooks/useCampaignScope";
import { formatData, formatHora, formatNumero, formatTelefone, whatsappLink, type Saida } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const { db, despacharSolicitacao, estornarSaida, editarSaida } = useStore();
  const { campaign } = useCampaignScope();
  const [despachandoId, setDespachandoId] = useState<string | null>(null);
  const [openLinkModal, setOpenLinkModal] = useState(false);
  const [openQrModal, setOpenQrModal] = useState(false);
  
  // Estado para visualização de detalhes e ações do histórico
  const [selectedSaida, setSelectedSaida] = useState<Saida | null>(null);
  const [confirmEstornoModal, setConfirmEstornoModal] = useState(false);
  const [estornando, setEstornando] = useState(false);

  // Estados de Edição da Saída
  const [isEditing, setIsEditing] = useState(false);
  const [editNome, setEditNome] = useState("");
  const [editMunicipio, setEditMunicipio] = useState("");
  const [editTelefone, setEditTelefone] = useState("");
  const [editComiteId, setEditComiteId] = useState("");
  const [editItens, setEditItens] = useState<{ material_id: string; quantidade: number }[]>([]);
  const [materialToAdd, setMaterialToAdd] = useState("");
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

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

  const comitesCampanha = (db.comites || []).filter(
    (c) => !campaign?.id || !c.campaign_id || c.campaign_id === campaign.id
  );

  const materiaisCampanha = (db.materiais || []).filter(
    (m) => !campaign?.id || !m.campaign_id || m.campaign_id === campaign.id
  );

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
    const nomeCandidato = (campaign as any)?.candidato_urna || campaign?.nomeUrna || "Campanha Oficial";
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

  const imprimirComprovanteSaida = (saida: Saida) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Permita popups no navegador para imprimir o comprovante.");
      return;
    }

    const pessoa = (db.pessoas || []).find((p) => p.id === saida.pessoa_id);
    const comite = (db.comites || []).find((c) => c.id === saida.comite_id);
    const totalUnidades = saida.itens.reduce((acc, i) => acc + i.quantidade, 0);
    const nomeCandidato = (campaign as any)?.candidato_urna || campaign?.nomeUrna || "Campanha Oficial";
    const numeroCandidato = campaign?.numero ? `• Nº ${campaign.numero}` : "";
    const ufCandidato = campaign?.uf ? `(${campaign.uf})` : "";
    const cargoCandidato = campaign?.cargo ? `• ${campaign.cargo}` : "";
    const numeroPedido = saida.numero_pedido || saida.id;
    const qrValidacaoUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`PEDIDO:${numeroPedido}|DEST:${pessoa?.nome || 'N/A'}|QTD:${totalUnidades}|DATA:${saida.criado_em}`)}`;

    const linhasItens = saida.itens.map((item, idx) => {
      const m = (db.materiais || []).find((x) => x.id === item.material_id);
      return `
        <tr>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace; font-size: 11px;">#${idx + 1}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-weight: 700; font-size: 12px;">${m?.nome || "Material"}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; color: #64748b;">${m?.categoria || "Geral"}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 800; font-size: 13px; font-family: monospace;">${item.quantidade.toLocaleString('pt-BR')} ${m?.unidade || "un"}</td>
        </tr>
      `;
    }).join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>Romaneio de Entrega - ${numeroPedido} - ${nomeCandidato}</title>
          <style>
            @page { size: A4 portrait; margin: 12mm; }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #0f172a; 
              padding: 15px;
              background: #ffffff;
            }
            .header-box {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #0f172a;
              padding-bottom: 12px;
              margin-bottom: 16px;
            }
            .brand {
              font-size: 18px;
              font-weight: 900;
              color: #ea580c;
              letter-spacing: -0.5px;
            }
            .title {
              font-size: 14px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-top: 2px;
            }
            .order-tag {
              background: #0f172a;
              color: #ffffff;
              padding: 6px 14px;
              border-radius: 8px;
              font-family: monospace;
              font-size: 13px;
              font-weight: 800;
              text-align: right;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 12px 16px;
              margin-bottom: 16px;
              font-size: 12px;
            }
            .info-item p { margin-bottom: 3px; }
            .info-item strong { color: #475569; font-size: 11px; text-transform: uppercase; }
            .info-item span { font-weight: 700; font-size: 13px; color: #0f172a; display: block; }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            th {
              background: #f1f5f9;
              padding: 8px 10px;
              text-align: left;
              font-size: 11px;
              font-weight: 800;
              text-transform: uppercase;
              color: #475569;
              border-bottom: 2px solid #cbd5e1;
            }
            .total-row {
              background: #fff7ed;
              font-weight: 900;
              font-size: 13px;
            }
            .term-box {
              background: #f8fafc;
              border-left: 4px solid #ea580c;
              padding: 10px 14px;
              font-size: 11px;
              color: #475569;
              line-height: 1.4;
              margin-bottom: 30px;
              border-radius: 0 8px 8px 0;
            }
            .signatures {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 30px;
              margin-top: 40px;
              padding-top: 10px;
            }
            .sign-line {
              border-top: 1.5px solid #0f172a;
              text-align: center;
              padding-top: 6px;
              font-size: 11px;
              font-weight: 700;
              color: #334155;
            }
            .sign-role {
              font-size: 10px;
              color: #64748b;
              font-weight: 500;
            }
            .footer-auth {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-top: 30px;
              padding-top: 10px;
              border-top: 1px dashed #cbd5e1;
              font-size: 10px;
              color: #94a3b8;
            }
            .qr-auth {
              width: 55px;
              height: 55px;
            }
          </style>
        </head>
        <body>
          <div class="header-box">
            <div>
              <div class="brand">🚩 Democracias • Gestão de Estoque</div>
              <div class="title">Romaneio e Comprovante de Entrega</div>
              <p style="font-size: 12px; color: #64748b; font-weight: 600; margin-top: 2px;">
                ${nomeCandidato} ${numeroCandidato} ${cargoCandidato} ${ufCandidato}
              </p>
            </div>
            <div class="order-tag">
              <div>PEDIDO</div>
              <div>${numeroPedido}</div>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-item">
              <strong>Responsável / Recebedor:</strong>
              <span>${pessoa?.nome || "Responsável não identificado"}</span>
              <p style="color: #64748b; font-size: 11px; margin-top: 2px;">
                ${pessoa?.funcao ? `${pessoa.funcao} • ` : ""}${pessoa?.municipio || comite?.municipio || "CE"}${pessoa?.cpf ? ` • CPF: ${pessoa.cpf}` : ""}
              </p>
            </div>
            <div class="info-item">
              <strong>Comitê / Local de Expedição:</strong>
              <span>${comite?.nome || "Comitê Central / Sede"}</span>
              <p style="color: #64748b; font-size: 11px; margin-top: 2px;">
                Data/Hora: ${formatData(saida.criado_em)} às ${formatHora(saida.criado_em)}
              </p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 40px;">Item</th>
                <th>Material</th>
                <th>Categoria</th>
                <th style="text-align: right; width: 110px;">Quantidade</th>
              </tr>
            </thead>
            <tbody>
              ${linhasItens}
              <tr class="total-row">
                <td colspan="3" style="padding: 10px; text-align: right; text-transform: uppercase; font-weight: 900; border-top: 2px solid #fdba74;">Total Despachado:</td>
                <td style="padding: 10px; text-align: right; font-family: monospace; font-size: 14px; border-top: 2px solid #fdba74; color: #ea580c;">${totalUnidades.toLocaleString('pt-BR')} itens</td>
              </tr>
            </tbody>
          </table>

          <div class="term-box">
            <strong>Termo de Responsabilidade e Recebimento:</strong><br />
            Declaro ter recebido em perfeitas condições os materiais de campanha eleitoral discriminados neste romaneio, responsabilizando-me pela guarda, distribuição e correta utilização conforme a legislação eleitoral vigente.
          </div>

          <div class="signatures">
            <div>
              <div class="sign-line">${pessoa?.nome || "Assinatura do Recebedor"}</div>
              <div class="sign-role">Responsável / Recebedor (${pessoa?.funcao || "Membro de Campanha"})</div>
            </div>
            <div>
              <div class="sign-line">Expedição / Almoxarifado Central</div>
              <div class="sign-role">Responsável pelo Despacho de Estoque</div>
            </div>
          </div>

          <div class="footer-auth">
            <div>
              <p>Autenticação do Sistema Democracias • Emissão: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}</p>
              <p style="font-family: monospace;">ID: ${saida.id}</p>
            </div>
            <img class="qr-auth" src="${qrValidacaoUrl}" alt="QR de Validação" />
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

  const gerarMensagemComprovante = (saida: Saida) => {
    const pessoa = (db.pessoas || []).find((p) => p.id === saida.pessoa_id);
    const totalUnidades = saida.itens.reduce((acc, i) => acc + i.quantidade, 0);
    const numeroPedido = saida.numero_pedido || saida.id;
    const nomeCandidato = (campaign as any)?.candidato_urna || campaign?.nomeUrna || "Campanha Oficial";

    const lista = saida.itens.map(i => {
      const m = (db.materiais || []).find(x => x.id === i.material_id);
      return `▪️ ${i.quantidade}x ${m?.nome || 'Material'}`;
    }).join('\n');

    return `🚩 *COMPROVANTE DE ENTREGA DE MATERIAL*\n*Campanha:* ${nomeCandidato}\n*Pedido:* ${numeroPedido}\n*Data:* ${formatData(saida.criado_em)} às ${formatHora(saida.criado_em)}\n*Destinatário:* ${pessoa?.nome || 'Responsável'}\n*Total:* ${totalUnidades} itens\n\n📦 *Itens Entregues:*\n${lista}\n\n✅ _Materiais conferidos e baixados do estoque oficial da campanha._`;
  };

  const handleConfirmarEstorno = async () => {
    if (!selectedSaida) return;
    setEstornando(true);
    try {
      await estornarSaida(selectedSaida.id);
      setConfirmEstornoModal(false);
      setSelectedSaida(null);
      setIsEditing(false);
    } catch (e) {
      console.error(e);
    } finally {
      setEstornando(false);
    }
  };

  // Funções de Gerenciamento da Edição
  const iniciarEdicao = (saida: Saida) => {
    const pessoa = (db.pessoas || []).find((p) => p.id === saida.pessoa_id);
    setEditNome(pessoa?.nome || "");
    setEditMunicipio(pessoa?.municipio || "");
    setEditTelefone(pessoa?.telefone || "");
    setEditComiteId(saida.comite_id || db.comites[0]?.id || "");
    setEditItens((saida.itens || []).map(i => ({ material_id: i.material_id, quantidade: i.quantidade })));
    setMaterialToAdd("");
    setIsEditing(true);
  };

  const cancelarEdicao = () => {
    setIsEditing(false);
  };

  const handleAddMaterial = () => {
    if (!materialToAdd) return;
    if (editItens.some(i => i.material_id === materialToAdd)) {
      toast.info("Este material já está incluído no pedido.");
      return;
    }
    setEditItens(prev => [...prev, { material_id: materialToAdd, quantidade: 1 }]);
    setMaterialToAdd("");
  };

  const handleUpdateQtd = (matId: string, delta: number) => {
    setEditItens(prev => prev.map(i => {
      if (i.material_id === matId) {
        return { ...i, quantidade: Math.max(1, i.quantidade + delta) };
      }
      return i;
    }));
  };

  const handleSetQtd = (matId: string, val: number) => {
    setEditItens(prev => prev.map(i => {
      if (i.material_id === matId) {
        return { ...i, quantidade: Math.max(0, val) };
      }
      return i;
    }));
  };

  const handleRemoveItem = (matId: string) => {
    setEditItens(prev => prev.filter(i => i.material_id !== matId));
  };

  const salvarEdicao = async () => {
    if (!selectedSaida) return;
    const itensValidos = editItens.filter(i => i.quantidade > 0);
    if (itensValidos.length === 0) {
      toast.error("O pedido deve conter pelo menos 1 material com quantidade válida.");
      return;
    }

    setSalvandoEdicao(true);
    try {
      await editarSaida(selectedSaida.id, {
        pessoa_nome: editNome.trim(),
        pessoa_municipio: editMunicipio.trim(),
        pessoa_telefone: editTelefone.trim(),
        comite_id: editComiteId,
        itens: itensValidos
      });

      // Atualizar o selectedSaida com os novos valores
      setSelectedSaida(prev => prev ? {
        ...prev,
        comite_id: editComiteId,
        itens: itensValidos
      } : null);

      setIsEditing(false);
    } catch (e) {
      console.error("Erro ao salvar edição:", e);
    } finally {
      setSalvandoEdicao(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Logística de Campanha"
        title="Saídas e Entregas"
        right={
          <span className="font-mono text-xs text-muted-foreground font-bold bg-surface px-3 py-1.5 rounded-xl border border-border">
            {saidasFiltradas.length} SAÍDAS • {solicitacoesPendentes.length} PENDENTES
          </span>
        }
      />

      <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          to="/saidas/nova"
          className="flex items-center justify-between rounded-2xl bg-foreground px-5 py-4 text-sm font-bold text-background shadow-md transition-transform active:scale-95 hover:bg-foreground/90"
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
                  {(campaign as any)?.candidato_urna || campaign?.nomeUrna || "Campanha Oficial"} {campaign?.numero ? `• ${campaign.numero}` : ""}
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

      <Tabs defaultValue="historico" className="px-5 pb-24">
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
                const totalUnidades = (s.itens || []).reduce((acc, i) => acc + i.quantidade, 0);

                return (
                  <article
                    key={s.id}
                    onClick={() => {
                      setIsEditing(false);
                      setSelectedSaida(s);
                    }}
                    className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border bg-surface shadow-xs transition-all hover:border-primary/50 hover:shadow-md active:scale-[0.995]"
                  >
                    <div className="flex items-center justify-between border-b border-border/50 bg-muted/5 px-4 py-2.5">
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <Clock className="size-3 text-muted-foreground/80" />
                        {formatData(s.criado_em)} às {formatHora(s.criado_em)}
                        {s.numero_pedido && (
                          <span className="font-mono bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded text-[9px] font-black">
                            {s.numero_pedido}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-black uppercase text-primary">
                          {formatNumero(totalUnidades)} ITENS
                        </span>
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-primary flex items-center gap-0.5">
                          <Eye className="size-3" /> Ver
                        </span>
                      </div>
                    </div>

                    <div className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          <ArrowRightLeft className="size-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold leading-tight text-sm group-hover:text-primary transition-colors">
                            {pessoa?.nome || "Responsável não identificado"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {pessoa?.funcao ? `${pessoa.funcao} • ` : ""}{pessoa?.municipio || comite?.municipio || "CE"}
                          </p>
                          <p className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5 truncate">
                            <MapPin className="size-3 shrink-0" /> {comite?.nome || "Comitê Central / Sede"}
                          </p>
                        </div>
                        {pessoa?.telefone && (
                          <a
                            href={whatsappLink(pessoa.telefone)}
                            onClick={(e) => e.stopPropagation()}
                            target="_blank"
                            rel="noreferrer"
                            title="Contato no WhatsApp"
                            className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#25D366]/15 text-[#128C7E] hover:bg-[#25D366] hover:text-white transition-all shadow-xs"
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

      {/* MODAL DE DETALHES E GESTÃO DA SAÍDA SELECIONADA */}
      <Dialog 
        open={!!selectedSaida} 
        onOpenChange={(open) => {
          if (!open) {
            setSelectedSaida(null);
            setIsEditing(false);
          }
        }}
      >
        {selectedSaida && (() => {
          const pessoa = (db.pessoas || []).find((p) => p.id === selectedSaida.pessoa_id);
          const comite = (db.comites || []).find((c) => c.id === selectedSaida.comite_id);
          const totalUnidades = (selectedSaida.itens || []).reduce((acc, i) => acc + i.quantidade, 0);
          const editTotalUnidades = editItens.reduce((acc, i) => acc + (Number(i.quantidade) || 0), 0);
          const msgWhats = gerarMensagemComprovante(selectedSaida);
          const linkWhats = pessoa?.telefone 
            ? whatsappLink(pessoa.telefone, msgWhats)
            : whatsappLink("", msgWhats);

          const materiaisDisponiveisParaAdicionar = materiaisCampanha.filter(
            m => !editItens.some(i => i.material_id === m.id)
          );

          return (
            <DialogContent className="max-w-lg rounded-2xl p-6 max-h-[92vh] overflow-y-auto">
              {/* MODO DE EDIÇÃO ATIVO */}
              {isEditing ? (
                <div className="space-y-4">
                  <DialogHeader>
                    <div className="flex items-center justify-between gap-2 pb-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide">
                          <Pencil className="size-3" /> Modo de Edição
                        </span>
                        {selectedSaida.numero_pedido && (
                          <span className="font-mono bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-full text-[11px] font-black">
                            {selectedSaida.numero_pedido}
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-xs font-black text-primary">
                        {formatNumero(editTotalUnidades)} ITENS
                      </span>
                    </div>
                    <DialogTitle className="text-xl font-extrabold text-foreground leading-tight">
                      Editar Saída de Material
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                      Modifique o responsável, destino ou as quantidades dos itens. O estoque será recalculado automaticamente ao salvar.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 pt-1">
                    {/* FORMULÁRIO DE DADOS DO DESTINATÁRIO */}
                    <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <User className="size-3 text-primary" /> Destinatário & Local de Entrega
                      </p>

                      <div className="space-y-2.5">
                        <div>
                          <Label className="text-xs font-bold text-muted-foreground">Nome do Responsável</Label>
                          <Input
                            value={editNome}
                            onChange={(e) => setEditNome(e.target.value)}
                            placeholder="Ex: João da Silva"
                            className="mt-1 h-9 text-xs rounded-xl bg-surface"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs font-bold text-muted-foreground">Cidade / Região</Label>
                            <Input
                              value={editMunicipio}
                              onChange={(e) => setEditMunicipio(e.target.value)}
                              placeholder="Ex: Fortaleza"
                              className="mt-1 h-9 text-xs rounded-xl bg-surface"
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-bold text-muted-foreground">Telefone / WhatsApp</Label>
                            <Input
                              value={editTelefone}
                              onChange={(e) => setEditTelefone(e.target.value)}
                              placeholder="(85) 99999-9999"
                              className="mt-1 h-9 text-xs rounded-xl bg-surface"
                            />
                          </div>
                        </div>

                        <div>
                          <Label className="text-xs font-bold text-muted-foreground">Comitê / Local de Expedição</Label>
                          <Select value={editComiteId} onValueChange={setEditComiteId}>
                            <SelectTrigger className="mt-1 h-9 text-xs rounded-xl bg-surface">
                              <SelectValue placeholder="Selecione o comitê" />
                            </SelectTrigger>
                            <SelectContent>
                              {comitesCampanha.map((c) => (
                                <SelectItem key={c.id} value={c.id} className="text-xs font-medium">
                                  {c.nome} ({c.municipio || "Sede"})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* EDIÇÃO DE MATERIAIS E QUANTIDADES */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Package className="size-3.5 text-primary" />
                          <span>Itens do Pedido ({editItens.length})</span>
                        </p>
                      </div>

                      {/* LISTA DE MATERIAIS NO PEDIDO */}
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {editItens.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                            Nenhum material no pedido. Adicione materiais abaixo.
                          </div>
                        ) : (
                          editItens.map((item) => {
                            const mat = (db.materiais || []).find((x) => x.id === item.material_id);
                            // Calcular estoque virtual disponível considerando o que já estava neste pedido
                            const qtdOriginal = (selectedSaida.itens || []).find(i => i.material_id === item.material_id)?.quantidade || 0;
                            const estoqueDisponivelTotal = (mat?.estoque || 0) + qtdOriginal;

                            return (
                              <div
                                key={item.material_id}
                                className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface p-2.5 shadow-2xs"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="font-bold text-xs text-foreground truncate">{mat?.nome || "Material"}</p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {mat?.categoria || "Geral"} • Disponível: <strong className="font-mono text-primary">{estoqueDisponivelTotal}</strong> {mat?.unidade || "un"}
                                  </p>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateQtd(item.material_id, -1)}
                                    className="flex size-7 items-center justify-center rounded-lg border border-border bg-muted/30 text-foreground font-bold text-xs hover:bg-muted active:scale-95 transition-all cursor-pointer"
                                  >
                                    <Minus className="size-3" />
                                  </button>

                                  <Input
                                    type="number"
                                    min="0"
                                    value={item.quantidade === 0 ? "" : item.quantidade}
                                    onChange={(e) => handleSetQtd(item.material_id, parseInt(e.target.value, 10) || 0)}
                                    className="h-7 w-16 text-center font-mono font-bold text-xs rounded-lg px-1 bg-surface"
                                  />

                                  <button
                                    type="button"
                                    onClick={() => handleUpdateQtd(item.material_id, 1)}
                                    className="flex size-7 items-center justify-center rounded-lg border border-border bg-muted/30 text-foreground font-bold text-xs hover:bg-muted active:scale-95 transition-all cursor-pointer"
                                  >
                                    <Plus className="size-3" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleRemoveItem(item.material_id)}
                                    title="Remover material do pedido"
                                    className="flex size-7 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 transition-colors ml-1 cursor-pointer"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* SELETOR PARA ADICIONAR NOVO MATERIAL AO PEDIDO */}
                      {materiaisDisponiveisParaAdicionar.length > 0 && (
                        <div className="flex gap-2 pt-1">
                          <Select value={materialToAdd} onValueChange={setMaterialToAdd}>
                            <SelectTrigger className="h-9 text-xs rounded-xl bg-surface flex-1">
                              <SelectValue placeholder="+ Incluir outro material..." />
                            </SelectTrigger>
                            <SelectContent>
                              {materiaisDisponiveisParaAdicionar.map((m) => (
                                <SelectItem key={m.id} value={m.id} className="text-xs">
                                  {m.nome} ({m.estoque} em estoque)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={handleAddMaterial}
                            disabled={!materialToAdd}
                            className="h-9 px-3 rounded-xl text-xs font-bold shrink-0 cursor-pointer"
                          >
                            <Plus className="size-3.5 mr-1" /> Adicionar
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* BOTÕES DE SALVAR / CANCELAR EDIÇÃO */}
                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={cancelarEdicao}
                        disabled={salvandoEdicao}
                        className="w-full rounded-xl text-xs font-bold h-11 cursor-pointer"
                      >
                        <X className="size-3.5 mr-1.5" /> Cancelar
                      </Button>
                      <Button
                        type="button"
                        onClick={salvarEdicao}
                        disabled={salvandoEdicao}
                        style={{ backgroundColor: '#ea580c', color: '#ffffff' }}
                        className="w-full rounded-xl text-xs font-bold h-11 hover:bg-orange-700 shadow-sm cursor-pointer"
                      >
                        {salvandoEdicao ? (
                          <>
                            <Loader2 className="size-3.5 animate-spin mr-1.5" /> Salvando...
                          </>
                        ) : (
                          <>
                            <Save className="size-3.5 mr-1.5" /> Salvar Alterações
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                /* MODO DE VISUALIZAÇÃO PADRÃO COM BOTÃO EDITAR */
                <div className="space-y-4">
                  <DialogHeader>
                    <div className="flex items-center justify-between gap-2 pb-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide">
                          <Check className="size-3" /> Despacho Concluído
                        </span>
                        {selectedSaida.numero_pedido && (
                          <span className="font-mono bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-full text-[11px] font-black">
                            {selectedSaida.numero_pedido}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-primary">
                          {formatNumero(totalUnidades)} ITENS
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => iniciarEdicao(selectedSaida)}
                          className="h-7 px-2.5 rounded-lg text-xs font-bold text-primary border-primary/30 hover:bg-primary/10 hover:border-primary transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Pencil className="size-3" />
                          <span>Editar</span>
                        </Button>
                      </div>
                    </div>
                    <DialogTitle className="text-xl font-extrabold text-foreground leading-tight">
                      Detalhes da Saída de Material
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                      Registrado em {formatData(selectedSaida.criado_em)} às {formatHora(selectedSaida.criado_em)}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 pt-1">
                    {/* DADOS DO DESTINATÁRIO E COMITÊ */}
                    <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Destinatário / Responsável</p>
                          <p className="text-base font-extrabold text-foreground leading-tight">
                            {pessoa?.nome || "Responsável não cadastrado"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {pessoa?.funcao ? `${pessoa.funcao} • ` : ""}{pessoa?.municipio || comite?.municipio || "CE"}
                            {pessoa?.telefone ? ` • Tel: ${formatTelefone(pessoa.telefone)}` : ""}
                          </p>
                        </div>

                        {pessoa?.telefone && (
                          <a
                            href={linkWhats}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#25D366] text-white font-bold text-xs shadow-xs hover:bg-[#128C7E] transition-all shrink-0"
                          >
                            <Send className="size-3.5" />
                            <span>WhatsApp</span>
                          </a>
                        )}
                      </div>

                      <div className="pt-2.5 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5 font-medium">
                          <MapPin className="size-3.5 text-primary" />
                          Origem: {comite?.nome || "Comitê Central / Sede"}
                        </span>
                        <span className="font-mono text-[11px]">
                          {selectedSaida.id.slice(0, 8)}...
                        </span>
                      </div>
                    </div>

                    {/* LISTAGEM DETALHADA DOS ITENS */}
                    <div className="space-y-2">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                        <span>Materiais Despachados</span>
                        <span className="font-mono font-bold text-primary">{selectedSaida.itens.length} tipos de itens</span>
                      </p>

                      <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                        {selectedSaida.itens.map((item, idx) => {
                          const m = (db.materiais || []).find((x) => x.id === item.material_id);
                          return (
                            <div
                              key={idx}
                              className="flex items-center justify-between rounded-xl border border-border/80 bg-surface px-3.5 py-2.5 text-xs shadow-2xs"
                            >
                              <div className="min-w-0 flex-1 pr-2">
                                <p className="font-bold text-foreground truncate">{m?.nome || "Material"}</p>
                                <p className="text-[10px] text-muted-foreground">{m?.categoria || "Geral"}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="font-mono font-black text-sm text-primary">
                                  {item.quantidade.toLocaleString('pt-BR')}
                                </span>
                                <span className="text-[10px] text-muted-foreground ml-1">{m?.unidade || "un"}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* BOTÕES DE AÇÃO: IMPRIMIR ROMANEIO, COMPARTILHAR E ESTORNO */}
                    <div className="pt-3 border-t border-border space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          onClick={() => imprimirComprovanteSaida(selectedSaida)}
                          style={{ backgroundColor: '#0f172a', color: '#ffffff' }}
                          className="w-full gap-2 font-bold text-xs h-11 rounded-xl shadow-xs hover:bg-slate-800 cursor-pointer"
                        >
                          <Printer className="size-4 text-white" />
                          <span>Imprimir Romaneio</span>
                        </Button>
                        <a
                          href={linkWhats}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-[#25D366] text-white font-bold text-xs shadow-xs hover:bg-[#128C7E] transition-all"
                        >
                          <Send className="size-4" />
                          <span>Enviar Comprovante</span>
                        </a>
                      </div>

                      <Button
                        variant="outline"
                        onClick={() => setConfirmEstornoModal(true)}
                        className="w-full gap-2 font-bold text-xs h-10 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive cursor-pointer transition-colors"
                      >
                        <RotateCcw className="size-3.5" />
                        <span>Estornar Saída e Devolver ao Estoque</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          );
        })()}
      </Dialog>

      {/* MODAL DE CONFIRMAÇÃO DE ESTORNO */}
      <Dialog open={confirmEstornoModal} onOpenChange={setConfirmEstornoModal}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <AlertTriangle className="size-6" />
            </div>
            <DialogTitle className="text-center text-lg font-extrabold text-foreground">
              Confirmar Estorno de Saída?
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-muted-foreground">
              Esta ação irá cancelar o pedido{" "}
              <strong>{selectedSaida?.numero_pedido || selectedSaida?.id}</strong> e devolver{" "}
              <strong>
                {(selectedSaida?.itens || []).reduce((acc, i) => acc + i.quantidade, 0).toLocaleString("pt-BR")} unidades
              </strong>{" "}
              de volta ao estoque dos respectivos materiais.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="grid grid-cols-2 gap-2 pt-3">
            <Button
              variant="outline"
              onClick={() => setConfirmEstornoModal(false)}
              className="w-full rounded-xl text-xs font-bold"
            >
              Cancelar
            </Button>
            <Button
              disabled={estornando}
              onClick={handleConfirmarEstorno}
              className="w-full rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-bold gap-1.5"
            >
              {estornando ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" /> Estornando...
                </>
              ) : (
                <>
                  <RotateCcw className="size-3.5" /> Confirmar Estorno
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
