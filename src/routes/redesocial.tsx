import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BarChart3, Bot, FileUp, Loader2, Plus, Search, Sparkles, Users, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/redesocial")({
  head: () => ({ meta: [{ title: "Auditoria de Redes Sociais" }, { name: "description", content: "Audite menções públicas de apoiadores no Instagram." }] }),
  component: RedeSocialPage,
});

type Apoiador = { id: string; nome: string; instagram: string; cargo?: string | null; partido?: string | null; municipio?: string | null; status: string };
type Alvo = { id: string; nome: string; instagram?: string | null; termos: string[]; hashtags: string[]; ativo: boolean };
type Auditoria = { id: string; nome: string; pergunta_original: string; data_inicio: string; data_fim: string; status: string; total_apoiadores: number; total_publicacoes: number; total_mencoes: number };

function RedeSocialPage() {
  const [apoiadores, setApoiadores] = useState<Apoiador[]>([]);
  const [alvos, setAlvos] = useState<Alvo[]>([]);
  const [auditorias, setAuditorias] = useState<Auditoria[]>([]);
  const [busca, setBusca] = useState("");
  const [pergunta, setPergunta] = useState("");
  const [importacao, setImportacao] = useState("");
  const [novoAlvo, setNovoAlvo] = useState({ nome: "", instagram: "", termos: "", hashtags: "" });
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    setCarregando(true);
    const [a, t, r] = await Promise.all([
      supabase.from("social_supporters").select("id,nome,instagram,cargo,partido,municipio,status").order("nome"),
      supabase.from("social_targets").select("id,nome,instagram,termos,hashtags,ativo").eq("ativo", true).order("nome"),
      supabase.from("social_audits").select("id,nome,pergunta_original,data_inicio,data_fim,status,total_apoiadores,total_publicacoes,total_mencoes").order("criado_em", { ascending: false }).limit(10),
    ]);
    if (a.error || t.error || r.error) toast.error("A migration do módulo ainda precisa ser aplicada no Supabase.");
    setApoiadores((a.data || []) as Apoiador[]); setAlvos((t.data || []) as Alvo[]); setAuditorias((r.data || []) as Auditoria[]); setCarregando(false);
  }
  useEffect(() => { void carregar(); }, []);

  const filtrados = useMemo(() => apoiadores.filter((p) => `${p.nome} ${p.instagram} ${p.cargo || ""} ${p.municipio || ""}`.toLowerCase().includes(busca.toLowerCase())), [apoiadores, busca]);

  async function importar() {
    const linhas = importacao.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const dados = linhas.slice(linhas[0]?.toLowerCase().includes("instagram") ? 1 : 0).map((linha) => {
      const [nome, instagram, cargo, partido, municipio, uf] = linha.split(/[;,\t]/).map((v) => v.trim());
      return { nome, instagram, cargo, partido, municipio, uf, origem: "importacao", status: "pendente" };
    }).filter((p) => p.nome && p.instagram);
    if (!dados.length) return toast.error("Cole ao menos uma linha: Nome;Instagram;Cargo;Partido;Município;UF");
    const { error } = await supabase.from("social_supporters").upsert(dados, { onConflict: "instagram" });
    if (error) return toast.error(error.message);
    toast.success(`${dados.length} apoiador(es) importado(s).`); setImportacao(""); await carregar();
  }

  async function cadastrarAlvo() {
    if (!novoAlvo.nome.trim()) return toast.error("Informe o nome do alvo.");
    const { error } = await supabase.from("social_targets").insert({ nome: novoAlvo.nome, instagram: novoAlvo.instagram || null, termos: novoAlvo.termos.split(",").map((x) => x.trim()).filter(Boolean), hashtags: novoAlvo.hashtags.split(",").map((x) => x.trim()).filter(Boolean) });
    if (error) return toast.error(error.message);
    toast.success("Alvo cadastrado."); setNovoAlvo({ nome: "", instagram: "", termos: "", hashtags: "" }); await carregar();
  }

  async function criarAuditoria() {
    if (!pergunta.trim()) return toast.error("Descreva o que deseja analisar.");
    const agora = new Date(); const inicio = new Date(agora); inicio.setDate(agora.getDate() - 30);
    const { error } = await supabase.from("social_audits").insert({ nome: `Auditoria — ${agora.toLocaleDateString("pt-BR")}`, pergunta_original: pergunta, data_inicio: inicio.toISOString().slice(0, 10), data_fim: agora.toISOString().slice(0, 10), filtros: { alvos: alvos.map((a) => a.nome), apoiadores: "todos" }, total_apoiadores: apoiadores.length, status: "rascunho" });
    if (error) return toast.error(error.message);
    toast.success("Auditoria criada. A interpretação inteligente será executada pelo worker de coleta."); setPergunta(""); await carregar();
  }

  return <>
    <PageHeader eyebrow="Módulo isolado · /redesocial" title="Auditoria de Redes Sociais" right={<span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">IA + Instagram</span>} />
    <main className="space-y-5 px-5 py-6">
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <div className="flex items-start gap-3"><div className="rounded-xl bg-primary/10 p-3 text-primary"><Sparkles className="size-5" /></div><div><h2 className="font-bold">Pergunte ao analista</h2><p className="text-sm text-muted-foreground">Escreva em linguagem natural o relatório que deseja gerar.</p></div></div>
        <Textarea className="mt-4 min-h-24" value={pergunta} onChange={(e) => setPergunta(e.target.value)} placeholder="Ex.: Analise nos últimos 30 dias quem mencionou Elmano, #Elmano ou o governador. Mostre os maiores apoiadores e os omissos." />
        <button onClick={criarAuditoria} className="mt-3 flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"><Bot className="size-4" /> Criar auditoria inteligente</button>
      </section>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Metric icon={<Users />} label="Apoiadores" value={apoiadores.length} /><Metric icon={<Search />} label="Alvos" value={alvos.length} /><Metric icon={<BarChart3 />} label="Auditorias" value={auditorias.length} /><Metric icon={<FileUp />} label="Modo" value="Público" /></div>
      <Tabs defaultValue="apoiadores"><TabsList className="grid w-full grid-cols-3"><TabsTrigger value="apoiadores">Apoiadores</TabsTrigger><TabsTrigger value="alvos">Alvos e hashtags</TabsTrigger><TabsTrigger value="auditorias">Relatórios</TabsTrigger></TabsList>
        <TabsContent value="apoiadores" className="space-y-3"><div className="flex gap-2"><Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar nome, Instagram, cargo ou município" /><button onClick={importar} className="flex shrink-0 items-center gap-2 rounded-xl bg-foreground px-4 text-sm font-bold text-background"><Plus className="size-4" /> Importar texto</button></div><Textarea value={importacao} onChange={(e) => setImportacao(e.target.value)} placeholder="Nome;Instagram;Cargo;Partido;Município;UF\nJoão Silva;@joaosilva;Prefeito;Partido;Fortaleza;CE" />{carregando ? <Loader2 className="mx-auto animate-spin" /> : filtrados.map((p) => <div key={p.id} className="flex items-center justify-between rounded-xl border border-border bg-surface p-4"><div><p className="font-bold">{p.nome}</p><p className="text-xs text-muted-foreground">{p.instagram} · {p.cargo || "Cargo não informado"}{p.municipio ? ` · ${p.municipio}` : ""}</p></div><span className="rounded-full bg-muted px-2 py-1 text-[10px] uppercase">{p.status}</span></div>)}</TabsContent>
        <TabsContent value="alvos" className="space-y-3"><div className="grid gap-2 md:grid-cols-2"><Input placeholder="Nome do candidato/tema" value={novoAlvo.nome} onChange={(e) => setNovoAlvo({ ...novoAlvo, nome: e.target.value })} /><Input placeholder="Instagram oficial" value={novoAlvo.instagram} onChange={(e) => setNovoAlvo({ ...novoAlvo, instagram: e.target.value })} /><Input placeholder="Termos separados por vírgula" value={novoAlvo.termos} onChange={(e) => setNovoAlvo({ ...novoAlvo, termos: e.target.value })} /><Input placeholder="Hashtags separadas por vírgula" value={novoAlvo.hashtags} onChange={(e) => setNovoAlvo({ ...novoAlvo, hashtags: e.target.value })} /></div><button onClick={cadastrarAlvo} className="rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground">Adicionar alvo</button>{alvos.map((a) => <div key={a.id} className="rounded-xl border border-border bg-surface p-4"><p className="font-bold">{a.nome} {a.instagram && <span className="text-sm font-normal text-muted-foreground">{a.instagram}</span>}</p><p className="mt-1 text-xs text-muted-foreground">Termos: {a.termos.join(", ") || "—"} · Hashtags: {a.hashtags.join(", ") || "—"}</p></div>)}</TabsContent>
        <TabsContent value="auditorias" className="space-y-3">{auditorias.length === 0 ? <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Nenhuma auditoria criada.</p> : auditorias.map((a) => <div key={a.id} className="rounded-xl border border-border bg-surface p-4"><div className="flex justify-between gap-3"><div><p className="font-bold">{a.nome}</p><p className="mt-1 text-xs text-muted-foreground">{a.data_inicio} a {a.data_fim} · {a.status}</p></div><span className="text-xs font-bold text-primary">{a.total_mencoes} menções</span></div><p className="mt-3 text-sm text-muted-foreground">{a.pergunta_original}</p></div>)}</TabsContent>
      </Tabs>
    </main>
  </>;
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) { return <div className="rounded-2xl border border-border bg-surface p-4"><div className="flex items-center gap-2 text-primary">{icon}<span className="text-xs font-bold uppercase text-muted-foreground">{label}</span></div><p className="mt-2 text-2xl font-black">{value}</p></div>; }
