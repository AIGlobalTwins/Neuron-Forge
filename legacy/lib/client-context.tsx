"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  type Client,
  type ClientInput,
  fetchClients,
  createClient as apiCreate,
  updateClient as apiUpdate,
  deleteClient as apiDelete,
} from "@/lib/clients";

interface Ctx {
  clients: Client[];
  activeClient: Client | null;
  setActiveClientId: (id: string | null) => void;
  refresh: () => Promise<void>;
  create: (input: ClientInput) => Promise<Client | null>;
  update: (id: string, input: Partial<ClientInput>) => Promise<Client | null>;
  remove: (id: string) => Promise<void>;
}

const ClientCtx = createContext<Ctx | null>(null);
const KEY = "forge_active_client";

export function ClientProvider({ children }: { children: React.ReactNode }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setClients(await fetchClients());
  }, []);

  useEffect(() => {
    try {
      setActiveId(localStorage.getItem(KEY));
    } catch {
      /* ignore */
    }
    refresh();
  }, [refresh]);

  const setActiveClientId = useCallback((id: string | null) => {
    setActiveId(id);
    try {
      if (id) localStorage.setItem(KEY, id);
      else localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const create = useCallback(
    async (input: ClientInput) => {
      const c = await apiCreate(input);
      if (c) {
        setClients((p) => [c, ...p]);
        setActiveClientId(c.id);
      }
      return c;
    },
    [setActiveClientId],
  );

  const update = useCallback(async (id: string, input: Partial<ClientInput>) => {
    const c = await apiUpdate(id, input);
    if (c) setClients((p) => p.map((x) => (x.id === id ? c : x)));
    return c;
  }, []);

  const remove = useCallback(async (id: string) => {
    await apiDelete(id);
    setClients((p) => p.filter((x) => x.id !== id));
    setActiveId((cur) => (cur === id ? null : cur));
  }, []);

  const activeClient = clients.find((c) => c.id === activeId) ?? null;

  return (
    <ClientCtx.Provider value={{ clients, activeClient, setActiveClientId, refresh, create, update, remove }}>
      {children}
    </ClientCtx.Provider>
  );
}

/** Null when rendered outside the provider (e.g. open mode). Callers guard with `?.`. */
export function useClientWorkspace(): Ctx | null {
  return useContext(ClientCtx);
}
