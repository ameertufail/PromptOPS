"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "text-primary",
  className,
  valueClassName,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <Card
      className={cn(
        // Claymorphism: layered soft shadows + subtle border glow
        "group relative overflow-hidden border border-white/10",
        "bg-card/80 backdrop-blur-sm",
        "shadow-[4px_4px_12px_rgba(0,0,0,0.15),-4px_-4px_12px_rgba(255,255,255,0.03)]",
        // Enter animation
        "animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both",
        // Hover lift
        "transition-all hover:-translate-y-1 hover:shadow-[6px_6px_20px_rgba(0,0,0,0.2),-6px_-6px_20px_rgba(255,255,255,0.05)]",
        className
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && (
          <div
            className={cn(
              "flex size-9 items-center justify-center rounded-full",
              "bg-primary/10 ring-1 ring-primary/20",
              "transition-transform duration-300 group-hover:scale-110"
            )}
          >
            <Icon className={cn("size-4", iconColor)} />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            "text-3xl font-bold tracking-tight",
            "bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent",
            valueClassName
          )}
        >
          {value}
        </div>
        {subtitle && (
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}
