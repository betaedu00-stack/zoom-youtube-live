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
            '--disable-blink-features=AutomationControlled', // Bot එකක් බව හඳුනාගැනීම වළක්වයි
            '--window-size=1920,1080',
            '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ],
        ignoreDefaultArgs: ['--enable-automation']
    });

    const page = await browser.newPage();

    // 1. Webdriver හඳුනාගැනීම වළක්වන තවත් ආරක්ෂක පියවරක්
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    try {
        console.log("Navigating to Zoom...");
        await page.goto(targetUrl, { waitUntil: 'networkidle2' });

        // 2. සැබෑ මනුෂ්‍යයෙකු ලෙස Mouse එක චලනය කිරීම (Simulate human movement)
        await page.mouse.move(100, 100);
        await page.mouse.move(200, 250);
        
        await new Promise(r => setTimeout(r, 10000)); // පේජ් එක ලෝඩ් වන තෙක් රැඳී සිටීම

        // 3. Bot Warning එකක් ආවොත් එය DOM එකෙන් ඉවත් කිරීම (Force Unblock)
        await page.evaluate(() => {
            const errorMsg = document.querySelector('.zm-alert') || document.querySelector('.alert');
            if (errorMsg) errorMsg.remove();
        });

        // 4. නම ඇතුළත් කිරීමේ කොටුව සොයා එය Click කිරීම
        const nameInputSelector = 'input[name="inputname"]';
        await page.waitForSelector(nameInputSelector, { visible: true, timeout: 20000 });
        
        await page.click(nameInputSelector);
        await new Promise(r => setTimeout(r, 1000));

        // 5. නම එකවර ටයිප් නොකර අකුරෙන් අකුර (Human-like) ටයිප් කිරීම
        const name = "Dasun";
        for (let char of name) {
            await page.keyboard.type(char, { delay: Math.random() * 300 + 100 });
        }

        console.log("Name typed human-like.");
        await new Promise(r => setTimeout(r, 2000));

        // 6. Join බොත්තම Click කිරීම (Enter එබීමට වඩා මෙය සාර්ථකයි)
        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const joinBtn = btns.find(b => b.innerText.includes('Join') && !b.innerText.includes('Sign in'));
            if (joinBtn) joinBtn.click();
        });

        // 7. UI එක සැඟවීම සහ Audio සම්බන්ධ කිරීම
        setInterval(async () => {
            try {
                await page.evaluate(() => {
                    // වෝටර්මාර්ක් සහ අනවශ්‍ය බොත්තම් ඉවත් කිරීම
                    const css = `
                        .meeting-app__watermark, .audio-watermark, .recording-label, .footer, .header, 
                        #onetrust-consent-sdk, .zm-modal, #live-indicator-container, .zm-notification { display: none !important; opacity: 0 !important; } 
                        .video-canvas-container { top: 0 !important; left: 0 !important; height: 100vh !important; width: 100vw !important; } 
                        body, html { overflow: hidden !important; cursor: none !important; }
                    `;
                    let style = document.getElementById('beta-style') || document.createElement('style');
                    style.id = 'beta-style'; style.innerHTML = css; document.head.appendChild(style);

                    const joinAudio = Array.from(document.querySelectorAll('button')).find(b => 
                        b.innerText.includes('Computer Audio') || b.innerText.includes('Join Audio')
                    );
                    if (joinAudio) joinAudio.click();
                });
            } catch (e) {}
        }, 5000);

    } catch (e) {
        console.error("Error:", e);
    }
}

run();
