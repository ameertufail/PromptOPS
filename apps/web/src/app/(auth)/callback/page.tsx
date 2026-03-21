"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { User } from "@promptops/shared";
import { api, storeSessionToken } from "@/lib/api-client";

export default function CallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("error");

    if (authError) {
      setError(
        authError === "auth_failed"
          ? "Authentication failed. Please try again."
          : authError === "missing_email"
            ? "Could not retrieve your email from GitHub. Check your GitHub email settings."
            : `Authentication error: ${authError}`
      );
      return;
    }

    const token = params.get("token");
    if (token) {
      storeSessionToken(token);
      // Clean the token from the URL to avoid leaking it in browser history
      window.history.replaceState({}, "", "/callback");
    }

    api
      .get<{ user: User }>(api.paths.auth.me)
      .then(async () => {
        try {
          const orgsData = await api.get<{
            orgs: Array<{ org: { slug: string } }>;
          }>(api.paths.orgs);
          if (orgsData.orgs.length > 0) {
            const savedSlug = localStorage.getItem("po_current_org_slug");
            const orgMatch = savedSlug
              ? orgsData.orgs.find((m) => m.org.slug === savedSlug)
              : null;
            const org = orgMatch ?? orgsData.orgs[0];
            router.replace(`/${org.org.slug}`);
          } else {
            router.replace("/setup");
          }
        } catch {
          router.replace("/setup");
        }
      })
      .catch(() => {
        setError("Session could not be verified. Please sign in again.");
      });
  }, [router]);

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
        className="flex flex-col items-center gap-6"
      >
        <div className="flex size-16 items-center justify-center rounded-2xl bg-destructive/10 ring-1 ring-destructive/20">
          <AlertCircle className="size-7 text-destructive" />
        </div>

        <div className="w-full rounded-xl border border-border/40 bg-card/60 px-10 py-10 shadow-lg backdrop-blur-xl">
          <div className="mb-6 text-center">
            <h2 className="text-lg font-semibold">Sign in failed</h2>
            <p className="mt-1.5 text-sm text-muted-foreground/70">{error}</p>
          </div>
          <Button
            onClick={() => router.replace("/login")}
            className="w-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
            variant="outline"
            size="lg"
          >
            Back to login
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.25, 0.4, 0.25, 1] }}
      className="flex flex-col items-center gap-4 text-center"
    >
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl" />
        <Loader2 className="relative size-8 animate-spin text-primary" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">
        Signing you in...
      </p>
    </motion.div>
  );
}
