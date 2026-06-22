// Client workspace — a saved end-business the reseller manages. Every agent
// pre-fills from the active client and tags its result with the client id.
// Stored in Supabase (clients table, RLS per reseller).

export interface ClientFaq {
  question: string;
  answer: string;
}

export interface Client {
  id: string;
  name: string;
  category: string;
  description: string;
  website: string;
  phone: string;
  hours: string;
  services: string[];
  faqs: ClientFaq[];
  created_at?: string;
}

export type ClientInput = Omit<Client, "id" | "created_at">;

export const EMPTY_CLIENT: ClientInput = {
  name: "",
  category: "",
  description: "",
  website: "",
  phone: "",
  hours: "",
  services: [],
  faqs: [],
};

export async function fetchClients(): Promise<Client[]> {
  try {
    const r = await fetch("/api/clients");
    if (!r.ok) return [];
    const { clients } = await r.json();
    return (clients ?? []) as Client[];
  } catch {
    return [];
  }
}

export async function createClient(input: ClientInput): Promise<Client | null> {
  try {
    const r = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!r.ok) return null;
    const { client } = await r.json();
    return client as Client;
  } catch {
    return null;
  }
}

export async function updateClient(id: string, input: Partial<ClientInput>): Promise<Client | null> {
  try {
    const r = await fetch(`/api/clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!r.ok) return null;
    const { client } = await r.json();
    return client as Client;
  } catch {
    return null;
  }
}

export async function deleteClient(id: string): Promise<void> {
  try {
    await fetch(`/api/clients/${id}`, { method: "DELETE" });
  } catch {
    /* ignore */
  }
}
