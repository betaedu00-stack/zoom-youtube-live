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
        console.log("Zoom වෙත පිවිසෙමින්...");
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 90000 });

        // 1. පේජ් එක ලෝඩ් වීමට සෑහෙන වේලාවක් (තත්පර 30ක්) ලබා දෙන්න
        await new Promise(r => setTimeout(r, 30000));

        // 2. කරදරකාරී ලින්ක් මකා දැමීම
        await page.evaluate(() => {
            const links = document.querySelectorAll('a, #onetrust-consent-sdk');
            links.forEach(el => el.remove());
        });

        // 3. නම ඇතුළත් කිරීමේ "නොවරදින" ක්‍රමය (Force Injection Loop)
        let isNameReady = false;
        for (let i = 0; i < 10; i++) {
            console.log(`නම ඇතුළත් කිරීමේ උත්සාහය: ${i+1}`);

            isNameReady = await page.evaluate(() => {
                const input = document.querySelector('input[name="inputname"]') || document.querySelector('input');
                if (input) {
                    input.focus();
                    input.value = 'Dasun';
                    // Zoom එකේ පද්ධතියට නම ලැබුණු බව තහවුරු කිරීමට Events යැවීම
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                    input.dispatchEvent(new Event('blur', { bubbles: true }));
                    return input.value === 'Dasun';
                }
                return false;
            });

            if (isNameReady) {
                // නම ඇතුළත් වූ පසු Keyboard එකෙන් තව අකුරක් ටයිප් කරන්න (React Update එකට)
                await page.focus('input');
                await page.keyboard.type(' '); 
                console.log("නම සාර්ථකව පද්ධතියට ඇතුළත් විය!");
                break;
            }
            await new Promise(r => setTimeout(r, 3000));
        }

        // 4. නම තහවුරු වූ පසු පමණක් Join බොත්තම එබීම
        if (isNameReady) {
            await new Promise(r => setTimeout(r, 2000));
            console.log("Join බොත්තම එබීමට උත්සාහ කරයි...");
            
            await page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const joinBtn = btns.find(b => b.innerText.toLowerCase().includes('join'));
                if (joinBtn) {
                    joinBtn.removeAttribute('disabled');
                    joinBtn.disabled = false;
                    joinBtn.click();
                }
            });
            // Backup Enter Press
            await page.keyboard.press('Enter');
        }

        // 5. මීටින් එක ඇතුළත UI පිරිසිදු කිරීම සහ Audio සම්බන්ධ කිරීම
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

                    const btn = Array.from(document.querySelectorAll('button')).find(b => 
                        b.innerText.includes('Computer Audio') || b.innerText.includes('Join Audio')
                    );
                    if (btn) btn.click();
                });
            } catch (e) {}
        }, 5000);

    } catch (e) {
        console.error("Error:", e);
    }
}

run();
