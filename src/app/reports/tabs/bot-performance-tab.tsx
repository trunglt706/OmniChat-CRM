'use client'

import type { TFn } from '@/lib/const/report'
import { BOT_METRIC_KEYS } from '@/lib/const/report'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

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

  const chartData = data.metrics.map((row) => ({
    metric: metricLabel(row.metric),
    value: parseFloat(row.value) || 0,
    rawDisplay: row.value,
  }))

  const colors = ['#8b5cf6', '#10b981', '#3b82f6', '#f59e0b', '#06b6d4', '#ec4899']

  return (
    <div className="space-y-4">
      {/* Top Chart */}
      {chartData.length > 0 && (
        <div id="chart-botPerformance" className="glass-card rounded-2xl p-4 md:p-5">
          <p className="text-xs font-semibold mb-3">{t('reports.botPerformance.title') || 'Chỉ số hiệu suất Bot AI'}</p>
          <div className="h-56 md:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="metric" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                <Tooltip
                  formatter={(val: any, _name: any, entry: any) => [entry.payload.rawDisplay, t('reports.botPerformance.col.value')]}
                  contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid oklch(0 0 0 / 0.06)', boxShadow: '0 4px 12px oklch(0 0 0 / 0.08)' }}
                />
                <Bar dataKey="value" name={t('reports.botPerformance.col.value')} radius={[4, 4, 0, 0]}>
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Table */}
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
    </div>
  )
}