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
} from "./db";

type Ctx = {
  db: Database;
  ready: boolean;
  addComite: (c: Omit<Comite, "id" | "ativo">) => Promise<void>;
  removeComite: (id: string) => Promise<void>;
  addPessoa: (p: Omit<Pessoa, "id">) => Promise<void>;
  removePessoa: (id: string) => Promise<void>;
  addMaterial: (m: Omit<Material, "id" | "unidade">) => Promise<void>;
  ajustarEstoque: (id: string, delta: number) => Promise<void>;
  removeMaterial: (id: string) => Promise<void>;
  addKit: (k: Omit<Kit, "id">) => Promise<void>;
  removeKit: (id: string) => Promise<void>;
  registrarSaida: (s: Omit<Saida, "id" | "criado_em">) => Promise<void>;
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
        comites: [{ ...c, id: uid(), ativo: true }, ...p.comites],
      })),
    removeComite: (id) =>
      commit((p) => ({ ...p, comites: p.comites.filter((c) => c.id !== id) })),
    addPessoa: (pessoa) =>
      commit((p) => ({ ...p, pessoas: [{ ...pessoa, id: uid() }, ...p.pessoas] })),
    removePessoa: (id) =>
      commit((p) => ({ ...p, pessoas: p.pessoas.filter((x) => x.id !== id) })),
    addMaterial: (m) =>
      commit((p) => ({
        ...p,
        materiais: [{ ...m, id: uid(), unidade: "un" }, ...p.materiais],
      })),
    ajustarEstoque: (id, delta) =>
      commit((p) => ({
        ...p,
        materiais: p.materiais.map((m) =>
          m.id === id ? { ...m, estoque: Math.max(0, m.estoque + delta) } : m,
        ),
      })),
    removeMaterial: (id) =>
      commit((p) => ({
        ...p,
        materiais: p.materiais.filter((m) => m.id !== id),
        kits: p.kits.map((k) => ({
          ...k,
          itens: k.itens.filter((i) => i.material_id !== id),
        })),
      })),
    addKit: (k) => commit((p) => ({ ...p, kits: [{ ...k, id: uid() }, ...p.kits] })),
    removeKit: (id) => commit((p) => ({ ...p, kits: p.kits.filter((k) => k.id !== id) })),
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
    resetarDados: () => commit(() => seed()),
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore precisa estar dentro de <StoreProvider>");
  return ctx;
}
