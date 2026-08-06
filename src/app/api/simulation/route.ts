import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// Mock Vietnamese messages for simulation
const MOCK_MESSAGES: Record<string, string[]> = {
  website: [
    'Xin chào, tôi cần hỗ trợ về đơn hàng',
    'Tôi muốn hỏi về chính sách đổi trả',
    'Sản phẩm này còn hàng không?',
    'Giao hàng mất bao lâu vậy?',
    'Tôi có thể dùng mã giảm giá này được không?',
    'Tôi cần hủy đơn hàng DH2024001',
    'Shipper giao sai địa chỉ rồi, xử lý giúp tôi',
    'Cho tôi xin mã tracking vận đơn',
    'Sản phẩm bị lỗi, tôi muốn đổi mới',
    'Tôi muốn tư vấn về sản phẩm phù hợp',
  ],
  facebook_messenger: [
    'Ad ơi cho em hỏi sản phẩm này giá bao nhiêu ạ',
    'Tôi thấy quảng cáo trên Facebook, muốn biết thêm chi tiết',
    'Ad cho tôi xin link sản phẩm được không?',
    'Có freeship không ad ơi?',
    'Tôi muốn đặt hàng số lượng lớn, có chiết khấu không?',
    'Đã chuyển khoản, xác nhận giúp tôi nhé',
    'Ad ơi đơn hàng của tôi đến đâu rồi?',
    'Review sao trên page được không ad?',
    'Tôi muốn nhận tư vấn qua Messenger',
    'Có chương trình nào đang sale không ad?',
  ],
  chatwork: [
    '[info] Xin chào, tôi cần hỗ trợ về dịch vụ của bên bạn',
    'Cho tôi xin báo giá gói dịch vụ doanh nghiệp',
    'Tôi muốn đặt lịch demo sản phẩm mới',
    'Hợp đồng cần gia hạn, hỗ trợ tôi với',
    'Có nhân viên support trực không, tôi cần tư vấn gấp',
    'Tôi muốn phản hồi về chất lượng dịch vụ tháng qua',
    'Xin thông tin về chính sách bảo hành doanh nghiệp',
    'Yêu cầu gặp quản lý để thảo luận hợp đồng mới',
    'Tôi cần hóa đơn VAT cho đợt thanh toán vừa rồi',
    'Hỗ trợ tôi tích hợp API với hệ thống nội bộ',
  ],
  facebook_comment: [
    'Bình luận này cần hỗ trợ, admin xem giúp tôi',
    'Sản phẩm bên bạn có bảo hành không ạ?',
    'Tôi đặt hàng 3 ngày rồi chưa nhận được',
    'Cho tôi xin size L của mẫu này',
    'Giá này áp dụng đến khi nào vậy shop?',
    'Ad ơi check inbox giúp tôi với',
    'Sản phẩm bên mình có giao COD không?',
    'Review chất lượng rất tốt, worth it!',
    'Tôi muốn đổi trả sản phẩm này',
    'Có chiết khấu cho đơn hàng số lượng lớn không?',
  ],
  zalo: [
    'Chào bạn, tôi muốn tư vấn qua Zalo',
    'Cho tôi hỏi thông tin liên hệ của shop',
    'Tôi cần hỗ trợ gấp, có ai trực không?',
    'Tôi muốn đặt lịch hẹn tư vấn',
    'Xác nhận đơn hàng qua Zalo được không?',
    'Gửi ảnh sản phẩm lỗi cho bạn xem nhé',
    'Tôi muốn biết thêm về dịch vụ bảo hành',
    'Có ưu đãi cho khách hàng cũ không?',
    'Zalo OA của bên bạn hỗ trợ giờ nào?',
    'Tôi cần hóa đơn đỏ cho đơn hàng này',
  ],
  telegram: [
    'Hello, I need help with my order',
    'Can you provide the product catalog?',
    'I want to know about bulk pricing',
    'How to track my shipment?',
    'Do you have international shipping?',
    'I need a refund for my order',
    'Can you send me the latest price list?',
    'Is this product available in different colors?',
    'I would like to schedule a call with sales team',
    'Please provide your bank account details',
  ],
  email: [
    'Kính gửi bộ phận CSKH, tôi muốn phản hồi về dịch vụ',
    'Tôi cần hỗ trợ khẩn về đơn hàng #DH2024-0891',
    'Yêu cầu hoàn tiền cho đơn hàng bị hủy',
    'Xin vui lòng gửi báo giá chi tiết cho tôi',
    'Tôi muốn ký hợp đồng dịch vụ dài hạn',
    'Phản hồi về chất lượng sản phẩm nhận được',
    'Yêu cầu mở tài khoản doanh nghiệp',
    'Cần tư vấn về giải pháp tích hợp API',
  ],
};

// Active simulation timers
const activeTimers: Map<string, NodeJS.Timeout> = new Map();

