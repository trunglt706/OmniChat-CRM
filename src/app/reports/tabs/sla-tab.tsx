'use client'

import type { TFn } from '@/lib/const/report'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface Props {
  data: any[]
  t: TFn
}

export function SlaTab({ data, t }: Props) {
  return (
    <div className="glass-card rounded-2xl p-4 md:p-5">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-semibold">{t('reports.sla.col.metric')}</TableHead>
              <TableHead className="text-xs font-semibold text-center">{t('reports.sla.col.target')}</TableHead>
              <TableHead className="text-xs font-semibold text-center">{t('reports.sla.col.actual')}</TableHead>
              <TableHead className="text-xs font-semibold text-right">{t('reports.sla.col.compliance')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, i) => {
              const complianceNum = parseInt(row.compliance) || 0
              return (
                <TableRow key={i} className="text-xs">
                  <TableCell className="font-medium">{row.metric}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-[10px] h-5 px-2 font-mono">{row.target}</Badge>
                  </TableCell>
                  <TableCell className="text-center tabular-nums font-medium">{row.actual}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary" className={cn(
                      'text-[10px] h-5 px-2 font-mono font-semibold',
                      complianceNum >= 85 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15'
                        : complianceNum >= 70 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/15'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/15'
                    )}>
                      {row.compliance}
                    </Badge>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
