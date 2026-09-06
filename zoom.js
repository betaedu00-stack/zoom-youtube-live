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
            '--disable-blink-features=AutomationControlled',
            '--window-size=1920,1080',
            '--start-maximized'
        ],
        ignoreDefaultArgs: ['--enable-automation']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // 1. වෙනත් පිටුවලට හරවා යැවීම වැළැක්වීමේ ආරක්ෂක පියවර (Anti-Redirect)
    page.on('framenavigated', frame => {
        const url = frame.url();
        if (url.includes('/terms') || url.includes('/privacy') || url.includes('/trust')) {
            console.log("Redirect detected! Going back to meeting...");
            page.goto(targetUrl, { waitUntil: 'networkidle2' }).catch(() => {});
        }
    });

    try {
        console.log("Zoom වෙත පිවිසෙමින්...");
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 90000 });

        // 2. කරදරකාරී Cookies සහ අනවශ්‍ය ලින්ක් මකා දැමීම
        setInterval(async () => {
            await page.evaluate(() => {
                // 'Terms of Service' සහ 'Privacy' ලින්ක් සම්පූර්ණයෙන් මකා දමන්න
                const links = document.querySelectorAll('a');
                links.forEach(link => {
                    if (link.href.includes('terms') || link.href.includes('privacy')) {
                        link.remove();
                    }
                });
                // Cookie banner එක මකන්න
                const cookieBanner = document.querySelector('#onetrust-consent-sdk');
                if (cookieBanner) cookieBanner.remove();
            });
        }, 2000);

        await new Promise(r => setTimeout(r, 25000));

        // 3. නම ඇතුළත් කිරීමේ ක්‍රියාවලිය
        console.log("නම ඇතුළත් කරමින්...");
        const inputTyped = await page.evaluate(() => {
            const el = document.querySelector('input[name="inputname"]') || document.querySelector('input');
            if (el) {
                el.focus();
                el.value = 'Dasun';
                el.dispatchEvent(new Event('input', { bubbles: true }));
                return true;
            }
            return false;
        });

        if (inputTyped) {
            await page.keyboard.press('Tab');
            await new Promise(r => setTimeout(r, 2000));
            
            // 4. Join බොත්තම එබීම
            await page.evaluate(() => {
                const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('join'));
                if (btn) {
                    btn.disabled = false;
                    btn.click();
                }
            });
        }

        // 5. මීටින් එක ඇතුළත UI එක පිරිසිදු කිරීම
        setInterval(async () => {
            try {
                await page.evaluate(() => {
                    const css = `
                        .meeting-app__watermark, .audio-watermark, .recording-label, .footer, .header, 
                        #onetrust-consent-sdk, .zm-modal, #live-indicator-container, .zm-notification { display: none !important; opacity: 0 !important; } 
                        .video-canvas-container { top: 0 !important; left: 0 !important; height: 100vh !important; width: 100vw !important; } 
                        body, html { overflow: hidden !important; cursor: none !important; }
                    `;
                    let style = document.getElementById('beta-style') || document.createElement('style');
                    style.id = 'beta-style'; style.innerHTML = css; document.head.appendChild(style);

                    const audioBtn = Array.from(document.querySelectorAll('button')).find(b => 
                        b.innerText.includes('Computer Audio') || b.innerText.includes('Join Audio')
                    );
                    if (audioBtn) audioBtn.click();
                });
            } catch (e) {}
        }, 5000);

    } catch (e) {
        console.error("Critical Failure:", e);
    }
}

run();
