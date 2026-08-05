'use client'

import type { TFn } from '@/lib/const/report'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SatisfactionStar } from '../shared'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface Props {
  data: any[]
  t: TFn
  onRowClick: (type: string, id: string | number, label: string) => void
}

export function AgentsTab({ data, t, onRowClick }: Props) {
  return (
    <div className="space-y-4">
      {/* Top Chart */}
      {data.length > 0 && (
        <div id="chart-agents" className="glass-card rounded-2xl p-4 md:p-5">
          <p className="text-xs font-semibold mb-3">{t('reports.agents.title') || 'Hiệu suất nhân viên'}</p>
          <div className="h-56 md:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid oklch(0 0 0 / 0.06)', boxShadow: '0 4px 12px oklch(0 0 0 / 0.08)' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="conversations" name={t('reports.agents.col.conversations')} fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="resolved" name={t('reports.agents.col.resolved')} fill="#10b981" radius={[4, 4, 0, 0]} />
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
                <TableHead className="text-xs font-semibold">{t('reports.agents.col.name')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.agents.col.conversations')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.agents.col.messages')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.agents.col.avgResponse')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.agents.col.resolved')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.agents.col.satisfaction')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.agents.col.activeHours')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, i) => (
                <TableRow
                  key={i}
                  className="text-xs cursor-pointer hover:bg-foreground/[0.04] transition-colors"
                  onClick={() => onRowClick('agents', row.id, row.name)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        'h-2 w-2 rounded-full flex-shrink-0',
                        row.status === 'online' ? 'bg-emerald-500' : row.status === 'busy' ? 'bg-amber-500' : 'bg-gray-400'
                      )} />
                      {row.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.conversations}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.messages}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{row.avgResponseTime}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15">{row.resolved}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <SatisfactionStar value={row.satisfaction} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{row.activeHours}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
