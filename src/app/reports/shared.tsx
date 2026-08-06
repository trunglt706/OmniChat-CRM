'use client'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { TFn } from '@/lib/const/report'

export function SummaryCard({ label, value, icon: Icon, gradient }: {
  label: string; value: string; icon: React.ElementType; gradient: string
}) {
  return (
    <div className={cn(
      'glass-card rounded-2xl p-4 md:p-5 relative overflow-hidden group transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20',
      'card-lift animate-fade-in'
    )}>
      <div className={cn('absolute inset-0 opacity-[0.07] group-hover:opacity-[0.15] transition-all duration-500 blur-xl', gradient)} />
      <div className="relative z-10 flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[11px] md:text-xs text-muted-foreground font-medium truncate">{label}</p>
          <p className="text-xl md:text-2xl font-bold mt-1 tabular-nums tracking-tight group-hover:text-primary transition-colors duration-300">{value}</p>
        </div>
        <div className={cn('h-9 w-9 md:h-10 md:w-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-md', gradient)}>
          <Icon className="h-4.5 w-4.5 md:h-5 md:w-5 text-white" />
        </div>
      </div>
    </div>
  )
}

export function DetailStatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-semibold tabular-nums">{value}</span>
    </div>
  )
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="secondary" className={cn(
      'text-[10px] h-5 px-1.5',
      status === 'resolved' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
        : status === 'open' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
        : 'bg-gray-500/10 text-gray-500'
    )}>
      {status}
    </Badge>
  )
}

export function SatisfactionStar({ value }: { value: string | number }) {
  return (
    <span className={cn(
      'font-semibold',
      parseFloat(String(value)) >= 4.5 ? 'text-emerald-500'
        : parseFloat(String(value)) >= 4.0 ? 'text-amber-500'
        : 'text-rose-500'
    )}>
      {value} ★
    </span>
  )
}

export function EmptyState({ t, icon: Icon }: { t: TFn; icon: React.ElementType }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <Icon className="h-8 w-8 mb-2 opacity-40" />
      <p className="text-xs">{t('reports.noData')}</p>
    </div>
  )
}
