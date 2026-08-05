'use client'

import type { TFn } from '@/lib/const/report'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface Props {
  data: any[]
  t: TFn
}

export function SlaTab({ data, t }: Props) {
  const chartData = data.map((row) => {
    const complianceNum = parseInt(row.compliance) || 0
    return {
      metric: row.metric,
      compliance: complianceNum,
      rawCompliance: row.compliance,
      target: row.target,
    }
  })

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Top Chart */}
      {chartData.length > 0 && (
        <div id="chart-sla" className="glass-card card-lift rounded-2xl p-4 md:p-5 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/5 hover:border-emerald-500/20">
          <p className="text-xs font-semibold mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            {t('reports.sla.title') || 'Tỉ lệ tuân thủ cam kết SLA'}
          </p>
          <div className="h-56 md:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="metric" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                <Tooltip
                  formatter={(val: any) => [`${val}%`, t('reports.sla.col.compliance')]}
                  contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid oklch(0 0 0 / 0.06)', boxShadow: '0 4px 12px oklch(0 0 0 / 0.08)' }}
                />
                <Bar dataKey="compliance" name={t('reports.sla.col.compliance')} radius={[6, 6, 0, 0]} isAnimationActive animationDuration={1200} animationEasing="ease-in-out">
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.compliance >= 85 ? '#10b981' : entry.compliance >= 70 ? '#f59e0b' : '#ef4444'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="glass-card card-lift rounded-2xl p-4 md:p-5 transition-all duration-300">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-semibold">{t('reports.sla.col.metric')}</TableHead>
                <TableHead className="text-xs font-semibold text-center">{t('reports.sla.col.target')}</TableHead>
                <TableHead className="text-xs font-semibold text-center">{t('reports.sla.col.actual')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.sla.col.compliance')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, i) => {
                const complianceNum = parseInt(row.compliance) || 0
                return (
                  <TableRow key={i} className="text-xs hover:bg-primary/[0.04] transition-all duration-200 hover:translate-x-0.5">
                    <TableCell className="font-medium">{row.metric}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-[10px] h-5 px-2 font-mono">{row.target}</Badge>
                    </TableCell>
                    <TableCell className="text-center tabular-nums font-medium">{row.actual}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary" className={cn(
                        'text-[10px] h-5 px-2 font-mono font-semibold',
                        complianceNum >= 85 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15'
                          : complianceNum >= 70 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/15'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/15'
                      )}>
                        {row.compliance}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
