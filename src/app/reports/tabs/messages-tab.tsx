'use client'

import type { TFn } from '@/lib/const/report'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { TrendingUp } from 'lucide-react'

interface Props {
  data: { hourly: any[]; peakHour: string } | null
  t: TFn
  chartRef: React.RefObject<HTMLDivElement | null>
}

export function MessagesTab({ data, t, chartRef }: Props) {
  return (
    <div className="space-y-4">
      {data && (
        <div className="glass-card rounded-2xl p-4 md:p-5 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
            <TrendingUp className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground font-medium">{t('reports.messages.peakHour')}</p>
            <p className="text-sm font-bold tabular-nums">{data.peakHour}</p>
          </div>
        </div>
      )}
      <div id="chart-messages" ref={chartRef} className="glass-card rounded-2xl p-4 md:p-5">
        <p className="text-xs font-semibold mb-4">{t('reports.messages.byHour')}</p>
        {data && data.hourly && (
          <div className="h-64 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.hourly} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="period" tick={{ fontSize: 10 }} interval={2} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid oklch(0 0 0 / 0.06)', boxShadow: '0 4px 12px oklch(0 0 0 / 0.08)' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="incoming" name={t('reports.messages.col.incoming')} fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="outgoing" name={t('reports.messages.col.outgoing')} fill="#8b5cf6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      <div className="glass-card rounded-2xl p-4 md:p-5">
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-semibold">{t('reports.messages.col.period')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.messages.col.incoming')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.messages.col.outgoing')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.messages.col.total')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.hourly?.map((row, i) => (
                <TableRow key={i} className="text-xs">
                  <TableCell className="font-medium font-mono">{row.period}</TableCell>
                  <TableCell className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">{row.incoming}</TableCell>
                  <TableCell className="text-right tabular-nums text-violet-600 dark:text-violet-400">{row.outgoing}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">{row.total}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}