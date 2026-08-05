'use client'

import type { TFn } from '@/lib/const/report'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DetailStatRow, StatusBadge } from '../shared'

interface Props {
  data: any
  t: TFn
}

export function CustomerDetail({ data, t }: Props) {
  if (!data) return null
  const { customer, conversationHistory } = data
  return (
    <div className="space-y-4">
      <div className="glass-card rounded-2xl p-4 md:p-5">
        <p className="text-sm font-bold mb-3">{t('reports.detail.customer', { name: customer.name })}</p>
        <DetailStatRow label={t('reports.detail.customer.totalConvos')} value={String(customer.conversations)} />
        <DetailStatRow label={t('reports.detail.customer.totalMessages')} value={String(customer.messages)} />
        <DetailStatRow label={t('reports.detail.customer.lastActive')} value={customer.lastActive} />
        <DetailStatRow label={t('reports.detail.customer.primaryChannel')} value={customer.primaryChannel} />
        <DetailStatRow label={t('reports.detail.customer.value')} value={customer.value} />
      </div>
      <div className="glass-card rounded-2xl p-4 md:p-5">
        <p className="text-xs font-semibold mb-3">{t('reports.detail.customer.conversationHistory')}</p>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-semibold">{t('reports.conversationDetail.col.id')}</TableHead>
                <TableHead className="text-xs font-semibold">{t('reports.conversations.col.date')}</TableHead>
                <TableHead className="text-xs font-semibold text-center">{t('reports.conversationDetail.col.channel')}</TableHead>
                <TableHead className="text-xs font-semibold text-center">{t('reports.conversationDetail.col.status')}</TableHead>
                <TableHead className="text-xs font-semibold">{t('reports.conversationDetail.col.agent')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.conversationDetail.col.messages')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.conversationDetail.col.resolutionTime')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(conversationHistory || []).map((c: any, i: number) => (
                <TableRow key={i} className="text-xs">
                  <TableCell className="font-mono text-[10px] text-muted-foreground">{c.id}</TableCell>
                  <TableCell className="font-medium">{c.date}</TableCell>
                  <TableCell className="text-center"><Badge variant="outline" className="text-[10px] h-5 px-1.5">{c.channel}</Badge></TableCell>
                  <TableCell className="text-center"><StatusBadge status={c.status} /></TableCell>
                  <TableCell>{c.agent}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.messages}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{c.resolutionTime}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}