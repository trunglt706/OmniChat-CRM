'use client'

import type { TFn } from '@/lib/const/report'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface Props {
  data: any[]
  t: TFn
  channelNames: Record<string, string>
  onRowClick: (type: string, id: string | number, label: string) => void
}

export function CustomersTab({ data, t, channelNames, onRowClick }: Props) {
  return (
    <div className="space-y-4">
      {/* Top Chart */}
      {data.length > 0 && (
        <div id="chart-customers" className="glass-card rounded-2xl p-4 md:p-5">
          <p className="text-xs font-semibold mb-3">{t('reports.customers.title') || 'Top Khách hàng tương tác'}</p>
          <div className="h-56 md:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid oklch(0 0 0 / 0.06)', boxShadow: '0 4px 12px oklch(0 0 0 / 0.08)' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="conversations" name={t('reports.customers.col.conversations')} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="messages" name={t('reports.customers.col.messages')} fill="#6366f1" radius={[4, 4, 0, 0]} />
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
                <TableHead className="text-xs font-semibold">{t('reports.customers.col.name')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.customers.col.conversations')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.customers.col.messages')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.customers.col.lastActive')}</TableHead>
                <TableHead className="text-xs font-semibold text-center">{t('reports.customers.col.channel')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.customers.col.value')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, i) => (
                <TableRow
                  key={i}
                  className="text-xs cursor-pointer hover:bg-foreground/[0.04] transition-colors"
                  onClick={() => onRowClick('customers', row.id, row.name)}
                >
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.conversations}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.messages}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{row.lastActive}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5">{channelNames[row.primaryChannel] || row.primaryChannel}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">{row.value}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}