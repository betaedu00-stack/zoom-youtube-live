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
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--lang=en-US,en'
        ],
        ignoreDefaultArgs: ['--enable-automation']
    });

    const page = await browser.newPage();
    
    // Zoom එක රවට්ටන බලවත්ම Spoofing කොටස
    await page.evaluateOnNewDocument(() => {
        // 1. Webdriver සැඟවීම
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        
        // 2. Hardware තොරතුරු Spoof කිරීම
        Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
        Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 4 });
        
        // 3. Chrome Runtime එක ඇති බව පෙන්වීම
        window.chrome = { runtime: {} };
        
        // 4. Permissions Spoof කිරීම
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
            parameters.name === 'notifications' ?
            Promise.resolve({ state: Notification.permission }) :
            originalQuery(parameters)
        );
    });

    await page.setViewport({ width: 1920, height: 1080 });

    try {
        console.log("Zoom වෙත පිවිසෙමින්...");
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 90000 });

        // පේජ් එක ලෝඩ් වීමට තත්පර 35ක් ලබා දෙන්න
        await new Promise(r => setTimeout(r, 35000));

        // 5. නම ඇතුළත් කිරීමේ "Bulletproof" ක්‍රමය
        await page.evaluate(() => {
            const nameField = document.querySelector('input[name="inputname"]') || document.querySelector('input');
            if (nameField) {
                nameField.focus();
                // React/Angular ඕනෑම එකක State එක බලහත්කාරයෙන් Update කිරීම
                const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
                nativeSetter.call(nameField, "Dasun");
                nameField.dispatchEvent(new Event('input', { bubbles: true }));
                nameField.dispatchEvent(new Event('change', { bubbles: true }));
                nameField.dispatchEvent(new Event('blur', { bubbles: true }));
            }
            
            // අනවශ්‍ය දේවල් මකන්න
            const trash = document.querySelectorAll('a, #onetrust-consent-sdk, footer, .zm-modal');
            trash.forEach(el => el.remove());
        });

        await new Promise(r => setTimeout(r, 2000));
        await page.keyboard.press('Tab');
        await new Promise(r => setTimeout(r, 1000));
        await page.keyboard.type(' ', { delay: 100 }); // සැබෑ Keypress එකක්

        // 6. Join බොත්තම බලහත්කාරයෙන් ඔබන ලූපය
        console.log("Join බොත්තම ඔබමින්...");
        for (let i = 0; i < 5; i++) {
            await page.evaluate(() => {
                const joinBtn = Array.from(document.querySelectorAll('button')).find(b => 
                    b.innerText.toLowerCase().includes('join') && !b.innerText.toLowerCase().includes('sign')
                );
                if (joinBtn) {
                    joinBtn.disabled = false;
                    joinBtn.click();
                }
            });
            await page.keyboard.press('Enter');
            await new Promise(r => setTimeout(r, 3000));
        }

        // මීටින් එක ඇතුළත Cleanup
        setInterval(async () => {
            try {
                await page.evaluate(() => {
                    const css = `.meeting-app__watermark, .audio-watermark, .recording-label, .footer, .header, #onetrust-consent-sdk, .zm-modal, #live-indicator-container { display: none !important; } .video-canvas-container { height: 100vh !important; width: 100vw !important; top:0!important; left:0!important; } body, html { cursor: none !important; overflow: hidden !important; }`;
                    let style = document.getElementById('beta-style') || document.createElement('style');
                    style.id = 'beta-style'; style.innerHTML = css; document.head.appendChild(style);
                    const audio = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Computer Audio'));
                    if (audio) audio.click();
                });
            } catch (e) {}
        }, 5000);

    } catch (e) {
        console.error(e);
    }
}
run();
