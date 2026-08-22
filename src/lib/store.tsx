import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  loadDb,
  saveDb,
  seed,
  uid,
  type Comite,
  type Database,
  type Kit,
  type Material,
  type Pessoa,
  type Saida,
  type SolicitacaoMaterial,
} from "./db";

type Ctx = {
  db: Database;
  ready: boolean;
  addComite: (c: Omit<Comite, "id" | "ativo" | "status"> & { status?: Comite["status"] }) => Promise<void>;
  updateComite: (id: string, c: Partial<Comite>) => Promise<void>;
  removeComite: (id: string) => Promise<void>;
  addPessoa: (p: Omit<Pessoa, "id" | "status"> & { status?: Pessoa["status"] }) => Promise<void>;
  updatePessoa: (id: string, p: Partial<Pessoa>) => Promise<void>;
  removePessoa: (id: string) => Promise<void>;
  addMaterial: (m: Omit<Material, "id" | "unidade" | "arquivado">) => Promise<void>;
  updateMaterial: (id: string, m: Partial<Material>) => Promise<void>;
  ajustarEstoque: (id: string, delta: number) => Promise<void>;
  archiveMaterial: (id: string) => Promise<void>;
  addKit: (k: Omit<Kit, "id" | "arquivado">) => Promise<void>;
  updateKit: (id: string, k: Partial<Kit>) => Promise<void>;
  archiveKit: (id: string) => Promise<void>;
  registrarSaida: (s: Omit<Saida, "id" | "criado_em">) => Promise<void>;
  addSolicitacao: (s: Omit<SolicitacaoMaterial, "id" | "criado_em" | "status">) => Promise<void>;
  updateSolicitacao: (id: string, s: Partial<SolicitacaoMaterial>) => Promise<void>;
  resetarDados: () => Promise<void>;
};

const StoreContext = createContext<Ctx | null>(null);

const wait = (ms = 320) => new Promise((r) => setTimeout(r, ms));

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<Database>(() => seed());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDb(loadDb());
    setReady(true);
  }, []);

  const commit = useCallback(
    async (updater: (prev: Database) => Database) => {
      await wait();
      setDb((prev) => {
        const next = updater(prev);
        saveDb(next);
        return next;
      });
    },
    [],
  );

  const value: Ctx = {
    db,
    ready,
    addComite: (c) =>
      commit((p) => ({
        ...p,
        comites: [{ ...c, id: uid(), ativo: c.status === "ativo", status: c.status || "ativo" }, ...p.comites],
      })),
    updateComite: (id, c) =>
      commit((p) => ({
        ...p,
        comites: p.comites.map((x) => {
          if (x.id === id) {
            const next = { ...x, ...c };
            if (c.status) next.ativo = c.status === "ativo";
            return next;
          }
          return x;
        }),
      })),
    removeComite: (id) =>
      commit((p) => ({ ...p, comites: p.comites.filter((c) => c.id !== id) })),
    addPessoa: (pessoa) =>
      commit((p) => ({ ...p, pessoas: [{ ...pessoa, id: uid(), status: pessoa.status || "ativo" }, ...p.pessoas] })),
    updatePessoa: (id, pessoa) =>
      commit((p) => {
        const nextPessoas = p.pessoas.map((x) => (x.id === id ? { ...x, ...pessoa } : x));
        
        // Regra de Negócio: Atualizar meta do comitê se a meta da liderança mudar
        if (pessoa.meta_votos !== undefined) {
          const pEditada = p.pessoas.find(x => x.id === id);
          if (pEditada) {
            const comiteId = pEditada.comite_id;
            const novasMetas = nextPessoas
              .filter(x => x.comite_id === comiteId)
              .reduce((sum, x) => sum + (x.meta_votos || 0), 0);
            
            return {
              ...p,
              pessoas: nextPessoas,
              comites: p.comites.map(c => c.id === comiteId ? { ...c, meta_votos: novasMetas } : c)
            };
          }
        }
        
        return { ...p, pessoas: nextPessoas };
      }),
    removePessoa: (id) =>
      commit((p) => ({ ...p, pessoas: p.pessoas.filter((x) => x.id !== id) })),
    addMaterial: (m) =>
      commit((p) => ({
        ...p,
        materiais: [{ ...m, id: uid(), unidade: "un", arquivado: false }, ...p.materiais],
      })),
    updateMaterial: (id, m) =>
      commit((p) => ({
        ...p,
        materiais: p.materiais.map((x) => (x.id === id ? { ...x, ...m } : x)),
      })),
    ajustarEstoque: (id, delta) =>
      commit((p) => ({
        ...p,
        materiais: p.materiais.map((m) =>
          m.id === id ? { ...m, estoque: Math.max(0, m.estoque + delta) } : m,
        ),
      })),
    archiveMaterial: (id) =>
      commit((p) => ({
        ...p,
        materiais: p.materiais.map((m) => (m.id === id ? { ...m, arquivado: true } : m)),
      })),
    addKit: (k) => commit((p) => ({ ...p, kits: [{ ...k, id: uid(), arquivado: false }, ...p.kits] })),
    updateKit: (id, k) =>
      commit((p) => ({
        ...p,
        kits: p.kits.map((x) => (x.id === id ? { ...x, ...k } : x)),
      })),
    archiveKit: (id) =>
      commit((p) => ({
        ...p,
        kits: p.kits.map((k) => (k.id === id ? { ...k, arquivado: true } : k)),
      })),
    registrarSaida: (s) =>
      commit((p) => {
        const saida: Saida = { ...s, id: uid(), criado_em: new Date().toISOString() };
        const materiais = p.materiais.map((m) => {
          const total = saida.itens
            .filter((i) => i.material_id === m.id)
            .reduce((acc, i) => acc + i.quantidade, 0);
          return total ? { ...m, estoque: Math.max(0, m.estoque - total) } : m;
        });
        return { ...p, materiais, saidas: [saida, ...p.saidas] };
      }),
    addSolicitacao: (s) =>
      commit((p) => ({
        ...p,
        solicitacoes: [{ ...s, id: uid(), criado_em: new Date().toISOString(), status: "pendente" }, ...p.solicitacoes],
      })),
    updateSolicitacao: (id, s) =>
      commit((p) => ({
        ...p,
        solicitacoes: p.solicitacoes.map((x) => (x.id === id ? { ...x, ...s } : x)),
      })),
    resetarDados: () => commit(() => seed()),
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore precisa estar dentro de <StoreProvider>");
  return ctx;
}
