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
            '--start-maximized',
            '--disable-web-security'
        ],
        ignoreDefaultArgs: ['--enable-automation']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // 1. Browser Identity Spoofing (බොට් ලක්ෂණ සම්පූර්ණයෙන් සැඟවීම)
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
        window.chrome = { runtime: {} };
    });

    // 2. Anti-Redirect (වෙනත් පිටුවලට යාම වැළැක්වීම)
    page.on('framenavigated', frame => {
        if (frame.url().includes('/terms') || frame.url().includes('/privacy')) {
            page.goto(targetUrl).catch(() => {});
        }
    });

    try {
        console.log("Zoom පේජ් එකට ඇතුළු වෙමින්...");
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 90000 });

        // පේජ් එකේ Scripts ලෝඩ් වීමට තත්පර 30ක් ලබා දෙන්න
        await new Promise(r => setTimeout(r, 30000));

        // 3. Cleanup (කරදරකාරී ලින්ක් සහ බැනර් මකා දැමීම)
        await page.evaluate(() => {
            const trash = document.querySelectorAll('a, #onetrust-consent-sdk, footer, .terms-service');
            trash.forEach(el => el.remove());
        });

        // 4. නම ඇතුළත් කිරීමේ "අවසාන විසඳුම" (Injection + Typing + Verification)
        console.log("නම ඇතුළත් කිරීමේ පියවර...");
        const inputSelector = 'input[name="inputname"]';
        await page.waitForSelector(inputSelector, { visible: true });

        // Loop එකක් මගින් නම වැටෙන බව තහවුරු කිරීම
        for (let i = 0; i < 5; i++) {
            await page.click(inputSelector);
            // පැරණි දේ මකා දැමීම
            await page.keyboard.down('Control'); await page.keyboard.press('A'); await page.keyboard.up('Control');
            await page.keyboard.press('Backspace');

            // නම ටයිප් කිරීම
            await page.keyboard.type('Dasun', { delay: 150 });
            
            // Zoom එකේ පද්ධතියට (React) නම ලැබුණු බව තහවුරු කරන බලවත් Injection එක
            await page.evaluate(() => {
                const input = document.querySelector('input[name="inputname"]');
                if (input) {
                    input.value = 'Dasun';
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                    input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'n' }));
                    input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'n' }));
                }
            });

            await page.keyboard.press('Tab');
            await new Promise(r => setTimeout(r, 2000));

            // නම වැටිලද කියා කියවා බැලීම
            const currentName = await page.evaluate(() => document.querySelector('input[name="inputname"]').value);
            if (currentName.includes('Dasun')) {
                console.log("නම සාර්ථකව තහවුරු විය!");
                break;
            }
        }

        // 5. Join බොත්තම බලහත්කාරයෙන් Enable කර Click කිරීම
        console.log("Join බොත්තම ඔබමින්...");
        await page.evaluate(() => {
            const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('join'));
            if (btn) {
                btn.removeAttribute('disabled');
                btn.disabled = false;
                btn.classList.remove('disabled');
                btn.style.backgroundColor = 'blue'; // පෙනුම වෙනස් කර තහවුරු කිරීම
                btn.click();
            }
        });

        // Backup Enter Press
        await page.keyboard.press('Enter');

        // 6. මීටින් එක තුළ UI පිරිසිදු කරන ලූපය
        setInterval(async () => {
            try {
                await page.evaluate(() => {
                    const css = `
                        .meeting-app__watermark, .audio-watermark, .recording-label, .footer, .header, 
                        #onetrust-consent-sdk, .zm-modal, #live-indicator-container, .zm-notification,
                        a, .terms-service { display: none !important; opacity: 0 !important; } 
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
        console.error("දෝෂයක් පවතී:", e);
    }
}

run();
