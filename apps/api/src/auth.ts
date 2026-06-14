/**
 * Auth is abstracted behind AuthProvider so we can swap Supabase Auth (MVP) for
 * a tenant's SSO later without touching routes. Routes only ever call resolve().
 */
export interface AuthContext {
  userId: string;
  tenantId: string;
  memberId: string;
}

export interface AuthProvider {
  /** Resolve the caller from request headers, or null if unauthenticated. */
  resolve(headers: Headers): Promise<AuthContext | null>;
}

/**
 * MVP single-user provider (Fase 1 has no auth yet). Returns a fixed dev context
 * so the generation loop works end-to-end. Replaced by SupabaseAuthProvider in Fase 3.
 */
export class DevAuthProvider implements AuthProvider {
  async resolve(_headers: Headers): Promise<AuthContext> {
    return {
      userId: "dev-user",
      tenantId: "00000000-0000-0000-0000-000000000000",
      memberId: "00000000-0000-0000-0000-000000000001",
    };
  }
}

export const auth: AuthProvider = new DevAuthProvider();
