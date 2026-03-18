import { type ComponentPropsWithoutRef, type ReactNode } from "react"
import { ArrowRightIcon } from "@radix-ui/react-icons"

import { cn } from "@/lib/utils"

interface BentoGridProps extends ComponentPropsWithoutRef<"div"> {
  children: ReactNode
  className?: string
}

interface BentoCardProps extends ComponentPropsWithoutRef<"div"> {
  name: string
  className: string
  background: ReactNode
  Icon: React.ElementType
  description: string
  href: string
  cta: string
  style?: React.CSSProperties
}

const BentoGrid = ({ children, className, ...props }: BentoGridProps) => {
  return (
    <div
      className={cn(
        "grid w-full gap-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

const BentoCard = ({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta,
  ...props
}: BentoCardProps) => (
  <div
    key={name}
    className={cn(
      "group relative col-span-3 flex flex-col overflow-hidden rounded-xl",
      "bg-[#0C0C1A] border border-[rgba(255,255,255,0.09)] hover:border-[rgba(99,102,241,0.35)]",
      "hover:shadow-[0_0_30px_rgba(99,102,241,0.08)] transition-[border-color,box-shadow] duration-300",
      className
    )}
    {...props}
  >
    {/* Background visual — fills the card */}
    <div className="relative flex-1">{background}</div>

    {/* Icon badge — top-left */}
    <div className="pointer-events-none absolute left-4 top-4 z-20 flex size-8 items-center justify-center rounded-lg border border-[rgba(99,102,241,0.20)] bg-[rgba(99,102,241,0.12)]">
      <Icon className="size-3.5 text-[#818CF8]" />
    </div>

    {/* Footer overlay — bottom of card */}
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-10 rounded-b-xl px-5 pb-4 pt-10"
      style={{
        background:
          "linear-gradient(to top, rgba(12,12,24,0.95) 60%, transparent 100%)",
      }}
    >
      <div className="transform-gpu transition-all duration-300 lg:group-hover:-translate-y-8">
        <h3 className="mb-1 text-sm font-bold text-[#F8FAFC]">{name}</h3>
        <p className="line-clamp-2 text-xs leading-relaxed text-[#64748B]">
          {description}
        </p>
      </div>

      {/* CTA — slides up on hover */}
      <div className="pointer-events-auto absolute bottom-4 left-5 hidden translate-y-8 transform-gpu opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 lg:block">
        <a
          href={href}
          className="flex items-center gap-1 text-xs font-semibold text-[#6366F1] transition-all hover:gap-1.5 hover:text-[#818CF8]"
        >
          {cta}
          <ArrowRightIcon className="size-3" />
        </a>
      </div>

      {/* Mobile CTA — always visible */}
      <div className="pointer-events-auto mt-2 lg:hidden">
        <a
          href={href}
          className="flex items-center gap-1 text-xs font-semibold text-[#6366F1]"
        >
          {cta}
          <ArrowRightIcon className="size-3" />
        </a>
      </div>
    </div>

    {/* Hover overlay */}
    <div className="pointer-events-none absolute inset-0 transform-gpu transition-all duration-300 group-hover:bg-[rgba(99,102,241,0.03)]" />
  </div>
)

export { BentoCard, BentoGrid }
