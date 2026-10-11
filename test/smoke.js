/*
 * 진짜 브라우저에서 앱을 눌러보고, 눌린 결과가 화면에 제대로 반영됐는지 확인합니다.
 *
 *   npm test
 *
 * 브라우저가 없다는 오류가 나면 한 번만: npx playwright install chromium
 *
 * jsdom 대신 크로미움을 쓰는 이유: 이 앱은 path 길이, getBBox, 레이아웃 좌표에 기대는
 * 플러그인(MorphSVG, DrawSVG, Flip)을 씁니다. 가짜 DOM에서는 통과해도 의미가 없어요.
 */
const path = require('path');
const FILE = 'file://' + path.join(__dirname, '../public/index.html');

let chromium;
try { ({ chromium } = require('playwright')); }
catch { console.error('playwright가 없습니다. npm install 을 먼저 실행하세요.'); process.exit(1); }

const eq = (label, got, want) => {
  const ok = String(got) === String(want);
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${label.padEnd(30)} ${got}${ok ? '' : `  (기대: ${want})`}`);
  return ok;
};

(async () => {
  let browser;
  try { browser = await chromium.launch(); }
  catch (e) {
    console.error('크로미움을 띄우지 못했습니다. 한 번만 실행하세요:\n  npx playwright install chromium\n');
    console.error(String(e.message).split('\n')[0]);
    process.exit(1);
  }

  const page = await browser.newPage({ viewport: { width: 1280, height: 960 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => {
    // 폰트는 오프라인에서 못 받아오는 게 정상입니다
    if (m.type() === 'error' && !/fonts\.googleapis|ERR_/.test(m.text())) errors.push('console: ' + m.text());
  });

  await page.goto(FILE);
  await page.waitForTimeout(4200);              // 첫 등장 연출이 끝날 때까지

  const chip = (g, id) => page.locator(`#g-${g} .chip[data-id="${id}"]`);
  const read = () => page.evaluate(() => {
    const g = id => document.getElementById(id);
    const pipIn = grp => {
      const row = document.getElementById('g-' + grp);
      const pip = row && row.querySelector('.pip');
      return pip ? pip.parentElement.dataset.id : null;
    };
    return {
      phrase: g('phrase').textContent,
      price: g('price').textContent,
      // 잔은 세 모양 중 하나로 모프됩니다. 시작점만 봐도 어느 잔인지 압니다
      vessel: { 'M120,188': 'mug', 'M128,150': 'glass', 'M146,172': 'bag' }[g('vshape').getAttribute('d').slice(0, 8)] || 'morphing',
      steamOn: +(+getComputedStyle(g('steam')).opacity).toFixed(1),
      handle: +(+getComputedStyle(g('handle')).opacity).toFixed(1),
      straw: +(+getComputedStyle(g('straw')).opacity).toFixed(1),
      cubes: g('cubes').childElementCount,
      ice: g('ice').childElementCount,
      fxLeft: g('fx').childElementCount,
      chars: document.querySelectorAll('#phrase .c').length,
      pipSugar: pipIn('sugar'),
      pipMilk: pipIn('milk')
    };
  });

  let pass = true;
  const step = async (label, act, checks) => {
    if (act) { await act(); await page.waitForTimeout(2000); }
    const s = await read();
    console.log(`\n— ${label}`);
    for (const [k, want] of Object.entries(checks)) pass = eq(k, s[k], want) && pass;
    return s;
  };

  await step('시작 상태 (뜨거운 코피)', null,
    { phrase: 'Kopi', price: '1.40', vessel: 'mug', handle: 1, steamOn: 1, ice: 0, cubes: 0 });

  await step('C · Siu Dai 를 고르면 각설탕이 생긴다',
    async () => { await chip('milk', 'evap').click(); await page.waitForTimeout(1500); await chip('sugar', 'less').click(); },
    { phrase: 'Kopi C Siu Dai', cubes: 1, pipMilk: 'evap', pipSugar: 'less' });

  await step('Peng 을 고르면 얼음잔으로 바뀌고 김이 꺼진다',
    () => chip('ice', 'peng').click(),
    { vessel: 'glass', ice: 4, steamOn: 0, handle: 0, price: '1.80' });

  await step('Dabao 를 고르면 봉지에 빨대가 꽂힌다',
    () => chip('dabao', 'dabao').click(),
    { vessel: 'bag', straw: 1, handle: 0, price: '2.00' });

  await step('Milo 로 바꾸면 우유·단맛 줄이 사라진다',
    () => chip('base', 'milo').click(),
    { phrase: 'Milo Peng Dabao', pipMilk: null, pipSugar: null, cubes: 0 });

  // 연타해도 마지막으로 누른 값만 남아야 합니다
  await step('단맛을 연타해도 상태가 꼬이지 않는다',
    async () => {
      await chip('base', 'kopi').click(); await page.waitForTimeout(1400);
      for (const id of ['none', 'more', 'less']) { await chip('sugar', id).click(); await page.waitForTimeout(80); }
      await page.waitForTimeout(2200);
    },
    { pipSugar: 'less', phrase: 'Kopi C Siu Dai Peng Dabao' });

  // 튄 방울은 끝나면 스스로 지워져야 합니다
  await step('연출이 끝나면 파티클이 남지 않는다', null, { fxLeft: 0 });

  console.log('');
  if (errors.length) { console.log('런타임 에러:\n' + errors.join('\n')); pass = false; }
  else console.log('런타임 에러 없음');

  await browser.close();
  console.log(pass ? '\n전부 통과' : '\n실패한 항목이 있습니다');
  process.exit(pass ? 0 : 1);
})();