// GET: SSE stream for real-time simulation events
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  let intervalId: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`));

      // Poll for new messages every 2 seconds
      intervalId = setInterval(async () => {
        try {
          const since = new Date(Date.now() - 3000).toISOString();
          const recentMessages = await db.message.findMany({
            where: {
              senderType: 'customer',
              createdAt: { gte: new Date(since) },
            },
            include: {
              conversation: {
                include: {
                  customer: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
          });

          if (recentMessages.length > 0) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'new_messages', messages: recentMessages, timestamp: new Date().toISOString() })}\n\n`)
            );
          }
        } catch {
          // DB error, skip this tick
        }
      }, 2000);

      // Keep-alive ping every 15s
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keepalive\n\n`));
        } catch {
          clearInterval(keepAlive);
        }
      }, 15000);

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        if (intervalId) clearInterval(intervalId);
        clearInterval(keepAlive);
        controller.close();
      });
    },
    cancel() {
      if (intervalId) clearInterval(intervalId);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}

// POST: Start or control simulation
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, channel, conversationId: conversationIdStr, message: customMessage } = body;

  if (action === 'send_once') {
    // Send a single mock message to a specific conversation
    if (!conversationIdStr) {
      return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
    }
    const conversationId = Number(conversationIdStr);
    if (isNaN(conversationId)) {
      return NextResponse.json({ error: 'Invalid conversationId' }, { status: 400 });
    }

    const convo = await db.conversation.findUnique({
      where: { id: conversationId },
      include: { customer: true },
    });

    if (!convo) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const messages = MOCK_MESSAGES[convo.channel] || MOCK_MESSAGES.website;
    const content = customMessage || messages[Math.floor(Math.random() * messages.length)];

    const message = await db.message.create({
      data: {
        conversationId,
        senderType: 'customer',
        senderName: convo.customer.name,
        messageType: 'text',
        content,
      },
    });

    await db.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    // Check automation rules
    let automationResult: { ruleName: string; actions: string[] } | null = null;
    if (content) {
      const rules = await db.automationRule.findMany({ where: { enabled: true } });
      const matched = rules.find((r) => content.toLowerCase().includes(r.keyword.toLowerCase()));
      if (matched) {
        const actions: string[] = [];
        if (matched.replyMessage) {
          await db.message.create({
            data: { conversationId, senderType: 'bot', senderName: 'Bot', messageType: 'text', content: matched.replyMessage },
          });
          actions.push('auto_reply');
        }
        if (matched.assignToId) {
          await db.conversation.update({ where: { id: conversationId }, data: { ownerId: matched.assignToId, updatedAt: new Date() } });
          actions.push('auto_assign');
        }
        if (matched.tagId) {
          await db.conversationTag.create({ data: { conversationId, tagId: matched.tagId } }).catch(() => {});
          actions.push('auto_tag');
        }
        automationResult = { ruleName: matched.name, actions };
      }
    }

    return NextResponse.json({ message, automationResult });
  }

  if (action === 'start_auto') {
    // Start automatic simulation — sends random messages to random open conversations
    const simId = `sim_${Date.now()}`;
    const targetChannel = channel || 'all';

    const sendMessage = async () => {
      try {
        const where: Record<string, unknown> = { status: 'open' };
        if (targetChannel !== 'all') where.channel = targetChannel;

        const convos = await db.conversation.findMany({
          where,
          include: { customer: true },
          take: 20,
        });

        if (convos.length === 0) return;

        const convo = convos[Math.floor(Math.random() * convos.length)];
        const messages = MOCK_MESSAGES[convo.channel] || MOCK_MESSAGES.website;
        const content = messages[Math.floor(Math.random() * messages.length)];

        await db.message.create({
          data: {
            conversationId: convo.id,
            senderType: 'customer',
            senderName: convo.customer.name,
            messageType: 'text',
            content,
          },
        });

        await db.conversation.update({
          where: { id: convo.id },
          data: { updatedAt: new Date() },
        });

        // Check automation
        const rules = await db.automationRule.findMany({ where: { enabled: true } });
        const matched = rules.find((r) => content.toLowerCase().includes(r.keyword.toLowerCase()));
        if (matched && matched.replyMessage) {
          await db.message.create({
            data: { conversationId: convo.id, senderType: 'bot', senderName: 'Bot', messageType: 'text', content: matched.replyMessage },
          });
        }
      } catch {
        // Simulation error, skip
      }
    };

    // Send first message immediately
    await sendMessage();

    // Then send at random intervals (3-8 seconds)
    const scheduleNext = () => {
      const delay = 3000 + Math.random() * 5000;
      const timer = setTimeout(async () => {
        await sendMessage();
        scheduleNext();
      }, delay);
      activeTimers.set(simId, timer);
    };
    scheduleNext();

    return NextResponse.json({ simId, status: 'started', channel: targetChannel });
  }

  if (action === 'stop_auto') {
    // Stop all active simulations
    for (const [id, timer] of activeTimers.entries()) {
      clearTimeout(timer);
      activeTimers.delete(id);
    }
    return NextResponse.json({ status: 'stopped' });
  }

  if (action === 'status') {
    return NextResponse.json({
      activeSimulations: activeTimers.size,
      simulationIds: Array.from(activeTimers.keys()),
    });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}