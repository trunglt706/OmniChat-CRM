'use client'

import type { TFn } from '@/lib/const/report'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { MessageSquare } from 'lucide-react'
import { EmptyState } from '../shared'

interface Props {
  data: any[]
  t: TFn
  loading: boolean
  onRowClick: (type: string, id: string | number, label: string) => void
}

export function ConversationsTab({ data, t, loading, onRowClick }: Props) {
  return (
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
  )
}
