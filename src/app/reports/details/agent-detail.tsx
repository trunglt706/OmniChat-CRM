'use client'

import type { TFn } from '@/lib/const/report'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DetailStatRow, SatisfactionStar, StatusBadge } from '../shared'

interface Props {
  data: any
  t: TFn
}

export function AgentDetail({ data, t }: Props) {
  if (!data || !data.agent) return null
  const { agent, recentConversations = [] } = data
  return (
    <div className="space-y-4">
      <div className="glass-card rounded-2xl p-4 md:p-5">
        <p className="text-sm font-bold mb-3">{t('reports.detail.agent', { name: agent.name })}</p>
        <DetailStatRow label={t('reports.detail.agent.totalConvos')} value={String(agent.conversations)} />
        <DetailStatRow label={t('reports.detail.agent.totalMessages')} value={String(agent.messages)} />
        <DetailStatRow label={t('reports.detail.agent.avgResponseTime')} value={agent.avgResponseTime} />
        <DetailStatRow label={t('reports.detail.agent.resolvedCount')} value={String(agent.resolved)} />
        <DetailStatRow label={t('reports.detail.agent.satisfaction')} value={`${agent.satisfaction} ★`} />
        <DetailStatRow label={t('reports.detail.agent.activeHours')} value={agent.activeHours} />
      </div>
      <div className="glass-card rounded-2xl p-4 md:p-5">
        <p className="text-xs font-semibold mb-3">{t('reports.detail.agent.recentConversations')}</p>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-semibold">{t('reports.conversationDetail.col.id')}</TableHead>
                <TableHead className="text-xs font-semibold">{t('reports.conversationDetail.col.customer')}</TableHead>
                <TableHead className="text-xs font-semibold text-center">{t('reports.conversationDetail.col.channel')}</TableHead>
                <TableHead className="text-xs font-semibold text-center">{t('reports.conversationDetail.col.status')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.conversationDetail.col.messages')}</TableHead>
                <TableHead className="text-xs font-semibold text-right">{t('reports.conversationDetail.col.satisfaction')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(recentConversations || []).map((c: any, i: number) => (
                <TableRow key={i} className="text-xs">
                  <TableCell className="font-mono text-[10px] text-muted-foreground">{c.id}</TableCell>
                  <TableCell className="font-medium">{c.customer}</TableCell>
                  <TableCell className="text-center"><Badge variant="outline" className="text-[10px] h-5 px-1.5">{c.channel}</Badge></TableCell>
                  <TableCell className="text-center"><StatusBadge status={c.status} /></TableCell>
                  <TableCell className="text-right tabular-nums">{c.messages}</TableCell>
                  <TableCell className="text-right tabular-nums"><SatisfactionStar value={c.satisfaction} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}