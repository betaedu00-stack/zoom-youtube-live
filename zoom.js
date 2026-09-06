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

        // 1. පේජ් එක ලෝඩ් වීමට සෑහෙන වේලාවක් (තත්පර 25ක්) ලබා දෙන්න
        await new Promise(r => setTimeout(r, 25000));

        // 2. නම ඇතුළත් කරන කොටුව (Input) නිවැරදිව හඳුනාගෙන Click කර ටයිප් කිරීම
        console.log("නම ඇතුළත් කරමින්...");
        const inputSelector = 'input[name="inputname"], input#inputname, input.form-control';
        
        await page.waitForSelector('input', { visible: true, timeout: 30000 });
        
        // කොටුව Click කිරීම (Focus ලබා ගැනීමට)
        await page.click('input');
        await new Promise(r => setTimeout(r, 1000));

        // පවතින ඕනෑම දෙයක් මකා දමා "Dasun" ටයිප් කිරීම
        await page.keyboard.down('Control');
        await page.keyboard.press('A');
        await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');

        // අකුරෙන් අකුර ටයිප් කිරීම
        await page.keyboard.type('Dasun', { delay: 200 });

        // 3. නම ටයිප් වී ඇති බව තහවුරු කරගැනීම (Verification)
        const typedValue = await page.evaluate(() => {
            const input = document.querySelector('input');
            return input ? input.value : '';
        });

        if (typedValue === 'Dasun') {
            console.log("නම සාර්ථකව ටයිප් විය. දැන් Join බොත්තම ඔබමු.");
            await new Promise(r => setTimeout(r, 2000));

            // 4. Join බොත්තම Click කිරීම
            await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const joinBtn = buttons.find(b => b.innerText.toLowerCase().includes('join'));
                if (joinBtn) {
                    joinBtn.disabled = false;
                    joinBtn.click();
                }
            });
        } else {
            console.log("නම ටයිප් වී නැත. නැවත උත්සාහ කරමු...");
            // Tab ක්‍රමය මගින් නැවත උත්සාහ කිරීම
            await page.keyboard.press('Tab'); await new Promise(r => setTimeout(r, 500));
            await page.keyboard.press('Tab'); await new Promise(r => setTimeout(r, 500));
            await page.keyboard.type('Dasun', { delay: 150 });
            await page.keyboard.press('Enter');
        }

        // 5. මීටින් එක තුළ UI පිරිසිදු කිරීමේ ලූපය
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
        console.error("දෝෂයකි:", e);
    }
}

run();
