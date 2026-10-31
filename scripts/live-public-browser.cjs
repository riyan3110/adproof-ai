// Genuine, anonymous production browser checks; NO mocked APIs and NO paid inference.
// This does not establish that private Judge Access or Meta image quality works.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const origin = process.env.ADPROOF_TEST_URL || 'https://adproof-ai.vercel.app';
const widths = [1920, 1440, 1280, 390, 320];
const imagePath = path.join(__dirname, '..', 'evidence/live-2026-10-31/case-a/original.png');
const savedPath = path.join(__dirname, '..', 'evidence/live-2026-10-31/case-a/audit.json');
const reportPath = process.env.ADPROOF_LIVE_REPORT || '/tmp/adproof-live-browser-report.json';
const screenshotDir = process.env.ADPROOF_LIVE_SCREENSHOTS || '/tmp/adproof-live-screenshots';
const limitedText = text => String(text).slice(0, 240);

async function examinePage(page, route, width, errors) {
  const response = await page.goto(origin + route, {waitUntil:'domcontentloaded', timeout:30000});
  assert.equal(response.status(), 200, route + ' HTTP status');
  await page.waitForLoadState('load');
  const sizes = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
    title: document.title,
    heading: document.querySelector('h1')?.textContent?.trim() || ''
  }));
  assert.ok(sizes.title, 'page title missing on ' + route);
  assert.ok(sizes.scroll <= sizes.viewport + 2, route + ' horizontal overflow at ' + width + ': ' + JSON.stringify(sizes));
  assert.equal(errors.length, 0, 'JS page errors on ' + route + ': ' + errors.join(' | '));
  return sizes;
}

