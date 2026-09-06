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
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ],
        ignoreDefaultArgs: ['--enable-automation']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // 1. Redirect වැළැක්වීමේ Listener එක
    page.on('framenavigated', frame => {
        const url = frame.url();
        if (url.includes('/terms') || url.includes('/privacy')) {
            console.log("Terms page detected! Redirecting back...");
            page.goto(targetUrl).catch(() => {});
        }
    });

    try {
        console.log("Zoom වෙත පිවිසෙමින්...");
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 90000 });

        // 2. පේජ් එක ලෝඩ් වන තෙක් තත්පර 25ක් රැඳී සිටීම
        await new Promise(r => setTimeout(r, 25000));

        // 3. කරදරකාරී ලින්ක් සහ Cookie බැනර් මකා දැමීම (වැරදීමකින් ක්ලික් වීම වැළැක්වීමට)
        await page.evaluate(() => {
            const links = document.querySelectorAll('a, #onetrust-consent-sdk, .terms-service');
            links.forEach(el => el.remove());
        });

        // 4. නම ඇතුළත් කිරීමේ "Guaranteed" ක්‍රමය
        console.log("නම ඇතුළත් කරමින්...");
        const inputSelector = 'input[name="inputname"]';
        await page.waitForSelector(inputSelector, { visible: true });

        // කොටුව Click කර පැරණි දේ මකා දැමීම
        await page.click(inputSelector);
        await page.keyboard.down('Control');
        await page.keyboard.press('A');
        await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');

        // නම ටයිප් කර "Tab" එබීම (Zoom එකට නම තහවුරු කිරීමට මෙය අත්‍යවශ්‍යයි)
        await page.keyboard.type('Dasun', { delay: 200 });
        await page.keyboard.press('Tab'); 
        await new Promise(r => setTimeout(r, 2000));

        // 5. නම ඇතුළත් වී ඇති බව තහවුරු කර Join බොත්තම එබීම
        console.log("Join බොත්තම සොයමින්...");
        await page.evaluate(() => {
            const input = document.querySelector('input[name="inputname"]');
            const btns = Array.from(document.querySelectorAll('button'));
            const joinBtn = btns.find(b => b.innerText.toLowerCase().includes('join'));

            if (input && input.value.length > 0 && joinBtn) {
                joinBtn.disabled = false;
                joinBtn.classList.remove('disabled');
                joinBtn.click(); // JavaScript Click
            }
        });

        // අමතර ආරක්ෂාවට Keyboard එකෙන් Enter එබීම
        await page.keyboard.press('Enter');

        // 6. මීටින් එක ඇතුළත UI පිරිසිදු කිරීම සහ Audio සම්බන්ධ කිරීම (දිගටම ක්‍රියාත්මක වේ)
        setInterval(async () => {
            try {
                await page.evaluate(() => {
                    // වෝටර්මාර්ක් සහ අනවශ්‍ය දේවල් සැඟවීම
                    const css = `
                        .meeting-app__watermark, .audio-watermark, .recording-label, .footer, .header, 
                        #onetrust-consent-sdk, .zm-modal, #live-indicator-container, .zm-notification, 
                        .privacy-policy-banner, .terms-service { display: none !important; opacity: 0 !important; } 
                        .video-canvas-container { top: 0 !important; left: 0 !important; height: 100vh !important; width: 100vw !important; } 
                        body, html { overflow: hidden !important; cursor: none !important; }
                    `;
                    let style = document.getElementById('beta-style') || document.createElement('style');
                    style.id = 'beta-style'; style.innerHTML = css; document.head.appendChild(style);

                    // Join Audio බොත්තම එබීම
                    const audioBtn = Array.from(document.querySelectorAll('button')).find(b => 
                        b.innerText.includes('Computer Audio') || b.innerText.includes('Join Audio')
                    );
                    if (audioBtn) audioBtn.click();
                });
            } catch (e) {}
        }, 5000);

    } catch (e) {
        console.error("Critical Error:", e);
    }
}

run();
