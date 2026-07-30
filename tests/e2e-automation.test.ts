/**
 * E2E Test: Keyword Auto-Reply Automation
 * 
 * Tests that when a customer sends a message containing a keyword
 * that matches an automation rule, the bot auto-replies correctly.
 * 
 * Run: npx tsx tests/e2e-automation.test.ts
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

interface TestResult {
  name: string
  passed: boolean
  duration: number
  error?: string
  details?: string
}

const results: TestResult[] = []

async function test(name: string, fn: () => Promise<void>) {
  const start = Date.now()
  try {
    await fn()
    results.push({ name, passed: true, duration: Date.now() - start })
    console.log(`  ✅ ${name} (${Date.now() - start}ms)`)
  } catch (e: any) {
    results.push({ name, passed: false, duration: Date.now() - start, error: e.message, details: e.stack })
    console.log(`  ❌ ${name} (${Date.now() - start}ms)`)
    console.log(`     ${e.message}`)
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`)
}

// ====== Test Suite ======

async function runTests() {
  console.log('\n🧪 OmniChat E2E Automation Tests')
  console.log('='.repeat(50))

  // Test 1: API Health Check
  await test('API server is running', async () => {
    const res = await fetch(`${BASE_URL}/api/conversations`)
    assert(res.ok, `Expected 200, got ${res.status}`)
    const data = await res.json()
    assert(Array.isArray(data.data), 'Expected data array')
    console.log(`     Found ${data.data.length} conversations`)
  })

  // Test 2: Automation rules exist
  await test('Automation rules are loaded', async () => {
    const res = await fetch(`${BASE_URL}/api/automation/rules`)
    assert(res.ok, `Expected 200, got ${res.status}`)
    const rules = await res.json()
    assert(Array.isArray(rules) && rules.length > 0, 'Expected at least 1 automation rule')
    console.log(`     Found ${rules.length} automation rules`)
  })

  // Get a conversation for testing
  let testConversationId = ''
  await test('Get open conversation for testing', async () => {
    const res = await fetch(`${BASE_URL}/api/conversations?status=open`)
    const data = await res.json()
    assert(data.data.length > 0, 'No open conversations found')
    testConversationId = data.data[0].id
    console.log(`     Using conversation: ${testConversationId.substring(0, 8)}...`)
  })

  // Test 3: Get initial message count
  let initialMessageCount = 0
  await test('Get initial message count', async () => {
    const res = await fetch(`${BASE_URL}/api/conversations/${testConversationId}/messages`)
    const messages = await res.json()
    initialMessageCount = messages.length
    assert(initialMessageCount > 0, 'Expected at least 1 message')
    console.log(`     Initial messages: ${initialMessageCount}`)
  })

  // Test 4: Get automation rules to find a keyword
  let testKeyword = ''
  let testReply = ''
  await test('Identify testable automation rule', async () => {
    const res = await fetch(`${BASE_URL}/api/automation/rules`)
    const rules = await res.json()
    const ruleWithReply = rules.find((r: any) => r.keyword && r.replyMessage && r.enabled)
    assert(ruleWithReply, 'No enabled rule with keyword + reply found')
    testKeyword = ruleWithReply.keyword
    testReply = ruleWithReply.replyMessage
    console.log(`     Keyword: "${testKeyword}" → Reply: "${testReply.substring(0, 50)}..."`)
  })

  // Test 5: Send message with keyword as customer (should trigger auto-reply)
  let sendMessageResponse: any = null
  await test(`Send message with keyword "${testKeyword}" as customer`, async () => {
    const res = await fetch(`${BASE_URL}/api/conversations/${testConversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `Xin chào, tôi muốn hỏi về ${testKeyword}`,
        senderType: 'customer',
        senderName: 'Test Customer',
      }),
    })
    assert(res.status === 201, `Expected 201, got ${res.status}`)
    sendMessageResponse = await res.json()
    assert(sendMessageResponse.message, 'Expected message in response')
    console.log(`     Message sent: "${sendMessageResponse.message.content?.substring(0, 40)}..."`)
  })

  // Test 6: Verify automation was triggered
  await test('Verify automation rule was triggered', async () => {
    assert(sendMessageResponse.automationResult, 'Expected automationResult in response')
    assert(sendMessageResponse.automationResult.actions, 'Expected actions in automationResult')
    assert(
      sendMessageResponse.automationResult.actions.includes('auto_reply'),
      'Expected auto_reply action'
    )
    console.log(`     Rule: "${sendMessageResponse.automationResult.ruleName}"`) 
    console.log(`     Actions: ${sendMessageResponse.automationResult.actions.join(', ')}`)
  })

  // Test 7: Verify bot reply message exists
  await test('Verify bot auto-reply message was created', async () => {
    const res = await fetch(`${BASE_URL}/api/conversations/${testConversationId}/messages`)
    const messages = await res.json()
    assert(messages.length > initialMessageCount, 'Expected more messages after auto-reply')
    
    const botMessages = messages.filter((m: any) => m.senderType === 'bot')
    assert(botMessages.length > 0, 'Expected at least 1 bot message')
    
    const lastBotMessage = botMessages[botMessages.length - 1]
    assert(lastBotMessage.content === testReply, `Bot reply mismatch: "${lastBotMessage.content}" !== "${testReply}"`)
    console.log(`     Bot replied: "${testReply.substring(0, 60)}..."`)
  })

  // Test 8: Send message WITHOUT keyword (should NOT trigger auto-reply)
  let normalResponse: any = null
  await test('Send normal message without keyword (no automation)', async () => {
    const res = await fetch(`${BASE_URL}/api/conversations/${testConversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: 'Cam on ban da reply!',
        senderType: 'customer',
        senderName: 'Test Customer',
      }),
    })
    assert(res.status === 201, `Expected 201, got ${res.status}`)
    normalResponse = await res.json()
    assert(!normalResponse.automationResult, 'Expected NO automationResult for normal message')
    console.log(`     No automation triggered (as expected)`)
  })

  // Test 9: Agent reply does NOT trigger automation
  await test('Agent reply does not trigger automation', async () => {
    const res = await fetch(`${BASE_URL}/api/conversations/${testConversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `Tôi muốn ${testKeyword}`,
        senderType: 'agent',
        senderName: 'Agent Test',
      }),
    })
    const data = await res.json()
    assert(!data.automationResult, 'Agent messages should NOT trigger automation')
    console.log(`     Agent message sent, no automation triggered`)
  })

  // Test 10: Simulation API - send single mock message
  await test('Simulation API sends mock message', async () => {
    const res = await fetch(`${BASE_URL}/api/simulation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send_once',
        conversationId: testConversationId,
        message: 'Tin nhắn test từ simulation API',
      }),
    })
    assert(res.ok, `Expected 200, got ${res.status}`)
    const data = await res.json()
    assert(data.message, 'Expected message in simulation response')
    assert(data.message.senderType === 'customer', 'Expected customer sender type')
    console.log(`     Mock message sent successfully`)
  })

  // Test 11: Email channel filter works
  await test('Email channel filter works', async () => {
    const res = await fetch(`${BASE_URL}/api/conversations?channel=email`)
    const data = await res.json()
    assert(data.data.length >= 2, `Expected >= 2 email conversations, got ${data.data.length}`)
    data.data.forEach((c: any) => {
      assert(c.channel === 'email', `Expected email channel, got ${c.channel}`)
    })
    console.log(`     Found ${data.data.length} email conversations`)
  })

  // Test 12: All 5 channels have conversations
  await test('All 5 channels have conversations', async () => {
    const channels = ['website', 'facebook_messenger', 'zalo', 'telegram', 'email']
    for (const ch of channels) {
      const res = await fetch(`${BASE_URL}/api/conversations?channel=${ch}`)
      const data = await res.json()
      assert(data.data.length > 0, `No conversations for channel: ${ch}`)
      console.log(`     ${ch}: ${data.data.length} conversations`)
    }
  })

  // Test 13: Status filter works
  await test('Status filter works (open, resolved, spam)', async () => {
    for (const status of ['open', 'resolved', 'spam']) {
      const res = await fetch(`${BASE_URL}/api/conversations?status=${status}`)
      const data = await res.json()
      data.data.forEach((c: any) => {
        assert(c.status === status, `Expected ${status}, got ${c.status}`)
      })
      console.log(`     ${status}: ${data.data.length} conversations`)
    }
  })

  // Test 14: Search works
  await test('Search by customer name works', async () => {
    const res = await fetch(`${BASE_URL}/api/conversations?search=Hà`)
    const data = await res.json()
    assert(data.data.length > 0, 'Expected results for search "Hà"')
    console.log(`     Search "Hà" found ${data.data.length} results`)
  })

  // Test 15: Conversation detail includes customer identities
  await test('Conversation detail includes customer identities', async () => {
    const res = await fetch(`${BASE_URL}/api/conversations/${testConversationId}`)
    const detail = await res.json()
    assert(detail.customer, 'Expected customer in detail')
    assert(Array.isArray(detail.customer.identities), 'Expected identities array')
    assert(detail.customer.identities.length > 0, 'Expected at least 1 identity')
    console.log(`     Customer has ${detail.customer.identities.length} platform identities`)
    // Log platforms
    const platforms = detail.customer.identities.map((i: any) => i.platform).join(', ')
    console.log(`     Platforms: ${platforms}`)
  })

  // Test 16: Tags API works
  await test('Tags API returns tags', async () => {
    const res = await fetch(`${BASE_URL}/api/tags`)
    const tags = await res.json()
    assert(Array.isArray(tags) && tags.length > 0, 'Expected tags array')
    console.log(`     Found ${tags.length} tags: ${tags.map((t: any) => t.name).join(', ')}`)
  })

  // Test 17: Agents API works
  await test('Agents API returns agents', async () => {
    const res = await fetch(`${BASE_URL}/api/agents`)
    const agents = await res.json()
    assert(Array.isArray(agents) && agents.length > 0, 'Expected agents array')
    console.log(`     Found ${agents.length} agents`)
  })

  // Test 18: Assignment works
  await test('Agent assignment works', async () => {
    const agentsRes = await fetch(`${BASE_URL}/api/agents`)
    const agents = await agentsRes.json()
    const targetAgent = agents[0]
    
    const res = await fetch(`${BASE_URL}/api/conversations/${testConversationId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerId: targetAgent.id }),
    })
    assert(res.ok, `Expected 200, got ${res.status}`)
    
    // Verify
    const detailRes = await fetch(`${BASE_URL}/api/conversations/${testConversationId}`)
    const detail = await detailRes.json()
    assert(detail.ownerId === targetAgent.id, `Expected owner ${targetAgent.id}, got ${detail.ownerId}`)
    console.log(`     Assigned to: ${targetAgent.name}`)
  })

  // Test 19: Status change works
  await test('Status change to resolved works', async () => {
    const res = await fetch(`${BASE_URL}/api/conversations/${testConversationId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'resolved' }),
    })
    assert(res.ok, `Expected 200, got ${res.status}`)
    
    // Verify
    const detailRes = await fetch(`${BASE_URL}/api/conversations/${testConversationId}`)
    const detail = await detailRes.json()
    assert(detail.status === 'resolved', `Expected resolved, got ${detail.status}`)
    console.log(`     Status changed to: resolved`)
    
    // Re-open for other tests
    await fetch(`${BASE_URL}/api/conversations/${testConversationId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'open' }),
    })
  })

  // Test 20: Internal notes work
  await test('Internal notes CRUD works', async () => {
    // Create note
    const createRes = await fetch(`${BASE_URL}/api/conversations/${testConversationId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: 'E2E test note - có thể xóa',
        customerId: null,
      }),
    })
    assert(createRes.ok, `Expected 200, got ${createRes.status}`)
    const note = await createRes.json()
    assert(note.id, 'Expected note ID')
    assert(note.content === 'E2E test note - có thể xóa', 'Note content mismatch')
    
    // Verify
    const notesRes = await fetch(`${BASE_URL}/api/conversations/${testConversationId}/notes`)
    const notes = await notesRes.json()
    assert(Array.isArray(notes), 'Expected notes array')
    assert(notes.some((n: any) => n.id === note.id), 'Note not found in list')
    console.log(`     Note created and verified (${notes.length} total notes)`)
  })

  // Summary
  console.log('\n' + '='.repeat(50))
  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0)
  
  console.log(`\n📊 Results: ${passed}/${results.length} passed (${failed} failed) in ${totalDuration}ms`)
  
  if (failed > 0) {
    console.log('\n❌ Failed tests:')
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   - ${r.name}: ${r.error}`)
    })
  }
  
  console.log(failed === 0 ? '\n🎉 All tests passed!' : '\n⚠️  Some tests failed')
  
  process.exit(failed > 0 ? 1 : 0)
}

runTests().catch((e) => {
  console.error('Test runner error:', e)
  process.exit(1)
})
