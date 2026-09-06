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
            '--disable-infobars'
        ],
        ignoreDefaultArgs: ['--enable-automation']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // වෙනත් පිටුවලට (Terms/Privacy) හරවා යැවීම වැළැක්වීමේ Listener එක
    page.on('framenavigated', frame => {
        const url = frame.url();
        if (url.includes('/terms') || url.includes('/privacy') || url.includes('/trust')) {
            console.log("Redirect detected! මීටින් පේජ් එකට ආපසු යමින්...");
            page.goto(targetUrl, { waitUntil: 'networkidle2' }).catch(() => {});
        }
    });

    try {
        console.log("Zoom පේජ් එකට ඇතුළු වෙමින්...");
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 90000 });

        // 1. පේජ් එක සම්පූර්ණයෙන් සූදානම් වීමට තත්පර 30ක් ලබා දෙන්න
        console.log("පේජ් එක ලෝඩ් වන තෙක් තත්පර 30ක් රැඳී සිටියි...");
        await new Promise(r => setTimeout(r, 30000));

        // 2. කරදරකාරී ලින්ක් සහ Cookie බැනර් මුලින්ම මකා දමන්න
        await page.evaluate(() => {
            const elements = document.querySelectorAll('a, #onetrust-consent-sdk, footer, .terms-service');
            elements.forEach(el => el.remove());
        });

        // 3. නම ඇතුළත් කිරීමේ "නොවරදින" ක්‍රියාවලිය (Guaranteed Human-Like Entry)
        const nameInput = 'input[name="inputname"]';
        await page.waitForSelector(nameInput, { visible: true, timeout: 30000 });

        console.log("නම ඇතුළත් කරමින්...");
        await page.click(nameInput); // මුලින්ම කොටුව Click කරන්න
        await new Promise(r => setTimeout(r, 1000));

        // පවතින ඕනෑම දෙයක් සම්පූර්ණයෙන් මකා දමන්න
        await page.keyboard.down('Control');
        await page.keyboard.press('A');
        await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');

        // 'Dasun' යන නම අකුරෙන් අකුර සැබෑ මනුෂ්‍යයෙකුගේ වේගයෙන් ටයිප් කිරීම
        const myName = "Dasun";
        for (const char of myName) {
            await page.keyboard.type(char, { delay: 200 }); // අකුරක් අතර පමාව 200ms
        }

        // ටයිප් කළ පසු Tab එකක් ඔබන්න (Zoom එකේ Validation එක Trigger කිරීමට මෙය අත්‍යවශ්‍යයි)
        await page.keyboard.press('Tab');
        await new Promise(r => setTimeout(r, 2000));

        // 4. නම නිවැරදිව කොටුවේ තිබේදැයි 100% ක් තහවුරු කරගැනීම
        const isNameThere = await page.evaluate(() => {
            const el = document.querySelector('input[name="inputname"]');
            return el && el.value.length >= 5;
        });

        if (isNameThere) {
            console.log("නම තහවුරු විය. දැන් Join බොත්තම එබීමට උත්සාහ කරයි...");
            
            // Join බොත්තම බලහත්කාරයෙන් Enable කර Click කිරීම
            await page.evaluate(() => {
                const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('join'));
                if (btn) {
                    btn.disabled = false;
                    btn.classList.remove('disabled');
                    btn.click(); // JS Click
                }
            });

            // මවුස් එකෙන් (Physical) බොත්තම ඇති තැනට ගොස් Click කිරීමේ Backup ක්‍රමය
            const btnPos = await page.evaluate(() => {
                const b = Array.from(document.querySelectorAll('button')).find(btn => btn.innerText.toLowerCase().includes('join'));
                if (b) {
                    const { left, top, width, height } = b.getBoundingClientRect();
                    return { x: left + width / 2, y: top + height / 2 };
                }
                return null;
            });

            if (btnPos) {
                await page.mouse.click(btnPos.x, btnPos.y);
            }
        } else {
            console.log("නම ටයිප් වීමේ දෝෂයකි. නැවත උත්සාහ කරයි...");
            await page.keyboard.type('Dasun');
            await page.keyboard.press('Enter');
        }

        // 5. මීටින් එක ඇතුළත UI පිරිසිදු කරන ලූපය
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
        console.error("විශේෂ දෝෂයකි:", e);
    }
}

run();
