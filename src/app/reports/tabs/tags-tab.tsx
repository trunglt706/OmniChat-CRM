'use client'

import type { TFn } from '@/lib/const/report'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tag } from 'lucide-react'
import { SatisfactionStar } from '../shared'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface Props {
  data: any[]
  t: TFn
  onRowClick: (type: string, id: string | number, label: string) => void
}

export function TagsTab({ data, t, onRowClick }: Props) {
  return (
    <div className="space-y-4">
      {/* Top Chart */}
      {data.length > 0 && (
        <div id="chart-tags" className="glass-card rounded-2xl p-4 md:p-5">
          <p className="text-xs font-semibold mb-3">{t('reports.tags.title') || 'Phân bổ thẻ nhãn'}</p>
          <div className="h-56 md:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="tag" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid oklch(0 0 0 / 0.06)', boxShadow: '0 4px 12px oklch(0 0 0 / 0.08)' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="conversations" name={t('reports.tags.col.conversations')} fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="count" name={t('reports.tags.col.count')} fill="#f59e0b" radius={[4, 4, 0, 0]} />
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
                <TableHead className="text-xs font-semibold">{t('reports.tags.col.tag')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.tags.col.count')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.tags.col.conversations')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.tags.col.avgResolution')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.tags.col.satisfaction')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, i) => (
                <TableRow
                  key={i}
                  className="text-xs cursor-pointer hover:bg-foreground/[0.04] transition-colors"
                  onClick={() => onRowClick('tags', row.id, row.tag)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-1.5">
                      <Tag className="h-3 w-3 text-violet-500" />
                      {row.tag}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.count}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">{row.conversations}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{row.avgResolution}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    <SatisfactionStar value={row.satisfaction} />
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
