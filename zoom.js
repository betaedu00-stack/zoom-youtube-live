const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function run() {
    const zoomUrl = process.env.ZOOM_URL;
    let targetUrl = zoomUrl.replace('/j/', '/wc/join/').replace('/w/', '/wc/join/');

    const browser = await puppeteer.launch({
        headless: false,
        executablePath: '/usr/bin/google-chrome',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu',
            '--window-size=1920,1080',
            '--start-maximized',
            '--kiosk',
            '--disable-infobars',
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ],
        ignoreDefaultArgs: ['--enable-automation'],
        defaultViewport: { width: 1920, height: 1080 }
    });

    const page = await browser.newPage();

    // 1. මුලින්ම පේජ් එකට යෑම
    console.log("Navigating to:", targetUrl);
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 90000 });

    try {
        // 2. වැරදීමකින් Privacy පිටුවට ගියහොත් නැවත මීටින් එකට හරවා යැවීම (Anti-Redirect)
        if (page.url().includes('privacy') || page.url().includes('cookie-policy')) {
            console.log("Redirected to privacy page. Retrying join link...");
            await page.goto(targetUrl, { waitUntil: 'networkidle2' });
        }

        // 3. Cookie Consent බොත්තම ඇත්නම් එය ස්වයංක්‍රීයව ක්ලික් කිරීම
        await new Promise(r => setTimeout(r, 10000)); // Load වීමට කාලය ලබා දීම
        await page.evaluate(() => {
            const acceptBtn = document.querySelector('#onetrust-accept-btn-handler') || 
                              document.querySelector('.optanon-allow-all') ||
                              document.querySelector('#btnAcceptCookies');
            if (acceptBtn) acceptBtn.click();
        });

        // 4. Join වීමේ ක්‍රියාවලිය (Dasun නම භාවිතා කරමින්)
        console.log("Starting Join Sequence...");
        await page.keyboard.press('Tab'); await new Promise(r => setTimeout(r, 1000));
        await page.keyboard.press('Tab'); await new Promise(r => setTimeout(r, 1000));
        
        await page.keyboard.type('Dasun', { delay: 250 });
        console.log("Typed name: Dasun");

        await page.keyboard.press('Tab'); await new Promise(r => setTimeout(r, 1000));
        await page.keyboard.press('Tab'); await new Promise(r => setTimeout(r, 1000));
        await page.keyboard.press('Enter');
        console.log("Join Button Pressed.");

        // 5. UI එක පිරිසිදු කිරීම සහ Audio Connect කිරීම
        setInterval(async () => {
            try {
                await page.evaluate(() => {
                    // Privacy සහ Cookie Modals ඉවත් කිරීම
                    const cookieModal = document.querySelector('#onetrust-consent-sdk');
                    if (cookieModal) cookieModal.remove();

                    const css = `
                        .meeting-app__watermark, .audio-watermark, .recording-label, .footer, .header, 
                        #onetrust-consent-sdk, .zm-modal, #live-indicator-container, .zm-notification,
                        .privacy-policy-banner { display: none !important; opacity: 0 !important; } 
                        .video-canvas-container { top: 0 !important; left: 0 !important; height: 100vh !important; width: 100vw !important; } 
                        body, html { overflow: hidden !important; cursor: none !important; }
                    `;
                    let style = document.getElementById('beta-style') || document.createElement('style');
                    style.id = 'beta-style'; style.innerHTML = css; document.head.appendChild(style);

                    const btn = Array.from(document.querySelectorAll('button')).find(b => 
                        b.innerText.includes('Computer Audio') || b.innerText.includes('Join Audio')
                    );
                    if (btn) btn.click();
                });
            } catch (e) {}
        }, 5000);

    } catch (e) {
        console.error("Join process failed:", e);
    }
}

run();
