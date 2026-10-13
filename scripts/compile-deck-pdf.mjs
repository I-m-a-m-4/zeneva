import { launch } from './record/browser.mjs';
import { waitForEndpoint, Cdp } from './record/cdp.mjs';
import { writeFileSync, statSync } from 'node:fs';
import path from 'node:path';

async function main() {
  const port = 9229;
  const pdfOutput = path.resolve('Zeneva_Zenith_Bank_Pitch_Deck.pdf');
  const targetUrl = 'http://localhost:9007/pitch-deck.html';

  console.log('Launching headless browser via recorder infrastructure...');
  const browser = await launch({
    width: 1920,
    height: 1080,
    dpr: 1,
    headless: true,
    port,
    log: console.log,
  });

  try {
    console.log(`Connecting to CDP on port ${port}...`);
    const pageTarget = await waitForEndpoint(port);
    const cdp = await Cdp.attach(pageTarget.webSocketDebuggerUrl);

    console.log(`Navigating to ${targetUrl}...`);
    await cdp.send('Page.enable');
    await cdp.send('Page.navigate', { url: targetUrl });

    // Wait 2.5 seconds for Google Fonts and layout to settle
    await new Promise((resolve) => setTimeout(resolve, 2500));

    console.log('Rendering PDF via Page.printToPDF...');
    const result = await cdp.send('Page.printToPDF', {
      landscape: true,
      displayHeaderFooter: false,
      printBackground: true,
      preferCSSPageSize: true,
      paperWidth: 16.0,
      paperHeight: 9.0,
      marginTop: 0,
      marginBottom: 0,
      marginLeft: 0,
      marginRight: 0,
    });

    if (!result?.data) {
      throw new Error('No PDF data received from Chrome DevTools Protocol');
    }

    const pdfBuffer = Buffer.from(result.data, 'base64');
    writeFileSync(pdfOutput, pdfBuffer);

    const sizeKb = (statSync(pdfOutput).size / 1024).toFixed(1);
    console.log(`\n🎉 SUCCESS: Pitch Deck PDF saved to:\n${pdfOutput} (${sizeKb} KB)`);

    cdp.close();
  } finally {
    browser.cleanup();
  }
}

main().catch((err) => {
  console.error('Fatal error during PDF compilation:', err);
  process.exit(1);
});
