'use client'

import type { TFn } from '@/lib/const/report'
import { BOT_METRIC_KEYS } from '@/lib/const/report'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'

interface Props {
  data: { metrics: any[] } | null
  t: TFn
}

function trendIcon(trend: string) {
  if (trend === 'up') return <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
  if (trend === 'down') return <ArrowDownRight className="h-3.5 w-3.5 text-rose-500" />
  return <Minus className="h-3.5 w-3.5 text-amber-500" />
}

export function BotPerformanceTab({ data, t }: Props) {
  if (!data) return null
  const metricLabel = (key: string) => t(BOT_METRIC_KEYS[key] || key)
  return (
    <div className="glass-card rounded-2xl p-4 md:p-5">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-semibold">{t('reports.botPerformance.col.metric')}</TableHead>
              <TableHead className="text-xs font-semibold text-right">{t('reports.botPerformance.col.value')}</TableHead>
              <TableHead className="text-xs font-semibold text-center">{t('reports.botPerformance.col.trend')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.metrics.map((row: any, i: number) => (
              <TableRow key={i} className="text-xs">
                <TableCell className="font-medium">{metricLabel(row.metric)}</TableCell>
                <TableCell className="text-right tabular-nums font-semibold">{row.value}</TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    {trendIcon(row.trend)}
                    <span className="text-[10px] text-muted-foreground">{t(`reports.botPerformance.trend.${row.trend}`)}</span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}