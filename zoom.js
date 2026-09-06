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

        // 1. පේජ් එක ලෝඩ් වීමට සෑහෙන වේලාවක් (තත්පර 40ක්) ලබා දෙන්න
        console.log("Zoom පද්ධතිය සූදානම් වන තෙක් රැඳී සිටියි...");
        await new Promise(r => setTimeout(r, 40000));

        // 2. කරදරකාරී Tooltips සහ ලින්ක් මකා දැමීම
        await page.evaluate(() => {
            const tooltips = document.querySelectorAll('.ant-tooltip, .privacy-policy-banner, #onetrust-consent-sdk, a');
            tooltips.forEach(el => el.remove());
        });

        // 3. නම ඇතුළත් කිරීමේ "Magic" ක්‍රමය (Bypassing Zoom Validation)
        console.log("නම ඇතුළත් කරමින්...");
        const inputTyped = await page.evaluate(async (nameToType) => {
            const input = document.querySelector('input[name="inputname"]') || document.querySelector('input[type="text"]');
            if (input) {
                input.focus();
                input.click();
                // සැබෑ මනුෂ්‍යයෙකුගේ ක්‍රියාවක් ලෙස නම ඇතුළු කිරීමේ විධානය
                document.execCommand('insertText', false, nameToType);
                
                // Zoom එකේ පද්ධතියට (React) නම ලැබුණු බව තහවුරු කිරීම
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                return true;
            }
            return false;
        }, 'Dasun');

        if (inputTyped) {
            console.log("නම සාර්ථකව පද්ධතියට ඇතුළු විය.");
            await new Promise(r => setTimeout(r, 3000));

            // 4. Join බොත්තම සක්‍රිය කර එය එබීම
            await page.evaluate(() => {
                const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('join'));
                if (btn) {
                    btn.disabled = false;
                    btn.classList.remove('disabled');
                    btn.click();
                }
            });

            // අමතර ආරක්ෂාවට Keyboard එකෙන් Enter එබීම
            await page.keyboard.press('Enter');
            console.log("Join Button Pressed!");
        } else {
            // Selector වැඩ නොකළොත් Tab ක්‍රමය (Old School)
            console.log("Selectors failed. Using Tab sequence...");
            await page.keyboard.press('Tab'); await new Promise(r => setTimeout(r, 800));
            await page.keyboard.press('Tab'); await new Promise(r => setTimeout(r, 800));
            await page.keyboard.type('Dasun', { delay: 200 });
            await page.keyboard.press('Enter');
        }

        // 5. මීටින් එක ඇතුළත UI පිරිසිදු කිරීම සහ Audio සම්බන්ධ කිරීම
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
