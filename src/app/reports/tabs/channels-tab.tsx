'use client'

import type { TFn } from '@/lib/const/report'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SatisfactionStar } from '../shared'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface Props {
  data: any[]
  t: TFn
  channelNames: Record<string, string>
  onRowClick: (type: string, id: string | number, label: string) => void
}

export function ChannelsTab({ data, t, channelNames, onRowClick }: Props) {
  return (
    <div className="space-y-4 animate-slide-up">
      {/* Top Chart */}
      {data.length > 0 && (
        <div id="chart-channels" className="glass-card card-lift rounded-2xl p-4 md:p-5 transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/5 hover:border-violet-500/20">
          <p className="text-xs font-semibold mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
            {t('reports.channels.title') || 'Thống kê theo kênh chăm sóc'}
          </p>
          <div className="h-56 md:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="channel" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid oklch(0 0 0 / 0.06)', boxShadow: '0 4px 12px oklch(0 0 0 / 0.08)' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="conversations" name={t('reports.channels.col.conversations')} fill="#8b5cf6" radius={[6, 6, 0, 0]} isAnimationActive animationDuration={1200} animationEasing="ease-in-out" />
                <Bar dataKey="messages" name={t('reports.channels.col.messages')} fill="#10b981" radius={[6, 6, 0, 0]} isAnimationActive animationDuration={1200} animationEasing="ease-in-out" />
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
                <TableHead className="text-xs font-semibold">{t('reports.channels.col.channel')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.channels.col.conversations')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.channels.col.messages')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.channels.col.avgResponse')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.channels.col.resolution')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.channels.col.satisfaction')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, i) => (
                <TableRow
                  key={i}
                  className="text-xs cursor-pointer hover:bg-primary/[0.04] transition-all duration-200 hover:translate-x-0.5"
                  onClick={() => onRowClick('channels', row.id, row.channel)}
                >
                  <TableCell className="font-medium">{row.channel}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">{row.conversations}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.messages}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{row.avgResponseTime}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.resolutionRate}</TableCell>
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
