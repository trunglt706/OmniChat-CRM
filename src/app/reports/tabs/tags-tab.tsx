'use client'

import type { TFn } from '@/lib/const/report'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tag } from 'lucide-react'
import { SatisfactionStar } from '../shared'

interface Props {
  data: any[]
  t: TFn
  onRowClick: (type: string, id: string | number, label: string) => void
}

export function TagsTab({ data, t, onRowClick }: Props) {
  return (
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
  )
}
