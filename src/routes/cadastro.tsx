import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, UserPlus, ArrowLeft, Send } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/cadastro")({
  head: () => ({
    meta: [
      { title: "Cadastro de Apoiador — Campanha 2026" },
      {
        name: "description",
        content: "Faça parte da nossa campanha. Cadastre-se como apoiador agora.",
      },
    ],
  }),
  component: PublicCadastro,
});

function PublicCadastro() {
  const { addPessoa, db } = useStore();
  const [enviado, setEnviado] = useState(false);
  const [carregando, setCarregando] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCarregando(true);
    const formData = new FormData(e.currentTarget);

    const nome = formData.get("nome") as string;
    const telefone = formData.get("telefone") as string;
    const zona = formData.get("zona") as string;

    if (!nome || !telefone || !zona) {
      toast.error("Por favor, preencha todos os campos.");
      setCarregando(false);
      return;
    }

    try {
      await addPessoa({
        nome,
        telefone,
        zona,
        tipo: "apoiador",
        funcao: "Apoiador Voluntário",
        comite_id: db.comites[0]?.id || "c1", // Fallback para o primeiro comitê
      });
      setEnviado(true);
      toast.success("Cadastro realizado com sucesso!");
    } catch (error) {
      toast.error("Erro ao realizar cadastro. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  };

  if (enviado) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center animate-in fade-in zoom-in duration-300">
        <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle2 className="size-10 text-primary" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Tudo certo!</h1>
        <p className="mt-4 text-muted-foreground">
          Obrigado por se juntar à nossa caminhada. Entraremos em contato em breve.
        </p>
        <div className="mt-10 w-full space-y-3">
          <Button
            className="w-full h-14 text-lg font-bold"
            onClick={() => setEnviado(false)}
          >
            Cadastrar outro
          </Button>
          <Link to="/" className="block text-sm font-mono text-muted-foreground underline">
            VOLTAR AO PAINEL
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-6 py-12 animate-in slide-in-from-bottom-4 duration-500">
      <header className="mb-10 text-center">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary text-white shadow-xl shadow-primary/20">
          <UserPlus className="size-8" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Seja Apoiador</h1>
        <p className="mt-2 text-muted-foreground">
          Preencha seus dados para fortalecer nossa campanha
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="nome" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Nome Completo
          </Label>
          <Input
            id="nome"
            name="nome"
            placeholder="Ex: João da Silva"
            className="h-14 border-2 text-lg focus-visible:ring-primary"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="telefone" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            WhatsApp (com DDD)
          </Label>
          <Input
            id="telefone"
            name="telefone"
            type="tel"
            placeholder="Ex: 11999999999"
            className="h-14 border-2 text-lg focus-visible:ring-primary"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="zona" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Endereço / Bairro / Zona
          </Label>
          <Input
            id="zona"
            name="zona"
            placeholder="Ex: Centro / Zona Sul"
            className="h-14 border-2 text-lg focus-visible:ring-primary"
            required
          />
        </div>

        <div className="pt-4">
          <Button
            type="submit"
            className="w-full h-16 text-xl font-black uppercase tracking-widest shadow-lg active:scale-[0.98] transition-transform"
            disabled={carregando}
          >
            {carregando ? "Enviando..." : (
              <span className="flex items-center gap-2">
                Confirmar Cadastro
                <Send className="size-5" />
              </span>
            )}
          </Button>
        </div>
      </form>

      <footer className="mt-12 text-center text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50">
        Logística de Campo © 2026
      </footer>
    </div>
  );
}
