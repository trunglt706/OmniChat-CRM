import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { message, conversationId: conversationIdStr, customerName } = await request.json();

  if (!message || !conversationIdStr) {
    return NextResponse.json({ error: 'message and conversationId required' }, { status: 400 });
  }

  const conversationId = Number(conversationIdStr);
  if (isNaN(conversationId)) {
    return NextResponse.json({ error: 'Invalid conversationId' }, { status: 400 });
  }

  // Get conversation context for better AI response
  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    include: {
      customer: true,
      messages: { orderBy: { createdAt: 'desc' }, take: 10 },
      tags: { include: { tag: true } },
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  const recentMessages = conversation.messages
    .map((m) => `${m.senderType === 'customer' ? customerName || 'Khách hàng' : m.senderName || 'Agent'}: ${m.content}`)
    .reverse()
    .join('\n');

  const tags = conversation.tags.map((ct) => ct.tag.name).join(', ');

  // Build system prompt based on conversation context
  const systemPrompt = `Bạn là AI Assistant cho OmniChat CRM - hệ thống hỗ trợ khách hàng đa kênh.
Khách hàng: ${conversation.customer.name}${conversation.customer.company ? ' (' + conversation.customer.company + ')' : ''}
Kênh: ${conversation.channel}
${tags ? 'Tags: ' + tags : ''}

Quy tắc:
- Trả lời ngắn gọn, lịch sự, chuyên nghiệp bằng tiếng Việt
- Tập trung vào vấn đề khách hàng đang hỏi
- Nếu cần thông tin thêm, hãy hỏi rõ ràng
- Không tự tạo ưu đãi hay cam kết không có trong context
- Nếu không chắc, đề xuất chuyển cho nhân viên hỗ trợ
- Trả lời trong 1-3 câu ngắn gọn

Lịch sử hội thoại gần đây:
${recentMessages}`;

  try {
    // Use z-ai-web-dev-sdk for AI completion
    const Z = (await import('z-ai-web-dev-sdk')).default;
    const client = await Z.create();
    const response = await client.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      temperature: 0.7,
      maxTokens: 200,
    });

    const aiReply = typeof response === 'string'
      ? response
      : response?.choices?.[0]?.message?.content || 'Xin lỗi, tôi không thể xử lý yêu cầu này lúc này.';

    return NextResponse.json({ reply: aiReply });
  } catch (error) {
    console.error('Bot API error:', error);
    // Fallback: check automation rules
    const rules = await db.automationRule.findMany({ where: { enabled: true } });
    const matchedRule = rules.find((r) =>
      message.toLowerCase().includes(r.keyword.toLowerCase())
    );

    if (matchedRule?.replyMessage) {
      return NextResponse.json({ reply: matchedRule.replyMessage, isAutomation: true });
    }

    return NextResponse.json({
      reply: 'Cảm ơn bạn đã liên hệ! Nhân viên hỗ trợ sẽ phản hồi sớm nhất.',
    });
  }
}
