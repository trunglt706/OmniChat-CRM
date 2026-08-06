'use client'

import type { TFn } from '@/lib/const/report'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface Props {
  data: any[]
  t: TFn
  chartRef: React.RefObject<HTMLDivElement | null>
}

export function ResolutionTrendsTab({ data, t, chartRef }: Props) {
  return (
    <div className="space-y-4 animate-slide-up">
      <div id="chart-resolutionTrends" ref={chartRef} className="glass-card card-lift rounded-2xl p-4 md:p-5 transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/5 hover:border-violet-500/20">
        <div className="h-64 md:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="period" tick={{ fontSize: 9 }} interval={0} angle={-15} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid oklch(0 0 0 / 0.06)', boxShadow: '0 4px 12px oklch(0 0 0 / 0.08)' }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="total" name={t('reports.resolutionTrends.col.total')} stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} isAnimationActive animationDuration={1200} animationEasing="ease-in-out" />
              <Line type="monotone" dataKey="resolved" name={t('reports.resolutionTrends.col.resolved')} stroke="#10b981" strokeWidth={2} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} isAnimationActive animationDuration={1200} animationEasing="ease-in-out" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="glass-card card-lift rounded-2xl p-4 md:p-5 transition-all duration-300">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-semibold">{t('reports.resolutionTrends.col.period')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.resolutionTrends.col.total')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.resolutionTrends.col.resolved')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.resolutionTrends.col.rate')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.resolutionTrends.col.avgTime')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, i) => (
                <TableRow key={i} className="text-xs hover:bg-primary/[0.04] transition-all duration-200 hover:translate-x-0.5">
                  <TableCell className="font-medium font-mono text-[11px]">{row.period}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">{row.total}</TableCell>
                  <TableCell className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">{row.resolved}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    <Badge variant="secondary" className={cn(
                      'text-[10px] h-5 px-1.5 font-mono font-semibold transition-transform hover:scale-105',
                      parseFloat(row.rate) >= 80 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15'
                        : parseFloat(row.rate) >= 60 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/15'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/15'
                    )}>
                      {row.rate}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{row.avgTime}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
