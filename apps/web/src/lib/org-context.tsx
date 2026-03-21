"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from "react";
import type { Org, OrgMembershipSummary } from "@promptops/shared";
import { api } from "./api-client";
import { useAuth } from "./auth-context";

type OrgContextValue = {
  orgs: OrgMembershipSummary[];
  currentOrg: Org | null;
  currentRole: string | null;
  loading: boolean;
  setCurrentOrgBySlug: (slug: string) => void;
  refresh: () => Promise<void>;
};

const OrgContext = createContext<OrgContextValue | null>(null);

export function OrgProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [orgs, setOrgs] = useState<OrgMembershipSummary[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Org | null>(null);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrgs = useCallback(async () => {
    if (!user) {
      setOrgs([]);
      setCurrentOrg(null);
      setCurrentRole(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await api.get<{ orgs: OrgMembershipSummary[] }>(
        api.paths.orgs
      );
      setOrgs(data.orgs);

      // Restore or pick default org
      if (data.orgs.length > 0) {
        const saved =
          typeof window !== "undefined"
            ? localStorage.getItem("po_current_org_slug")
            : null;
        const match = saved
          ? data.orgs.find((m) => m.org.slug === saved)
          : null;
        const picked = match ?? data.orgs[0];
        setCurrentOrg(picked.org);
        setCurrentRole(picked.role);
      }
    } catch {
      // silent - will show empty state
    } finally {
      setLoading(false);
    }
  }, [user]);

  const setCurrentOrgBySlug = useCallback(
    (slug: string) => {
      const match = orgs.find((m) => m.org.slug === slug);
      if (match) {
        setCurrentOrg(match.org);
        setCurrentRole(match.role);
        if (typeof window !== "undefined") {
          localStorage.setItem("po_current_org_slug", slug);
        }
      }
    },
    [orgs]
  );

  useEffect(() => {
    fetchOrgs();
  }, [fetchOrgs]);

  return (
    <OrgContext.Provider
      value={{
        orgs,
        currentOrg,
        currentRole,
        loading,
        setCurrentOrgBySlug,
        refresh: fetchOrgs
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrg must be used within OrgProvider");
  return ctx;
}
