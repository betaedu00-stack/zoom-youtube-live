const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function run() {
    const zoomUrl = process.env.ZOOM_URL;
    // Zoom Link එක Web Client එකට පරිවර්තනය කිරීම
    let targetUrl = zoomUrl.replace('/j/', '/wc/join/').replace('/w/', '/wc/join/');

    const browser = await puppeteer.launch({
        headless: false, // Virtual display එකේ වැඩ කිරීමට false තිබිය යුතුය
        executablePath: '/usr/bin/google-chrome',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu',
            '--window-size=1920,1080',
            '--start-maximized',
            '--kiosk',
            '--disable-infobars',
            // Bot එකක් බව හඳුනාගැනීම වැලැක්වීමට සැබෑ Browser එකක තොරතුරු ලබා දීම
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
        ],
        ignoreDefaultArgs: ['--enable-automation'],
        defaultViewport: { width: 1920, height: 1080 }
    });

    const page = await browser.newPage();
    
    // Webdriver property එක සැඟවීම (Anti-bot bypass)
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 90000 });

    try {
        console.log("Waiting for page to load...");
        await new Promise(r => setTimeout(r, 25000)); // මීටින් පේජ් එක ලෝඩ් වන තෙක් රැඳී සිටීම

        // නම ඇතුළත් කරන තැනට Tab මගින් යාම
        await page.keyboard.press('Tab'); await new Promise(r => setTimeout(r, 800));
        await page.keyboard.press('Tab'); await new Promise(r => setTimeout(r, 800));

        // නම ලෙස "Dasun" ටයිප් කිරීම (මෙහි Delay එක වැඩි කර ඇත)
        console.log("Typing name: Dasun");
        await page.keyboard.type('Dasun', { delay: 250 }); 
        
        await new Promise(r => setTimeout(r, 1000));
        await page.keyboard.press('Tab'); await new Promise(r => setTimeout(r, 800));
        await page.keyboard.press('Tab'); await new Promise(r => setTimeout(r, 800));
        
        // මීටින් එකට සම්බන්ධ වීමට Enter එබීම
        await page.keyboard.press('Enter');
        console.log("Join button pressed.");
        
        // UI එක පිරිසිදු කරන ලූපය (Watermarks සහ Buttons සැඟවීමට)
        setInterval(async () => {
            try {
                await page.evaluate(() => {
                    const css = `
                        .meeting-app__watermark, 
                        .audio-watermark, 
                        .recording-label, 
                        .footer, 
                        .header, 
                        #onetrust-consent-sdk, 
                        .zm-modal, 
                        #live-indicator-container, 
                        .zm-notification { display: none !important; opacity: 0 !important; } 
                        .video-canvas-container { top: 0 !important; left: 0 !important; height: 100vh !important; width: 100vw !important; } 
                        body, html { overflow: hidden !important; cursor: none !important; }
                    `;
                    let style = document.getElementById('beta-style') || document.createElement('style');
                    style.id = 'beta-style'; 
                    style.innerHTML = css; 
                    document.head.appendChild(style);

                    // ඕඩියෝ එක සම්බන්ධ කිරීමට උත්සාහ කිරීම
                    const btn = Array.from(document.querySelectorAll('button')).find(b => 
                        b.innerText.includes('Computer Audio') || b.innerText.includes('Join Audio')
                    );
                    if (btn) btn.click();
                });
            } catch (e) {}
        }, 5000);

    } catch (e) {
        console.error("Error occurred:", e);
    }
}

run();
