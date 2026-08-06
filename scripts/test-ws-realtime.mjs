import http from 'http'

const BASE = 'http://127.0.0.1:3000'

function request(path, opts = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE)
    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: opts.method || 'GET',
      headers: opts.headers || {},
      timeout: 20000,
    }, (res) => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => {
        resolve({ status: res.statusCode, headers: res.headers, body: data })
      })
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')) })
    if (opts.body) req.write(typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body))
    req.end()
  })
}

async function main() {
  console.log('=== OmniChat WS & Realtime Test ===')
  console.log()

  // 1. Login
  console.log('1. Login (mock auth)...')
  const loginRes = await request('/api/auth/mock/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { email: 'admin@omnichat.vn' },
  })
  console.log(`   Status: ${loginRes.status}`)
  const cookies = loginRes.headers['set-cookie'] || ''
  const cookieArray = Array.isArray(cookies) ? cookies : [cookies]
  const sessionCookie = cookieArray.flatMap(c => c.split(';')).find(c => c.trim().startsWith('next-auth.session-token')) || ''
  if (!sessionCookie) {
    console.log('   FAIL: No session cookie')
    return
  }
  console.log(`   Session: ${sessionCookie.split('=')[1].slice(0, 20)}...`)
  const authHeaders = { Cookie: sessionCookie }
  console.log()

  // 2. WS Config Test (GET)
  console.log('2. WebSocket Connection Test (GET)...')
  try {
    const wsRes = await request('/api/ws/test', { headers: authHeaders })
    const wsData = JSON.parse(wsRes.body)
    console.log(`   Status: ${wsRes.status}`)
    console.log(`   Passed: ${wsData.passed}`)
    console.log(`   Transport: ${wsData.config?.transport}`)
    if (wsData.transport?.sse) {
      const sse = wsData.transport.sse
      console.log(`   SSE: alive=${sse.alive}, latency=${sse.latency}ms`)
    }
    if (wsData.transport?.websocket) {
      const ws = wsData.transport.websocket
      console.log(`   WebSocket: alive=${ws.alive}, latency=${ws.latency}ms`)
    }
    if (wsData.errors?.length) console.log(`   Errors: ${wsData.errors.join(', ')}`)
    if (wsData.warnings?.length) console.log(`   Warnings: ${wsData.warnings.join(', ')}`)
  } catch (e) {
    console.log(`   FAIL: ${e.message}`)
  }
  console.log()

  // 3. WS Pipeline Test (POST)
  console.log('3. WebSocket Pipeline Test (POST)...')
  try {
    const pipeRes = await request('/api/ws/test', { method: 'POST', headers: { ...authHeaders, 'Content-Type': 'application/json' } })
    const pipeData = JSON.parse(pipeRes.body)
    console.log(`   Status: ${pipeRes.status}`)
    console.log(`   Passed: ${pipeData.passed}`)
    console.log(`   Pipeline latency: ${pipeData.pipelineLatency}ms`)
    if (pipeData.simulationStatus) {
      console.log(`   Sim active: ${pipeData.simulationStatus.activeSimulations || 0}`)
    }
    if (pipeData.errors?.length) console.log(`   Errors: ${pipeData.errors.join(', ')}`)
  } catch (e) {
    console.log(`   FAIL: ${e.message}`)
  }
  console.log()

  // 4. Realtime Pipeline Test (GET)
  console.log('4. Realtime Pipeline Test (GET)...')
  try {
    const rtRes = await request('/api/realtime/test', { headers: authHeaders })
    const rtData = JSON.parse(rtRes.body)
    console.log(`   Status: ${rtRes.status}`)
    console.log(`   Passed: ${rtData.passed}`)
    console.log(`   Transport: ${rtData.transport}`)
    for (const [key, check] of Object.entries(rtData.checks || {})) {
      const latency = check.latency ? ` (${check.latency}ms)` : ''
      const icon = check.status === 'ok' ? 'OK' : check.status === 'fail' ? 'FAIL' : 'SKIP'
      console.log(`   [${icon}] ${key}: ${check.detail}${latency}`)
    }
    if (rtData.errors?.length) console.log(`   Errors: ${rtData.errors.join(', ')}`)
  } catch (e) {
    console.log(`   FAIL: ${e.message}`)
  }
  console.log()
  console.log('=== Done ===')
}

main().catch(e => console.error('Fatal:', e))
