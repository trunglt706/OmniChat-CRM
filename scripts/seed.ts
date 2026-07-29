import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const now = new Date()
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60000)
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600000)
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000)

async function main() {
  // Clean up
  await prisma.auditLog.deleteMany()
  await prisma.internalNote.deleteMany()
  await prisma.conversationTag.deleteMany()
  await prisma.message.deleteMany()
  await prisma.lead.deleteMany()
  await prisma.tag.deleteMany()
  await prisma.conversation.deleteMany()
  await prisma.customerIdentity.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.user.deleteMany()
  await prisma.organization.deleteMany()

  // Organization
  const org = await prisma.organization.create({
    data: { name: 'TechVN Solutions' },
  })

  // Users (Agents)
  const agents = await Promise.all([
    prisma.user.create({
      data: { email: 'admin@techvn.vn', name: 'Nguyễn Văn Admin', avatar: null, role: 'admin', status: 'online', organizationId: org.id },
    }),
    prisma.user.create({
      data: { email: 'supervisor@techvn.vn', name: 'Trần Thị Supervisor', avatar: null, role: 'supervisor', status: 'online', organizationId: org.id },
    }),
    prisma.user.create({
      data: { email: 'minh@techvn.vn', name: 'Phạm Minh Tuấn', avatar: null, role: 'agent', status: 'online', organizationId: org.id },
    }),
    prisma.user.create({
      data: { email: 'lan@techvn.vn', name: 'Ngô Thị Lan', avatar: null, role: 'agent', status: 'busy', organizationId: org.id },
    }),
    prisma.user.create({
      data: { email: 'hoa@techvn.vn', name: 'Lê Hoàng Hoa', avatar: null, role: 'agent', status: 'offline', organizationId: org.id },
    }),
  ])

  // Tags
  const tags = await Promise.all([
    prisma.tag.create({ data: { name: 'VIP', color: '#f59e0b', description: 'Khách hàng VIP' } }),
    prisma.tag.create({ data: { name: 'New Lead', color: '#3b82f6', description: 'Khách hàng mới' } }),
    prisma.tag.create({ data: { name: 'Hot Lead', color: '#ef4444', description: 'Khách hàng tiềm năng cao' } }),
    prisma.tag.create({ data: { name: 'Complaint', color: '#dc2626', description: 'Khiếu nại' } }),
    prisma.tag.create({ data: { name: 'Spam', color: '#6b7280', description: 'Spam' } }),
    prisma.tag.create({ data: { name: 'Need Follow', color: '#8b5cf6', description: 'Cần follow-up' } }),
    prisma.tag.create({ data: { name: 'Potential', color: '#10b981', description: 'Tiềm năng' } }),
    prisma.tag.create({ data: { name: 'Repeat Customer', color: '#06b6d4', description: 'Khách hàng quay lại' } }),
  ])

  // Customers
  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        name: 'Nguyễn Thanh Hà', phone: '0901234567', email: 'hah.nt@email.com',
        gender: 'female', company: 'Công ty ABC', address: 'Quận 1, TP.HCM',
        note: 'Khách VIP, ưu tiên hỗ trợ nhanh',
        identities: {
          create: [
            {
              platform: 'facebook', platformUserId: 'fb_1001', platformPageId: 'page_001',
              platformUserName: 'ha.nguyenthanh',
            },
            {
              platform: 'email', platformUserId: 'hah.nt@email.com',
              platformUserName: 'hah.nt@email.com',
            },
          ],
        },
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Trần Quốc Bảo', phone: '0912345678', email: 'bao.tq@email.com',
        gender: 'male', company: 'Bảo Châu Trading',
        identities: {
          create: {
            platform: 'zalo', platformUserId: 'zalo_2001', platformPageId: 'oa_001',
            platformUserName: 'bao.tranquoc',
          },
        },
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Lê Minh Châu', phone: '0923456789', email: 'chau.lm@email.com',
        gender: 'female',
        identities: {
          create: [
            { platform: 'telegram', platformUserId: 'tg_3001', platformUserName: 'chau_minh' },
            { platform: 'website', platformUserId: 'web_sess_3001' },
          ],
        },
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Phạm Văn Đức', phone: '0934567890', email: 'duc.pv@email.com',
        gender: 'male', company: 'DucPham Corp', address: 'Hà Nội',
        identities: {
          create: {
            platform: 'facebook', platformUserId: 'fb_4001', platformPageId: 'page_001',
            platformUserName: 'duc.phamvan',
          },
        },
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Hoàng Thị Mai', phone: '0945678901', email: 'mai.ht@email.com',
        gender: 'female', company: 'Mai Trading',
        identities: {
          create: [
            { platform: 'zalo', platformUserId: 'zalo_5001', platformPageId: 'oa_001', platformUserName: 'mai.hoang' },
            { platform: 'facebook', platformUserId: 'fb_5001', platformPageId: 'page_001', platformUserName: 'mai.hoangthi' },
          ],
        },
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Võ Đình Khoa', phone: '0956789012', email: 'khoa.vd@email.com',
        gender: 'male', company: 'KhoaTech', address: 'Đà Nẵng',
        identities: {
          create: {
            platform: 'website', platformUserId: 'web_sess_6001',
          },
        },
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Đỗ Thu Phương', phone: '0967890123', email: 'phuong.dt@email.com',
        gender: 'female',
        identities: {
          create: {
            platform: 'telegram', platformUserId: 'tg_7001', platformUserName: 'phuong_do',
          },
        },
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Bùi Quang Huy', phone: '0978901234', email: 'huy.bq@email.com',
        gender: 'male', company: 'HuyBui Solutions',
        identities: {
          create: [
            {
              platform: 'facebook', platformUserId: 'fb_8001', platformPageId: 'page_001',
              platformUserName: 'huy.buiquang',
            },
            {
              platform: 'email', platformUserId: 'huy.bq@email.com',
              platformUserName: 'huy.bq@email.com',
            },
          ],
        },
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Ngô Thùy Trang', phone: '0989012345', email: 'trang.nt@email.com',
        gender: 'female', company: 'Trang Beauty', address: 'Quận 3, TP.HCM',
        identities: {
          create: {
            platform: 'zalo', platformUserId: 'zalo_9001', platformPageId: 'oa_001',
            platformUserName: 'trang.ngothuy',
          },
        },
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Lý Văn Tâm', phone: '0990123456',
        gender: 'male',
        identities: {
          create: {
            platform: 'website', platformUserId: 'web_sess_10001',
          },
        },
      },
    }),
  ])

  // Conversations with Messages
  const convoData = [
    { customerIdx: 0, channel: 'facebook_messenger', status: 'open', priority: 'high', ownerIdx: 2, unread: true, tagIdxs: [0, 2], subject: 'Hỏi về gói Enterprise', slaViolated: false },
    { customerIdx: 1, channel: 'zalo', status: 'open', priority: 'medium', ownerIdx: null, unread: true, tagIdxs: [1, 5], subject: null, slaViolated: false },
    { customerIdx: 2, channel: 'telegram', status: 'open', priority: 'low', ownerIdx: 3, unread: true, tagIdxs: [1], subject: null, slaViolated: false },
    { customerIdx: 3, channel: 'facebook_messenger', status: 'pending', priority: 'urgent', ownerIdx: 2, unread: false, tagIdxs: [2, 3], subject: 'Khiếu nại giao hàng chậm', slaViolated: true },
    { customerIdx: 4, channel: 'zalo', status: 'open', priority: 'medium', ownerIdx: 3, unread: true, tagIdxs: [0, 7], subject: 'Đặt hàng lặp lại', slaViolated: false },
    { customerIdx: 5, channel: 'website', status: 'open', priority: 'medium', ownerIdx: null, unread: true, tagIdxs: [1, 6], subject: null, slaViolated: false },
    { customerIdx: 6, channel: 'telegram', status: 'resolved', priority: 'low', ownerIdx: 4, unread: false, tagIdxs: [], subject: null, slaViolated: false },
    { customerIdx: 7, channel: 'facebook_messenger', status: 'open', priority: 'high', ownerIdx: 2, unread: true, tagIdxs: [2, 5], subject: 'Yêu cầu báo giá dự án', slaViolated: false },
    { customerIdx: 8, channel: 'zalo', status: 'open', priority: 'medium', ownerIdx: 3, unread: false, tagIdxs: [0, 7], subject: null, slaViolated: false },
    { customerIdx: 9, channel: 'website', status: 'spam', priority: 'low', ownerIdx: null, unread: false, tagIdxs: [4], subject: null, slaViolated: false },
    { customerIdx: 0, channel: 'zalo', status: 'open', priority: 'medium', ownerIdx: 3, unread: true, tagIdxs: [0], subject: 'Hỏi giá qua Zalo', slaViolated: false },
    { customerIdx: 1, channel: 'facebook_messenger', status: 'resolved', priority: 'low', ownerIdx: 4, unread: false, tagIdxs: [], subject: null, slaViolated: false },
    { customerIdx: 0, channel: 'email', status: 'open', priority: 'high', ownerIdx: 2, unread: true, tagIdxs: [0, 2], subject: 'Yêu cầu hỗ trợ tích hợp API - TechVN Solutions', slaViolated: false },
    { customerIdx: 7, channel: 'email', status: 'open', priority: 'medium', ownerIdx: null, unread: true, tagIdxs: [1, 6], subject: 'Hỏi đáp về báo giá dịch vụ CRM', slaViolated: false },
  ]

  const messageTemplates: Record<string, Array<{ senderType: string; senderName: string; content: string; messageType?: string; minutesAgo: number }>> = {
    0: [
      { senderType: 'customer', senderName: 'Nguyễn Thanh Hà', content: 'Xin chào, tôi muốn tìm hiểu về gói Enterprise của bên bạn.', minutesAgo: 45 },
      { senderType: 'agent', senderName: 'Phạm Minh Tuấn', content: 'Dạ chào chị Hà! Cảm ơn chị đã quan tâm đến gói Enterprise. Em xin giới thiệu briefly:', minutesAgo: 43 },
      { senderType: 'agent', senderName: 'Phạm Minh Tuấn', content: 'Gói Enterprise bao gồm:\n- Không giới hạn user\n- API unlimited\n- Hỗ trợ 24/7\n- Custom integration\n- SLA 99.9% uptime', minutesAgo: 42 },
      { senderType: 'customer', senderName: 'Nguyễn Thanh Hà', content: 'Giá bao nhiêu vậy anh?', minutesAgo: 30 },
      { senderType: 'agent', senderName: 'Phạm Minh Tuấn', content: 'Gói Enterprise có giá từ 15.000.000 VNĐ/tháng tùy số lượng user và tính năng custom ạ. Em sẽ gửi bảng giá chi tiết qua email cho chị nhé.', minutesAgo: 28 },
      { senderType: 'customer', senderName: 'Nguyễn Thanh Hà', content: 'Ok, gửi email cho mình nhé. Mình cũng muốn hỏi thêm về tính năng multi-channel.', minutesAgo: 5 },
    ],
    1: [
      { senderType: 'customer', senderName: 'Trần Quốc Bảo', content: 'Cho mình hỏi sản phẩm X còn hàng không?', minutesAgo: 120 },
      { senderType: 'customer', senderName: 'Trần Quốc Bảo', content: 'Mình cần gấp, trả lời sớm giúp mình nhé', minutesAgo: 60 },
    ],
    2: [
      { senderType: 'customer', senderName: 'Lê Minh Châu', content: 'Hi, tôi muốn đăng ký dùng thử', minutesAgo: 180 },
      { senderType: 'bot', senderName: 'Bot', content: 'Chào bạn! Để đăng ký dùng thử, vui lòng cung cấp email công ty của bạn.', minutesAgo: 179 },
      { senderType: 'customer', senderName: 'Lê Minh Châu', content: 'chau.lm@email.com', minutesAgo: 175 },
      { senderType: 'agent', senderName: 'Ngô Thị Lan', content: 'Cảm ơn Châu! Mình đã tạo tài khoản dùng thử cho bạn. Bạn check email nhé.', minutesAgo: 170 },
      { senderType: 'customer', senderName: 'Lê Minh Châu', content: 'Ok thanks! Mình sẽ thử xem sao.', minutesAgo: 10 },
    ],
    3: [
      { senderType: 'customer', senderName: 'Phạm Văn Đức', content: 'Tôi đặt hàng từ 5 ngày trước mà vẫn chưa nhận được! Giao hàng chậm quá!', minutesAgo: 300 },
      { senderType: 'agent', senderName: 'Phạm Minh Tuấn', content: 'Dạ anh Đức xin lỗi về sự bất tiện này. Em sẽ kiểm tra ngay đơn hàng của anh.', minutesAgo: 295 },
      { senderType: 'agent', senderName: 'Phạm Minh Tuấn', content: 'Anh ơi, đơn hàng DH-2024-0891 đang được vận chuyển bởi GHN, mã vận đơn: GHN789456. Dự kiến giao ngày mai ạ.', minutesAgo: 290 },
      { senderType: 'customer', senderName: 'Phạm Văn Đức', content: 'Ngày mai nữa á? Phí ship mình trả rồi mà giao chậm vậy. Không chấp nhận được!', minutesAgo: 280 },
      { senderType: 'agent', senderName: 'Phạm Minh Tuấn', content: 'Dạ em rất hiểu sự bức xúc của anh. Em sẽ phản hồi với bộ phận vận chuyển và yêu cầu giao gấp trong hôm nay. Em xin phép chuyển lên supervisor xử lý cho anh ạ.', minutesAgo: 275 },
      { senderType: 'system', senderName: 'Hệ thống', content: 'Hội thoại đã được chuyển sang trạng thái Pending', messageType: 'event', minutesAgo: 275 },
    ],
    4: [
      { senderType: 'customer', senderName: 'Hoàng Thị Mai', content: 'Mình muốn đặt lại sản phẩm Y như lần trước nhé', minutesAgo: 90 },
      { senderType: 'agent', senderName: 'Ngô Thị Lan', content: 'Dạ vâng chị Mai ơi! Sản phẩm Y hiện đang có giá khuyến mãi 890K (giá gốc 1.2M). Chị đặt bao nhiêu ạ?', minutesAgo: 85 },
      { senderType: 'customer', senderName: 'Hoàng Thị Mai', content: 'Wow giá tốt quá! Mình lấy 5 cái. Ship về địa chỉ cũ nhé.', minutesAgo: 80 },
      { senderType: 'agent', senderName: 'Ngô Thị Lan', content: 'Dạ em đã tạo đơn hàng cho chị. Tổng: 4.450.000 VNĐ (đã giảm 1.550K). Chị thanh toán qua chuyển khoản hay COD ạ?', minutesAgo: 75 },
      { senderType: 'customer', senderName: 'Hoàng Thị Mai', content: 'Chuyển khoản nhé, send STK cho mình', minutesAgo: 3 },
    ],
    5: [
      { senderType: 'customer', senderName: 'Võ Đình Khoa', content: 'Tôi cần tư vấn giải pháp cho doanh nghiệp của tôi', minutesAgo: 200 },
      { senderType: 'bot', senderName: 'Bot', content: 'Chào bạn! Bạn cần tư vấn về lĩnh vực nào? 1. Marketing 2. Sales 3. Support 4. Khác', minutesAgo: 199 },
      { senderType: 'customer', senderName: 'Võ Đình Khoa', content: '3. Support - chúng tôi cần hệ thống quản lý ticket', minutesAgo: 195 },
    ],
    6: [
      { senderType: 'customer', senderName: 'Đỗ Thu Phương', content: 'Cảm ơn hỗ trợ nhé!', minutesAgo: 500 },
      { senderType: 'agent', senderName: 'Lê Hoàng Hoa', content: 'Không có gì ạ! Chúc chị một ngày tốt lành 😊', minutesAgo: 498 },
      { senderType: 'system', senderName: 'Hệ thống', content: 'Hội thoại đã được đánh dấu là Resolved', messageType: 'event', minutesAgo: 490 },
    ],
    7: [
      { senderType: 'customer', senderName: 'Bùi Quang Huy', content: 'Chào, công ty mình đang tìm giải pháp CRM cho đội sales 50 người. Có thể báo giá không?', minutesAgo: 60 },
      { senderType: 'agent', senderName: 'Phạm Minh Tuấn', content: 'Dạ chào anh Huy! Với đội 50 người, em recommend gói Business. Em sẽ gửi proposal chi tiết trong hôm nay ạ.', minutesAgo: 55 },
      { senderType: 'customer', senderName: 'Bùi Quang Huy', content: 'OK, mình cần proposal nhanh vì sếp muốn review tuần sau.', minutesAgo: 8 },
    ],
    8: [
      { senderType: 'customer', senderName: 'Ngô Thùy Trang', content: 'Mình muốn hỏi chương trình loyalty cho khách hàng cũ', minutesAgo: 400 },
      { senderType: 'agent', senderName: 'Ngô Thị Lan', content: 'Dạ chị Trang ơi! Chương trình loyalty hiện tại: tích điểm mỗi đơn 1%, đổi voucher khi đủ 100 điểm ạ.', minutesAgo: 395 },
      { senderType: 'customer', senderName: 'Ngô Thùy Trang', content: 'Ok hiểu rồi. Thanks!', minutesAgo: 390 },
    ],
    9: [
      { senderType: 'customer', senderName: 'Lý Văn Tâm', content: 'aaaaaa', minutesAgo: 1000 },
      { senderType: 'customer', senderName: 'Lý Văn Tâm', content: 'mua hàng ở đâu', minutesAgo: 999 },
    ],
    10: [
      { senderType: 'customer', senderName: 'Nguyễn Thanh Hà', content: 'Cho mình hỏi giá gói Pro qua Zalo nhé', minutesAgo: 15 },
    ],
    11: [
      { senderType: 'customer', senderName: 'Trần Quốc Bảo', content: 'Ok thanks', minutesAgo: 1500 },
      { senderType: 'agent', senderName: 'Lê Hoàng Hoa', content: 'Không có gì ạ!', minutesAgo: 1498 },
      { senderType: 'system', senderName: 'Hệ thống', content: 'Hội thoại đã được đánh dấu là Resolved', messageType: 'event', minutesAgo: 1490 },
    ],
    12: [
      { senderType: 'customer', senderName: 'Nguyễn Thanh Hà', content: 'Kính gửi bộ phận kỹ thuật OmniChat,\n\nTôi là Nguyễn Thanh Hà, Giám đốc kỹ thuật tại Công ty ABC. Chúng tôi đang sử dụng gói Enterprise và muốn tích hợp API của OmniChat vào hệ thống nội bộ.\n\nCụ thể, chúng tôi cần:\n1. REST API endpoint cho gửi/nhận tin nhắn\n2. Webhook callback cho event realtime\n3. SDK cho Node.js\n\nXin vui lòng cung cấp tài liệu API và hướng dẫn tích hợp.\n\nTrân trọng,\nNguyễn Thanh Hà', minutesAgo: 25 },
      { senderType: 'agent', senderName: 'Phạm Minh Tuấn', content: 'Dạ chị Hà ơi, cảm ơn chị đã liên hệ. Em đã chuyển yêu cầu đến team API. Dự kiến trong vòng 2h sẽ có phản hồi chi tiết về tài liệu và endpoint ạ.', minutesAgo: 20 },
    ],
    13: [
      { senderType: 'customer', senderName: 'Bùi Quang Huy', content: 'Chào OmniChat team,\n\nTôi là Bùi Quang Huy từ HuyBui Solutions. Tôi muốn hỏi về báo giá dịch vụ CRM cho doanh nghiệp.\n\nChúng tôi có đội ngũ sales khoảng 50 người và đang tìm kiếm giải pháp quản lý khách hàng đa kênh.\n\nXin vui lòng gửi báo giá chi tiết qua email này.\n\nBest regards,\nBùi Quang Huy', minutesAgo: 40 },
    ],
  }

  const conversations = []
  for (const cd of convoData) {
    const customer = customers[cd.customerIdx]
    const owner = cd.ownerIdx !== null ? agents[cd.ownerIdx] : null
    const slaFirst = minutesAgo(cd.slaViolated ? 10 : 5)
    const slaResolve = hoursAgo(cd.slaViolated ? 2 : 24)

    const convo = await prisma.conversation.create({
      data: {
        customerId: customer.id,
        channel: cd.channel,
        status: cd.status,
        priority: cd.priority,
        subject: cd.subject,
        ownerId: owner?.id,
        slaFirstResponse: slaFirst,
        slaResolve: slaResolve,
        tags: {
          create: cd.tagIdxs.map((ti) => ({ tagId: tags[ti].id })),
        },
        messages: {
          create: messageTemplates[String(convoData.indexOf(cd))]?.map((m, mi) => ({
            senderType: m.senderType,
            senderId: m.senderType === 'agent' ? owner?.id : m.senderType === 'bot' ? 'bot' : null,
            senderName: m.senderName,
            messageType: m.messageType || 'text',
            content: m.content,
            isRead: !cd.unread || mi < (messageTemplates[String(convoData.indexOf(cd))]?.length || 1) - 1,
            createdAt: minutesAgo(m.minutesAgo),
          })) || [],
        },
      },
      include: { messages: true, tags: { include: { tag: true } } },
    })
    conversations.push(convo)
  }

  // Internal Notes
  await Promise.all([
    prisma.internalNote.create({
      data: {
        conversationId: conversations[0].id,
        customerId: customers[0].id,
        authorId: agents[2].id,
        content: 'Khách VIP, từng mua Enterprise năm ngoái. Ưu tiên hỗ trợ nhanh. Sếp đã direct intro.',
        isPinned: true,
      },
    }),
    prisma.internalNote.create({
      data: {
        conversationId: conversations[3].id,
        customerId: customers[3].id,
        authorId: agents[2].id,
        content: 'Khách đang rất bức xúc vì giao hàng chậm. Cần xử lý gấp, có thể cân nhắc hoàn phí ship.',
        isPinned: true,
      },
    }),
    prisma.internalNote.create({
      data: {
        conversationId: conversations[7].id,
        customerId: customers[7].id,
        authorId: agents[2].id,
        content: 'Dự án tiềm năng, team 50 người. Cần gửi proposal trước thứ 6.',
        isPinned: false,
      },
    }),
  ])

  // Leads
  await Promise.all([
    prisma.lead.create({
      data: {
        customerId: customers[0].id,
        conversationId: conversations[0].id,
        source: 'organic',
        campaign: null,
        status: 'proposal',
        value: 180000000,
        ownerId: agents[2].id,
        nextFollowup: daysAgo(-1),
        probability: 70,
        notes: 'Quan tâm gói Enterprise, đã gửi bảng giá',
      },
    }),
    prisma.lead.create({
      data: {
        customerId: customers[7].id,
        conversationId: conversations[7].id,
        source: 'facebook_ads',
        campaign: 'CRM_Q3_2025',
        status: 'qualified',
        value: 360000000,
        ownerId: agents[2].id,
        nextFollowup: daysAgo(-2),
        probability: 50,
        notes: 'Team 50 người, cần proposal tuần sau',
      },
    }),
    prisma.lead.create({
      data: {
        customerId: customers[5].id,
        conversationId: conversations[5].id,
        source: 'website',
        status: 'contacted',
        value: null,
        probability: 20,
        notes: 'Tìm hiểu về giải pháp support/ticket',
      },
    }),
  ])

  // Audit Logs
  await Promise.all([
    prisma.auditLog.create({ data: { userId: agents[2].id, action: 'assign', entityType: 'conversation', entityId: conversations[0].id, details: '{"to":"Phạm Minh Tuấn"}' } }),
    prisma.auditLog.create({ data: { userId: agents[2].id, action: 'reply', entityType: 'message', entityId: conversations[0].messages[1]?.id || '', details: null } }),
    prisma.auditLog.create({ data: { userId: agents[1].id, action: 'status_change', entityType: 'conversation', entityId: conversations[3].id, details: '{"from":"open","to":"pending"}' } }),
  ])

  console.log('✅ Seed completed successfully!')
  console.log(`  - ${agents.length} agents`)
  console.log(`  - ${customers.length} customers`)
  console.log(`  - ${conversations.length} conversations`)
  console.log(`  - ${tags.length} tags`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
