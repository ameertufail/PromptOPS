"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { OrgProvider } from "@/lib/org-context";
import { ProjectProvider } from "@/lib/project-context";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileSidebar } from "@/components/mobile-sidebar";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";

function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/30">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
            <Loader2 className="relative size-8 animate-spin text-primary/70" />
          </div>
          <p className="text-sm font-medium text-muted-foreground animate-pulse">
            Loading your workspace...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <OrgProvider>
      <ProjectProvider>
        <div className="flex h-screen overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">
          {/* Desktop sidebar */}
          <div className="hidden lg:block">
            <AppSidebar />
          </div>

          {/* Sidebar glow separator - visible on desktop */}
          <div className="hidden lg:block relative w-px">
            <div className="absolute inset-0 bg-border" />
            <div className="absolute inset-y-[10%] left-1/2 -translate-x-1/2 w-px bg-gradient-to-b from-transparent via-primary/25 to-transparent blur-[1px]" />
          </div>

          {/* Main content */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Top bar with glass effect */}
            <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border/60 bg-background/70 backdrop-blur-xl px-4 lg:px-6 supports-[backdrop-filter]:bg-background/50">
              <MobileSidebar />
              <BreadcrumbNav />
            </header>

            {/* Page content with enter animation */}
            <motion.main
              className="flex-1 overflow-y-auto"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              <div className="mx-auto max-w-6xl px-4 py-6 lg:px-6">
                {children}
              </div>
            </motion.main>
          </div>
        </div>
      </ProjectProvider>
    </OrgProvider>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AuthGate>
        <DashboardShell>{children}</DashboardShell>
      </AuthGate>
    </AuthProvider>
  );
}
