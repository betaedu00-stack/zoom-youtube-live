const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function run() {
    const zoomUrl = process.env.ZOOM_URL;
    // Telegram එකෙන් එන නම සහ ඊමේල් එක
    const zoomName = process.env.ZOOM_NAME || 'β Edu Live'; 
    const zoomEmail = process.env.ZOOM_EMAIL || ''; 

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
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
        Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 4 });
        window.chrome = { runtime: {} };
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

        // පේජ් එක ලෝඩ් වීමට තත්පර 30ක් ලබා දෙන්න
        await new Promise(r => setTimeout(r, 30000));

        // 5. නම සහ Email ඇතුළත් කිරීමේ "Bulletproof" ක්‍රමය
        await page.evaluate(({ name, email }) => {
            // Name Field
            const nameField = document.querySelector('input[name="inputname"]') || document.querySelector('input[type="text"]');
            if (nameField) {
                nameField.focus();
                const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
                nativeSetter.call(nameField, name);
                nameField.dispatchEvent(new Event('input', { bubbles: true }));
                nameField.dispatchEvent(new Event('change', { bubbles: true }));
            }
            
            // Email Field (Webinar/Protected සඳහා)
            if (email !== "") {
                const emailField = document.querySelector('input[name="inputemail"]') || document.querySelector('input[type="email"]');
                if (emailField) {
                    emailField.focus();
                    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
                    nativeSetter.call(emailField, email);
                    emailField.dispatchEvent(new Event('input', { bubbles: true }));
                    emailField.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
            
            // අනවශ්‍ය දේවල් මකන්න
            const trash = document.querySelectorAll('a, #onetrust-consent-sdk, footer, .zm-modal');
            trash.forEach(el => el.remove());
        }, { name: zoomName, email: zoomEmail }); // Variables pass කිරීම

        await new Promise(r => setTimeout(r, 2000));
        await page.keyboard.press('Tab');
        await new Promise(r => setTimeout(r, 1000));
        await page.keyboard.type(' ', { delay: 100 }); // සැබෑ Keypress එකක් Simulate කිරීම

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

        // මීටින් එක ඇතුළත Cleanup හා Audio Connect කිරීම
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
