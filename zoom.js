const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function run() {
    const zoomUrl = process.env.ZOOM_URL;
    if (!zoomUrl) { process.exit(1); }

    let targetUrl = zoomUrl.replace('/j/', '/wc/join/').replace('/w/', '/wc/join/');

    const browser = await puppeteer.launch({
        headless: false,
        executablePath: '/usr/bin/google-chrome',
        args: [
            '--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu',
            '--window-size=1920,1080', '--start-maximized', '--kiosk',
            '--disable-infobars', '--autoplay-policy=no-user-gesture-required'
        ],
        ignoreDefaultArgs: ['--enable-automation'],
        defaultViewport: { width: 1920, height: 1080 }
    });

    const page = await browser.newPage();
    console.log("Navigating to:", targetUrl);
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 90000 });

    try {
        // 1. පිටුව ලෝඩ් වන තෙක් තත්පර 20ක් රැඳී සිටින්න
        await new Promise(r => setTimeout(r, 20000));

        // 2. නම ඇතුළත් කරන කොටුව කෙලින්ම Focus කිරීම
        console.log("Typing Name...");
        
        // මුලින්ම 'Tab' කී එක භාවිතයෙන් Input එක සොයා ගැනීම (වඩාත් සාර්ථක ක්‍රමය)
        await page.keyboard.press('Tab');
        await new Promise(r => setTimeout(r, 500));
        await page.keyboard.press('Tab');
        await new Promise(r => setTimeout(r, 500));

        // නම ටයිප් කිරීම (සැබෑ යතුරුපුවරුවකින් ටයිප් කරන්නාක් මෙන්)
        await page.keyboard.type('β Edu Live', { delay: 150 });
        console.log("Name entered.");

        // 3. ඊළඟට ඇති Join බටන් එකට ගොස් 'Enter' එබීම
        await new Promise(r => setTimeout(r, 1000));
        await page.keyboard.press('Tab'); // 'Remember name' checkbox එකට යයි
        await new Promise(r => setTimeout(r, 500));
        await page.keyboard.press('Tab'); // 'Join' button එකට යයි
        await new Promise(r => setTimeout(r, 500));
        await page.keyboard.press('Enter'); 
        
        console.log("Enter pressed to Join.");

        // 4. Webinar එකකදී Email එකක් ඉල්ලුවහොත් ඒ සඳහා අමතර පියවරක්
        setTimeout(async () => {
            await page.keyboard.type('live@betaedu.com', { delay: 100 });
            await page.keyboard.press('Enter');
        }, 5000);

        // 5. මීටින් එක ඇතුළත පිරිසිදු කිරීම (Infinite Loop)
        setInterval(async () => {
            try {
                await page.evaluate(() => {
                    // වෝටර්මාර්ක් සහ අනවශ්‍ය UI සැඟවීම
                    const css = `
                        .meeting-app__watermark, .audio-watermark, .recording-label,
                        .participant-id-label, .meeting-info-icon__container, 
                        .footer, .pwa-footer, .header, .pwa-header,
                        #onetrust-consent-sdk, .zm-modal, #live-indicator-container,
                        .zm-notification, .notification-list-container { 
                            display: none !important; opacity: 0 !important; pointer-events: none !important;
                        }
                        .video-canvas-container { top: 0 !important; left: 0 !important; height: 100vh !important; width: 100vw !important; }
                        body, html { overflow: hidden !important; cursor: none !important; }
                    `;
                    let style = document.getElementById('beta-edu-style');
                    if (!style) {
                        style = document.createElement('style');
                        style.id = 'beta-edu-style';
                        document.head.appendChild(style);
                    }
                    style.innerHTML = css;

                    // Audio සම්බන්ධ කිරීමේ පණිවිඩය ආවොත් එය එබීම
                    const btns = Array.from(document.querySelectorAll('button'));
                    const audioBtn = btns.find(b => b.innerText.includes('Computer Audio'));
                    if (audioBtn) audioBtn.click();
                });
            } catch (e) {}
        }, 5000);

    } catch (error) {
        console.error("Automation error:", error);
    }
}

run();
