'use client'

import type { TFn } from '@/lib/const/report'
import { cn } from '@/lib/utils'
import { RESPONSE_TIME_STATS } from '@/lib/const/report'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { SatisfactionStar } from '../shared'

interface Props {
  data: { buckets: any[]; stats: any } | null
  t: TFn
  chartRef: React.RefObject<HTMLDivElement | null>
}

export function ResponseTimeTab({ data, t, chartRef }: Props) {
  if (!data) return null
  const { buckets, stats } = data
  return (
    <div className="space-y-4 animate-slide-up">
      {/* Percentile stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {RESPONSE_TIME_STATS.map((s, i) => (
          <div key={i} className="glass-card card-lift rounded-xl p-3 text-center transition-all duration-300 hover:border-violet-500/30 hover:shadow-md">
            <p className="text-[10px] text-muted-foreground font-medium">{t(s.labelKey)}</p>
            <p className="text-sm font-bold mt-1 tabular-nums text-violet-600 dark:text-violet-400">{stats[s.valueKey]}</p>
          </div>
        ))}
      </div>
      {/* Chart */}
      <div id="chart-responseTime" ref={chartRef} className="glass-card card-lift rounded-2xl p-4 md:p-5 transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/5 hover:border-violet-500/20">
        <div className="h-56 md:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={buckets} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid oklch(0 0 0 / 0.06)', boxShadow: '0 4px 12px oklch(0 0 0 / 0.08)' }} />
              <Bar dataKey="count" name={t('reports.responseTime.col.count')} fill="#8b5cf6" radius={[6, 6, 0, 0]} isAnimationActive animationDuration={1200} animationEasing="ease-in-out" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      {/* Table */}
      <div className="glass-card card-lift rounded-2xl p-4 md:p-5 transition-all duration-300">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-semibold">{t('reports.responseTime.col.bucket')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.responseTime.col.count')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.responseTime.col.percentage')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.responseTime.col.avgSatisfaction')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {buckets.map((row: any, i: number) => (
                <TableRow key={i} className="text-xs hover:bg-primary/[0.04] transition-all duration-200 hover:translate-x-0.5">
                  <TableCell className="font-medium">{row.bucket}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">{row.count}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.percentage}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    <SatisfactionStar value={row.avgSatisfaction} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}