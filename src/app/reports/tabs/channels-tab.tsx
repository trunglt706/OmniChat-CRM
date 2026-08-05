'use client'

import type { TFn } from '@/lib/const/report'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SatisfactionStar } from '../shared'

interface Props {
  data: any[]
  t: TFn
  channelNames: Record<string, string>
  onRowClick: (type: string, id: string | number, label: string) => void
}

export function ChannelsTab({ data, t, channelNames, onRowClick }: Props) {
  return (
    <div className="glass-card rounded-2xl p-4 md:p-5">
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
                className="text-xs cursor-pointer hover:bg-foreground/[0.04] transition-colors"
                onClick={() => onRowClick('channels', row.id, row.channel)}
              >
                <TableCell className="font-medium">{row.channel}</TableCell>
                <TableCell className="text-right tabular-nums">{row.conversations}</TableCell>
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
  )
}
