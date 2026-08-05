'use client'

import type { TFn } from '@/lib/const/report'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DetailStatRow } from '../shared'

interface Props {
  data: any
  t: TFn
}

export function ChannelDetail({ data, t }: Props) {
  if (!data) return null
  const { channel, dailyBreakdown } = data
  return (
    <div className="space-y-4">
      <div className="glass-card rounded-2xl p-4 md:p-5">
        <p className="text-sm font-bold mb-3">{t('reports.detail.channel', { name: channel.name })}</p>
        <DetailStatRow label={t('reports.detail.channel.totalConvos')} value={String(channel.conversations)} />
        <DetailStatRow label={t('reports.detail.channel.totalMessages')} value={String(channel.messages)} />
        <DetailStatRow label={t('reports.detail.channel.avgResponseTime')} value={channel.avgResponseTime} />
        <DetailStatRow label={t('reports.detail.channel.resolutionRate')} value={channel.resolutionRate} />
        <DetailStatRow label={t('reports.detail.channel.satisfaction')} value={`${channel.satisfaction} ★`} />
      </div>
      <div className="glass-card rounded-2xl p-4 md:p-5">
        <p className="text-xs font-semibold mb-3">{t('reports.detail.channel.dailyBreakdown')}</p>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-semibold">{t('reports.conversations.col.date')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.conversations.col.total')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.conversations.col.resolved')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.channels.col.messages')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(dailyBreakdown || []).map((d: any, i: number) => (
                <TableRow key={i} className="text-xs">
                  <TableCell className="font-medium">{d.date}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">{d.conversations}</TableCell>
                  <TableCell className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">{d.resolved}</TableCell>
                  <TableCell className="text-right tabular-nums">{d.messages}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}