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
            '--disable-gpu',
            '--window-size=1920,1080',
            '--start-maximized',
            '--kiosk',
            '--disable-infobars',
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ],
        ignoreDefaultArgs: ['--enable-automation'],
        defaultViewport: { width: 1920, height: 1080 }
    });

    const page = await browser.newPage();

    try {
        console.log("Navigating to Zoom...");
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 90000 });

        // 1. පේජ් එක ලෝඩ් වන තෙක් තත්පර 15ක් ඉවසන්න
        await new Promise(r => setTimeout(r, 15000));

        // 2. නම ඇතුළත් කරන කොටුව (Input Box) සෙවීම සහ Click කිරීම
        console.log("Looking for Name Input Box...");
        const inputTyped = await page.evaluate(async () => {
            // නම ඇතුළත් කළ හැකි සියලුම තැන් පරීක්ෂා කිරීම
            const selectors = [
                'input[name="inputname"]',
                '#inputname',
                'input[type="text"]',
                '.form-control',
                'input'
            ];

            for (let selector of selectors) {
                const el = document.querySelector(selector);
                if (el && el.placeholder !== 'Meeting ID') { // Meeting ID කොටුව නොවන බව තහවුරු කරගන්න
                    el.focus();
                    el.click();
                    return true;
                }
            }
            return false;
        });

        if (inputTyped) {
            console.log("Input box found. Typing name: Dasun");
            // පවතින දේවල් මකා දැමීම (Select All + Backspace)
            await page.keyboard.down('Control');
            await page.keyboard.press('A');
            await page.keyboard.up('Control');
            await page.keyboard.press('Backspace');

            // නම ටයිප් කිරීම
            await page.keyboard.type('Dasun', { delay: 200 });
            await new Promise(r => setTimeout(r, 1000));
            
            // Join බොත්තම එබීම (Enter)
            await page.keyboard.press('Enter');
            console.log("Name typed and Enter pressed.");
        } else {
            console.log("Could not find input box via selector. Trying Tab method...");
            // Selector එක වැඩ නොකළොත් පැරණි ක්‍රමය (Tab) භාවිතා කිරීම
            await page.keyboard.press('Tab'); await new Promise(r => setTimeout(r, 1000));
            await page.keyboard.press('Tab'); await new Promise(r => setTimeout(r, 1000));
            await page.keyboard.type('Dasun', { delay: 200 });
            await page.keyboard.press('Enter');
        }

        // 3. UI එක පිරිසිදු කිරීම සහ Audio සම්බන්ධ කිරීමේ ලූපය
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

                    // Computer Audio Join බොත්තම ක්ලික් කිරීම
                    const btns = Array.from(document.querySelectorAll('button'));
                    const joinBtn = btns.find(b => b.innerText.includes('Computer Audio') || b.innerText.includes('Join Audio'));
                    if (joinBtn) joinBtn.click();
                });
            } catch (e) {}
        }, 5000);

    } catch (e) {
        console.error("Error during join process:", e);
    }
}

run();
