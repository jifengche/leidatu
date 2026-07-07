const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // Collect console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));

  console.log('=== Testing Login Page ===');
  await page.goto('http://localhost:8080/index.html', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'screenshots/01-login.png', fullPage: false });
  console.log('Login page screenshot saved');

  // Click demo button
  console.log('=== Clicking Demo Login ===');
  await page.click('#btnDemo');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'screenshots/02-main-grade.png', fullPage: false });
  console.log('Main page (grade tab) screenshot saved');

  // Check if chart rendered
  const chartCanvas = await page.$('#chartCanvas canvas');
  console.log('Chart canvas found:', !!chartCanvas);

  // Switch to class tab
  console.log('=== Switching to Class Tab ===');
  await page.click('.tab-item[data-tab="class"]');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'screenshots/03-main-class.png', fullPage: false });
  console.log('Class tab screenshot saved');

  // Switch to student tab
  console.log('=== Switching to Student Tab ===');
  await page.click('.tab-item[data-tab="student"]');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'screenshots/04-main-student.png', fullPage: false });
  console.log('Student tab screenshot saved');

  // Test template download button (just verify it's clickable)
  console.log('=== Checking sidebar elements ===');
  const templateBtn = await page.$('#btnDownloadTemplate');
  const uploadArea = await page.$('#uploadArea');
  const downloadBtn = await page.$('#btnDownloadSingle');
  console.log('Template button:', !!templateBtn);
  console.log('Upload area:', !!uploadArea);
  console.log('Download button:', !!downloadBtn);

  // Switch back to grade tab for final screenshot
  await page.click('.tab-item[data-tab="grade"]');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'screenshots/05-grade-final.png', fullPage: false });

  // Report errors
  console.log('\n=== Console Errors ===');
  if (errors.length === 0) {
    console.log('No errors!');
  } else {
    errors.forEach(e => console.log('ERROR:', e));
  }

  await browser.close();
  console.log('\n=== Test Complete ===');
})();
