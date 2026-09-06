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
            '--use-fake-ui-for-media-stream',
            '--disable-web-security'
        ],
        ignoreDefaultArgs: ['--enable-automation']
    });

    const page = await browser.newPage();

    // 1. Browser එකේ අනන්‍යතාවය (Fingerprint) සම්පූර්ණයෙන් වෙනස් කිරීම
    await page.evaluateOnNewDocument(() => {
        // WebDriver trace එක සම්පූර්ණයෙන් මකා දැමීම
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        
        // Linux වෙනුවට Windows ලෙස පෙනී සිටීම
        Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
        
        // සැබෑ Chrome එකක තොරතුරු එකතු කිරීම
        window.chrome = { runtime: {} };
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
        
        // WebGL තොරතුරු Spoof කිරීම (Hardware detection bypass)
        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(parameter) {
            if (parameter === 37445) return 'Intel Inc.';
            if (parameter === 37446) return 'Intel(R) Iris(TM) Plus Graphics 640';
            return getParameter.apply(this, arguments);
        };
    });

    try {
        console.log("Zoom වෙත රහසිගතව පිවිසෙමින්...");
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 90000 });

        // 2. පේජ් එක ලෝඩ් වීමට සෑහෙන වේලාවක් (තත්පර 30ක්) ලබා දෙන්න
        await new Promise(r => setTimeout(r, 30000));

        // 3. Zoom Bot Detection Warning එක බලහත්කාරයෙන් මකා දැමීම (The Fix)
        console.log("Bot Warnings ඉවත් කරමින්...");
        await page.evaluate(() => {
            // "Automated bots aren't allowed" පණිවිඩය ඇතුළු සියලුම Alerts මකා දමන්න
            const alerts = document.querySelectorAll('.zm-alert, .alert, #join-err-msg, .privacy-policy-banner');
            alerts.forEach(a => a.remove());

            // "Sign in to join" බොත්තම වෙනුවට සැබෑ "Join" ක්‍රියාවලිය මතු කිරීම
            const signBtn = document.querySelector('.zm-btn--primary');
            if (signBtn && signBtn.innerText.includes('Sign in')) {
                signBtn.innerText = 'Join'; // බොත්තමේ නම වෙනස් කරන්න
            }
        });

        // 4. නම ඇතුළත් කිරීම (Dasun)
        console.log("නම ඇතුළත් කරමින්...");
        const inputSelector = 'input[name="inputname"]';
        await page.waitForSelector(inputSelector, { visible: true });
        
        await page.click(inputSelector);
        await page.keyboard.down('Control'); await page.keyboard.press('A'); await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');

        // අකුරෙන් අකුර සෙමින් ටයිප් කරන්න
        for (const char of "Dasun") {
            await page.keyboard.type(char, { delay: 250 });
        }
        await page.keyboard.press('Tab');
        await new Promise(r => setTimeout(r, 3000));

        // 5. Join බොත්තම "Force Click" කිරීම
        console.log("Join බොත්තම බලහත්කාරයෙන් ඔබමින්...");
        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const joinBtn = btns.find(b => b.innerText.toLowerCase().includes('join'));
            if (joinBtn) {
                joinBtn.removeAttribute('disabled');
                joinBtn.disabled = false;
                joinBtn.click();
            }
        });

        // 6. මීටින් එක ඇතුළත UI එක පිරිසිදු කිරීම
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
        console.error("දෝෂයකි:", e);
    }
}

run();
