'use client'

import type { TFn } from '@/lib/const/report'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { MessageSquare } from 'lucide-react'
import { EmptyState } from '../shared'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface Props {
  data: any[]
  t: TFn
  loading: boolean
  onRowClick: (type: string, id: string | number, label: string) => void
}

export function ConversationsTab({ data, t, loading, onRowClick }: Props) {
  return (
    <div className="space-y-4">
      {/* Top Chart */}
      {data.length > 0 && (
        <div id="chart-conversations" className="glass-card rounded-2xl p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold">{t('reports.conversations.title') || 'Xu hướng hội thoại'}</p>
          </div>
          <div className="h-56 md:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
                <defs>
                  <linearGradient id="colorOpen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorClosed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid oklch(0 0 0 / 0.06)', boxShadow: '0 4px 12px oklch(0 0 0 / 0.08)' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="open" name={t('reports.conversations.col.open')} stroke="#f59e0b" fillOpacity={1} fill="url(#colorOpen)" strokeWidth={2} />
                <Area type="monotone" dataKey="resolved" name={t('reports.conversations.col.resolved')} stroke="#10b981" fillOpacity={1} fill="url(#colorResolved)" strokeWidth={2} />
                <Area type="monotone" dataKey="closed" name={t('reports.conversations.col.closed')} stroke="#6366f1" fillOpacity={1} fill="url(#colorClosed)" strokeWidth={2} />
              </AreaChart>
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
                <TableHead className="text-xs font-semibold">{t('reports.conversations.col.date')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.conversations.col.total')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.conversations.col.open')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.conversations.col.resolved')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.conversations.col.closed')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.conversations.col.avgResponse')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.conversations.col.avgResolution')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, i) => (
                <TableRow
                  key={i}
                  className="text-xs cursor-pointer hover:bg-foreground/[0.04] transition-colors"
                  onClick={() => onRowClick('conversations', row.date, row.date)}
                >
                  <TableCell className="font-medium">{row.date}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">{row.total}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/15">{row.open}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15">{row.resolved}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.closed}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{row.avgResponseTime}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{row.avgResolutionTime}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {data.length === 0 && !loading && <EmptyState t={t} icon={MessageSquare} />}
      </div>
    </div>
  )
}
