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

    try {
        console.log("Navigating to:", targetUrl);
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 90000 });

        // 1. පේජ් එක ලෝඩ් වන තෙක් තත්පර 20ක් රැඳී සිටින්න
        console.log("Waiting for page elements...");
        await new Promise(r => setTimeout(r, 20000));

        // 2. නම ඇතුළත් කරන කොටුව සොයා එයට "Dasun" ඇතුළත් කිරීමේ ප්‍රබල ක්‍රමය
        await page.evaluate(() => {
            // පේජ් එකේ ඇති සියලුම Input fields සොයන්න
            const inputs = document.querySelectorAll('input');
            for (let input of inputs) {
                // එය නම ඇතුළත් කරන එක බව පෙනේ නම් (සාමාන්‍යයෙන් පළමු හෝ එකම text input එක)
                if (input.type === 'text' || !input.type) {
                    input.focus();
                    input.value = 'Dasun';
                    // React/Angular වැනි Framework වලට අගය වෙනස් වූ බව දැනුම් දීම
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('blur', { bubbles: true }));
                }
            }
        });

        // 3. යම් හෙයකින් ඉහත ක්‍රමය අසාර්ථක වුවහොත් සැබෑ Keyboard එකෙන් ටයිප් කිරීම
        await page.keyboard.press('Tab'); await new Promise(r => setTimeout(r, 500));
        await page.keyboard.press('Tab'); await new Promise(r => setTimeout(r, 500));
        await page.keyboard.type('Dasun', { delay: 150 });
        
        console.log("Typing completed. Waiting for button to enable...");
        await new Promise(r => setTimeout(r, 3000));

        // 4. "Join" බොත්තම සොයා එය Click කිරීම
        await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const joinBtn = buttons.find(b => b.innerText.toLowerCase().includes('join'));
            if (joinBtn) {
                joinBtn.disabled = false; // බොත්තම අක්‍රිය වී ඇත්නම් එය සක්‍රිය කරන්න
                joinBtn.click();
            }
        });

        // 5. මීටින් එක ඇතුළත UI පිරිසිදු කිරීම සහ Audio Connect කිරීම
        setInterval(async () => {
            try {
                await page.evaluate(() => {
                    // වෝටර්මාර්ක් සහ මෙනු සැඟවීම
                    const css = `
                        .meeting-app__watermark, .audio-watermark, .recording-label, .footer, .header, 
                        #onetrust-consent-sdk, .zm-modal, #live-indicator-container, .zm-notification { display: none !important; opacity: 0 !important; } 
                        .video-canvas-container { top: 0 !important; left: 0 !important; height: 100vh !important; width: 100vw !important; } 
                        body, html { overflow: hidden !important; cursor: none !important; }
                    `;
                    let style = document.getElementById('beta-style') || document.createElement('style');
                    style.id = 'beta-style'; style.innerHTML = css; document.head.appendChild(style);

                    // Audio සම්බන්ධ කිරීම
                    const audioBtn = Array.from(document.querySelectorAll('button')).find(b => 
                        b.innerText.includes('Computer Audio') || b.innerText.includes('Join Audio')
                    );
                    if (audioBtn) audioBtn.click();
                });
            } catch (e) {}
        }, 5000);

    } catch (e) {
        console.error("Error:", e);
    }
}

run();
