"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useOrg } from "@/lib/org-context";
import { useProject } from "@/lib/project-context";
import { cn } from "@/lib/utils";

export function BreadcrumbNav() {
  const pathname = usePathname();
  const { currentOrg } = useOrg();
  const { currentProject } = useProject();

  const segments = pathname.split("/").filter(Boolean);

  const crumbs: { label: string; href: string }[] = [];

  if (currentOrg && segments.length >= 1) {
    crumbs.push({
      label: currentOrg.name,
      href: `/${currentOrg.slug}`
    });
  }

  if (currentProject && segments.length >= 2) {
    crumbs.push({
      label: currentProject.name,
      href: `/${currentOrg?.slug}/${currentProject.slug}`
    });
  }

  // Domain segments beyond org/project (prompts, datasets, evals, etc.)
  const domainSegments = segments.slice(2);
  let domainPath = `/${segments[0] ?? ""}/${segments[1] ?? ""}`;
  for (const seg of domainSegments) {
    domainPath += `/${seg}`;
    crumbs.push({
      label: seg.charAt(0).toUpperCase() + seg.slice(1),
      href: domainPath
    });
  }

  if (crumbs.length === 0) return null;

  return (
    <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={crumb.href} className="flex items-center gap-1.5">
            {i > 0 && (
              <ChevronRight className="size-3 text-muted-foreground/40 shrink-0" />
            )}
            {isLast ? (
              <span
                className={cn(
                  "font-medium text-foreground",
                  "bg-primary/[0.06] text-primary/90 px-1.5 py-0.5 rounded-md",
                  "transition-colors duration-200"
                )}
              >
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className={cn(
                  "transition-colors duration-200 ease-out",
                  "hover:text-foreground",
                  "px-1 py-0.5 rounded-md",
                  "hover:bg-muted/50"
                )}
              >
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
