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

        // 2. නම ඇතුළත් කිරීමේ Loop එක (නම වැටෙනකම්ම උත්සාහ කරයි)
        let nameConfirmed = false;
        for (let attempt = 1; attempt <= 10; attempt++) {
            console.log(`නම ඇතුළත් කිරීමේ වාරය: ${attempt}`);

            // කොටුව සොයාගැනීම සහ Click කිරීම
            await page.evaluate(() => {
                const input = document.querySelector('input[name="inputname"]') || document.querySelector('input');
                if (input) {
                    input.focus();
                    input.click();
                    input.value = ""; // පරණ දේවල් මකන්න
                }
            });

            // "Dasun" අකුරෙන් අකුර සෙමින් ටයිප් කිරීම
            await page.keyboard.type('Dasun', { delay: 200 });
            await page.keyboard.press('Tab'); // Zoom එකට දැනෙන්න Tab එකක් ඔබන්න
            await new Promise(r => setTimeout(r, 2000));

            // නම කොටුව ඇතුළේ තියෙනවද කියලා චෙක් කිරීම
            nameConfirmed = await page.evaluate(() => {
                const input = document.querySelector('input[name="inputname"]') || document.querySelector('input');
                return input && input.value.includes('Dasun');
            });

            if (nameConfirmed) {
                console.log("නම සාර්ථකව තහවුරු විය!");
                break;
            }
        }

        // 3. නම තහවුරු වූ පසු පමණක් Join බොත්තම එබීම
        if (nameConfirmed) {
            await page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const joinBtn = btns.find(b => b.innerText.toLowerCase().includes('join'));
                if (joinBtn) {
                    joinBtn.disabled = false;
                    joinBtn.classList.remove('disabled');
                    joinBtn.click();
                }
            });
            // අමතර ආරක්ෂාවට Keyboard Enter
            await page.keyboard.press('Enter');
        }

        // 4. UI පිරිසිදු කිරීම සහ Audio Join කිරීමේ ලූපය
        setInterval(async () => {
            try {
                await page.evaluate(() => {
                    // වෝටර්මාර්ක් සහ කරදරකාරී ලින්ක් සැඟවීම
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
