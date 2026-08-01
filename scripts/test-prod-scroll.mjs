import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

console.log('Navigating...');
await page.goto('http://127.0.0.1:3470/', { waitUntil: 'domcontentloaded', timeout: 30000 });
console.log('Waiting for hydration...');
await page.waitForTimeout(5000);

// Click first conversation to open chat
const convoItem = await page.$('.convo-item');
if (convoItem) {
  console.log('Clicking conversation...');
  await convoItem.click();
  await page.waitForTimeout(3000);
}

const result = await page.evaluate(() => {
  const allDivs = [...document.querySelectorAll('div')];
  const infos = [];
  
  for (const div of allDivs) {
    const cs = getComputedStyle(div);
    if (cs.overflowY === 'auto' || cs.overflowY === 'scroll') {
      const hasConvo = !!div.querySelector('.convo-item');
      const hasBubble = !!div.querySelector('.bubble-customer') || !!div.querySelector('.bubble-agent');
      
      if (hasConvo || hasBubble) {
        // Try scrolling
        const before = div.scrollTop;
        div.scrollTop = 500;
        const after = div.scrollTop;
        div.scrollTop = before;
        
        infos.push({
          type: hasConvo ? 'SIDEBAR' : 'CHAT',
          scrollH: div.scrollHeight,
          clientH: div.clientHeight,
          canScroll: div.scrollHeight > div.clientHeight,
          scrolled: after !== before,
        });
      }
    }
  }
  
  // Panel info
  const panels = [...document.querySelectorAll('[data-panel]')];
  const pInfo = panels.map(p => {
    const child = p.firstElementChild;
    return {
      pH: p.offsetHeight,
      pOverflow: getComputedStyle(p).overflow,
      pPos: getComputedStyle(p).position,
      childPos: child ? getComputedStyle(child).position : null,
      childH: child?.offsetHeight,
    };
  });
  
  return { containers: infos, panels: pInfo };
});

console.log('\n=== SCROLL CONTAINERS ===');
for (const c of result.containers) {
  console.log(`[${c.type}] scrollH=${c.scrollH} clientH=${c.clientH} canScroll=${c.canScroll} scrolled=${c.scrolled}`);
}

console.log('\n=== PANELS ===');
for (const p of result.panels) {
  console.log(`  H=${p.pH} overflow=${p.pOverflow} pos=${p.pPos} childPos=${p.childPos} childH=${p.childH}`);
}

const sOk = result.containers.some(c => c.type === 'SIDEBAR' && c.canScroll);
const cOk = result.containers.some(c => c.type === 'CHAT' && c.canScroll);
console.log(`\nVERDICT: sidebar=${sOk ? 'PASS' : 'FAIL'} chat=${cOk ? 'PASS' : 'FAIL'}`);

// Take screenshot
await page.screenshot({ path: '/home/z/my-project/test-scroll-result.png', fullPage: false });
console.log('Screenshot saved to test-scroll-result.png');

await browser.close();
