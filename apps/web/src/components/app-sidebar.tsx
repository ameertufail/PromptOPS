"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import {
  LayoutDashboard,
  FileText,
  Database,
  FlaskConical,
  Activity,
  Settings,
  ChevronsUpDown,
  Plus,
  LogOut,
  Building2,
  FolderOpen,
  Check
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { useOrg } from "@/lib/org-context";
import { useProject } from "@/lib/project-context";
import { cn } from "@/lib/utils";

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { orgs, currentOrg, setCurrentOrgBySlug } = useOrg();
  const { projects, currentProject, setCurrentProjectBySlug } = useProject();

  const orgSlug = currentOrg?.slug ?? "";
  const projectSlug = currentProject?.slug ?? "";
  const basePath = `/${orgSlug}/${projectSlug}`;

  const navItems = [
    {
      label: "Dashboard",
      href: basePath,
      icon: LayoutDashboard,
      match: (p: string) => p === basePath || p === `/${orgSlug}`
    },
    {
      label: "Prompts",
      href: `${basePath}/prompts`,
      icon: FileText,
      match: (p: string) => p.startsWith(`${basePath}/prompts`)
    },
    {
      label: "Datasets",
      href: `${basePath}/datasets`,
      icon: Database,
      match: (p: string) => p.startsWith(`${basePath}/datasets`)
    },
    {
      label: "Evals",
      href: `${basePath}/evals`,
      icon: FlaskConical,
      match: (p: string) => p.startsWith(`${basePath}/evals`)
    },
    {
      label: "Runs",
      href: `${basePath}/runs`,
      icon: Activity,
      match: (p: string) => p.startsWith(`${basePath}/runs`)
    },
    {
      label: "Settings",
      href: `${basePath}/settings`,
      icon: Settings,
      match: (p: string) => p.startsWith(`${basePath}/settings`)
    }
  ];

  return (
    <aside
      className={cn(
        "flex h-screen w-64 shrink-0 flex-col",
        "bg-sidebar text-sidebar-foreground",
        // Clay surface effect
        "bg-gradient-to-b from-sidebar via-sidebar to-muted/10",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
      )}
    >
      {/* Logo + Branding */}
      <div className="flex h-14 items-center gap-2.5 px-4">
        <div
          className={cn(
            "flex size-8 items-center justify-center rounded-lg",
            "bg-gradient-to-br from-primary to-primary/70",
            "shadow-[0_2px_8px_-2px_hsl(var(--primary)/0.4)]"
          )}
        >
          <span className="text-sm font-bold text-primary-foreground">P</span>
        </div>
        <span className="text-sm font-semibold tracking-tight">
          Prompt
          <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            OPS
          </span>
        </span>
      </div>

      <Separator className="bg-sidebar-border/60" />

      {/* Org Switcher */}
      <div className="px-3 py-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "h-9 w-full justify-between gap-2 px-2.5 text-sm font-medium",
                "rounded-lg transition-all duration-200 ease-out",
                "hover:bg-sidebar-accent/60 hover:shadow-[0_1px_3px_-1px_rgba(0,0,0,0.1)]"
              )}
            >
              <span className="flex items-center gap-2 truncate">
                <Building2 className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">
                  {currentOrg?.name ?? "Select org"}
                </span>
              </span>
              <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground/60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Organizations
            </DropdownMenuLabel>
            {orgs.map((m) => (
              <DropdownMenuItem
                key={m.org.id}
                onClick={() => {
                  setCurrentOrgBySlug(m.org.slug);
                  router.push(`/${m.org.slug}`);
                }}
                className="gap-2"
              >
                <Building2 className="size-3.5" />
                <span className="truncate">{m.org.name}</span>
                {m.org.slug === currentOrg?.slug && (
                  <Check className="ml-auto size-3.5 text-primary" />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 text-muted-foreground"
              onClick={() => (window.location.href = "/setup")}
            >
              <Plus className="size-3.5" />
              Create organization
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Project Switcher */}
      <div className="px-3 pb-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "h-8 w-full justify-between gap-2 px-2.5 text-xs font-medium text-muted-foreground",
                "rounded-lg transition-all duration-200 ease-out",
                "hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )}
            >
              <span className="flex items-center gap-2 truncate">
                <FolderOpen className="size-3.5 shrink-0" />
                <span className="truncate">
                  {currentProject?.name ?? "Select project"}
                </span>
              </span>
              <ChevronsUpDown className="size-3 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Projects
            </DropdownMenuLabel>
            {projects.map((p) => (
              <DropdownMenuItem
                key={p.id}
                onClick={() => {
                  setCurrentProjectBySlug(p.slug);
                  router.push(`/${orgSlug}/${p.slug}`);
                }}
                className="gap-2"
              >
                <FolderOpen className="size-3.5" />
                <span className="truncate">{p.name}</span>
                {p.slug === currentProject?.slug && (
                  <Check className="ml-auto size-3.5 text-primary" />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 text-muted-foreground"
              onClick={() => {
                if (currentOrg) {
                  window.location.href = `/${currentOrg.slug}`;
                }
              }}
            >
              <Plus className="size-3.5" />
              Create project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Separator className="bg-sidebar-border/60" />

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
        {navItems.map((item, index) => {
          const active = item.match(pathname);
          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.25,
                delay: index * 0.04,
                ease: "easeOut"
              }}
            >
              <Link
                href={item.href}
                className={cn(
                  "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                  "transition-all duration-200 ease-out",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[0_1px_3px_-1px_rgba(0,0,0,0.1),inset_0_1px_0_0_rgba(255,255,255,0.06)]"
                    : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
              >
                {/* Active glow pill indicator */}
                {active && (
                  <motion.div
                    layoutId="nav-active-pill"
                    className={cn(
                      "absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full",
                      "bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.5)]"
                    )}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <item.icon className="size-4 shrink-0" />
                {item.label}
              </Link>
            </motion.div>
          );
        })}
      </nav>

      <Separator className="bg-sidebar-border/60" />

      {/* User menu */}
      <div className="p-3">
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "h-auto w-full justify-start gap-3 px-2 py-2",
                  "rounded-lg transition-all duration-200 ease-out",
                  // Clay inset surface for user area
                  "bg-muted/30 hover:bg-muted/50",
                  "shadow-[inset_0_1px_2px_rgba(0,0,0,0.06),0_1px_0_rgba(255,255,255,0.04)]"
                )}
              >
                <Avatar className="size-7 ring-1 ring-border/40">
                  <AvatarImage src={user.avatarUrl ?? undefined} />
                  <AvatarFallback className="text-xs bg-gradient-to-br from-primary/20 to-primary/5">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start text-left">
                  <span className="text-sm font-medium leading-none">
                    {user.name ?? "User"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {user.email}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem
                onClick={logout}
                className="gap-2 text-destructive focus:text-destructive"
              >
                <LogOut className="size-3.5" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center gap-3 rounded-lg bg-muted/30 px-2 py-2 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]">
            <Skeleton className="size-7 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-2.5 w-28" />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