(async () => {
  const browser = await chromium.launch({headless:true,args:['--no-sandbox']});
  const results = [];
  try {
    for (const width of widths) {
      const context = await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce',acceptDownloads:true});
      const page = await context.newPage();
      const pageErrors = [], paidAttempts = [];
      // Pull-request check uses the proposed CSS against live production HTML/API.
      // This is NOT an unchanged production-byte test. Push/main runs use only production assets.
      if (process.env.ADPROOF_CANDIDATE_CSS === '1') {
        const candidateCSS = await fs.readFile(path.join(__dirname, '..', 'public/styles.css'), 'utf8');
        await page.route('**/styles.css', route => route.fulfill({status:200,contentType:'text/css',body:candidateCSS}));
      }
      page.on('pageerror', e => pageErrors.push(limitedText(e.message)));
      // Fail closed: the browser must never run a paid model during these checks.
      await page.route(/\/api\/(audit|improve)(\?|$)/, route => {
        paidAttempts.push(route.request().url());
        return route.abort('blockedbyclient');
      });
      const site = {};
      for (const route of ['/','/docs','/app']) {
        site[route] = await examinePage(page,route,width,pageErrors);
      }
      await page.waitForFunction(() => document.querySelector('#connectionText')?.textContent?.includes('META CONFIGURED'),{timeout:20000});
      assert.equal(await page.locator('#judgeAccessButton').isVisible(), true, 'private Judge Access button missing');
      assert.match(await page.locator('#judgeAccessStatus').textContent(), /not verified/i);
      assert.match(await page.locator('#metaProviderStatus').textContent(), /not tested/i);
      assert.equal(await page.locator('#reportEmpty').isVisible(), true);
      assert.equal(await page.locator('#downloadImage').isDisabled(), true);
      assert.equal(await page.locator('#refineButton').isDisabled(), true);
      await page.locator('#exploreProofButton').click();
      assert.equal(await page.locator('#constellationEmpty').isVisible(),true);
      await page.locator('#deckDNA').click();
      assert.equal(await page.locator('#evolutionEmpty').isVisible(),true);
      await page.locator('#languageSelect').selectOption('id');
      await page.locator('.tutorial-identity strong').filter({hasText:'Cara menggunakan AdProof AI'}).waitFor();
      await page.locator('#languageSelect').selectOption('en');
      await page.locator('.tutorial-identity strong').filter({hasText:'How to use AdProof AI'}).waitFor();

      // The saved file contains authentic historic application evidence.
      // Import itself must be read-only and make NO new provider call.
      const saved = await fs.readFile(savedPath);
      await page.locator('#importReportInput').setInputFiles({name:'real-saved-session.json',mimeType:'application/json',buffer:saved});
      await page.locator('#archiveRestoreNotice').waitFor({state:'visible',timeout:12000});
      assert.equal(await page.locator('#reportContent').isVisible(), true, 'real archived audit not restored');
      assert.equal(await page.locator('#auditButton').isDisabled(), true, 'archive must be read only');
      assert.equal(await page.locator('#refineButton').isDisabled(), true);
      assert.equal(await page.locator('#verifyButton').isDisabled(), true);
      assert.equal(await page.locator('#downloadImage').isDisabled(), true, 'JSON has no original/revised pixels');
      assert.equal(paidAttempts.length, 0, 'archive import made a paid Meta request');
      await fs.mkdir(screenshotDir,{recursive:true});
      await page.screenshot({path:path.join(screenshotDir,'archive-'+width+'.png'),fullPage:false});
      
      // A fresh owner-provided sample (fictional QA fixture) can be uploaded without inference.
      await page.locator('#fileInput').setInputFiles({name:'qa-original.png',mimeType:'image/png',buffer:await fs.readFile(imagePath)});
      await page.locator('#fileName').filter({hasText:'QA-ORIGINAL.PNG'}).waitFor({timeout:12000});
      assert.equal(await page.locator('#reportEmpty').isVisible(), true, 'new upload must invalidate historic report');
      assert.equal(await page.locator('#reportContent').isVisible(), false);
      assert.equal(await page.locator('#downloadImage').isDisabled(), true);
      assert.equal(paidAttempts.length, 0, 'sample upload made a paid Meta request');
      assert.equal(pageErrors.length, 0, 'browser errors after upload '+JSON.stringify(pageErrors));
      const atEnd=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:window.innerWidth}));
      assert.ok(atEnd.scroll <= atEnd.viewport + 2,'Studio overflow after archive/upload at '+width+': '+JSON.stringify(atEnd));
      await page.screenshot({path:path.join(screenshotDir,'upload-'+width+'.png'),fullPage:false});
      results.push({width,routes:site,archiveRestored:true,uploadRestoredCleanState:true,languageSwitch:true,paidModelRequests:0,pageErrors:[]});
      await context.close();
    }
    // Inspect the actual saved, previously generated Meta-output PNG bytes.
    // These are historical files from evidence/live-2026-10-31, not fresh inference.
    const knownPngs = [
      ['social-1080x1080.png',1080,1080],
      ['social-1080x1350.png',1080,1350]
    ];
    const pngEvidence = [];
    const samplePage = await browser.newPage();
    for (const [name,expectedW,expectedH] of knownPngs) {
      const bytes = await fs.readFile(path.join(__dirname,'..','evidence/live-2026-10-31',name));
      assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a',name+' PNG signature');
      assert.equal(bytes.readUInt32BE(16),expectedW,name+' IHDR width');
      assert.equal(bytes.readUInt32BE(20),expectedH,name+' IHDR height');
      const decoded = await samplePage.evaluate(async rawBase64 => {
        const picture = new Image();
        picture.src='data:image/png;base64,'+rawBase64;
        await picture.decode();
        const canvas=document.createElement('canvas');canvas.width=picture.naturalWidth;canvas.height=picture.naturalHeight;
        const ctx=canvas.getContext('2d',{willReadFrequently:true});
        ctx.drawImage(picture,0,0);
        const d=ctx.getImageData(0,0,canvas.width,canvas.height).data;
        let transparentBorderPixels=0;
        for(let x=0;x<canvas.width;x++){
          if(d[(x)*4+3]===0)transparentBorderPixels++;
          if(d[((canvas.height-1)*canvas.width+x)*4+3]===0)transparentBorderPixels++;
        }
        for(let y=1;y<canvas.height-1;y++){
          if(d[(y*canvas.width)*4+3]===0)transparentBorderPixels++;
          if(d[(y*canvas.width+canvas.width-1)*4+3]===0)transparentBorderPixels++;
        }
        return {width:picture.naturalWidth,height:picture.naturalHeight,transparentBorderPixels};
      },bytes.toString('base64'));
      assert.equal(decoded.width,expectedW);
      assert.equal(decoded.height,expectedH);
      assert.equal(decoded.transparentBorderPixels,0,name+' transparent edge / blank margin');
      pngEvidence.push({name,bytes:bytes.length,...decoded,pixelDetailCertified:false,nativeUpscalingCertified:false});
    }
    await samplePage.close();
    console.log('PASS: historical authentic Meta-based PNG exports decode at exact dimensions, with no fully transparent edge pixels.');

    await fs.writeFile(reportPath,JSON.stringify({
      checked_at:new Date().toISOString(),origin,scope:process.env.ADPROOF_CANDIDATE_CSS === '1' ? 'REAL PRODUCTION HTML/API WITH LOCAL CANDIDATE CSS (not final deployed version), NO PAID CALLS' : 'REAL PRODUCTION BROWSER, NO META PAID REQUESTS, NO MOCKED ENDPOINTS',
      results,pngEvidence,limitations:['PNG border alpha check does not certify lack of opaque padding or visual distortions.','Private Judge Access cannot be authenticated without the owner-only code.','No new Muse Spark/Muse Image paid calls or visual generation performed.','Prior saved JSON is historical evidence; not a fresh inference.','Check live reframe pixel quality and submission credentials separately.']
    },null,2));
    console.log('PASS: real production browser /, /docs, /app, 5 viewport widths, locale toggle, authentic JSON archive import, original upload, no paid calls.');
    console.log('REPORT '+reportPath);
  } finally {await browser.close();}
})().catch(e=>{console.error('FAIL: '+e.stack);process.exitCode=1;});
