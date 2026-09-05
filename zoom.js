const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function run() {
    const zoomUrl = process.env.ZOOM_URL;
    if (!zoomUrl) { process.exit(1); }

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
            '--disable-infobars'
        ],
        ignoreDefaultArgs: ['--enable-automation'],
        defaultViewport: null
    });

    const page = await browser.newPage();
    let targetUrl = zoomUrl.replace('/j/', '/wc/join/');

    await page.goto(targetUrl, { waitUntil: 'networkidle2' });

    try {
        await new Promise(r => setTimeout(r, 15000));

        // නම ඇතුළත් කර මීටින් එකට ලොග් වීම
        await page.mouse.click(960, 490); 
        await page.keyboard.type('β Edu Live', { delay: 100 });
        await page.keyboard.press('Enter');

        // පිරිසිදු Full Screen පෙනුමක් ලබා දීමට සහ කළු පෙට්ටිය මැකීමට බලවත් CSS සහ JS
        setInterval(async () => {
            try {
                // 1. CSS මගින් මැකීම
                await page.addStyleTag({
                    content: `
                        /* සියලුම ලේබල් සහ වෝටර්මාර්ක් මැකීම */
                        .meeting-app__watermark, .audio-watermark, 
                        .recording-label, .participant-id-label, 
                        .meeting-info-icon__container, .footer, 
                        .pwa-footer, .header, .pwa-header,
                        #onetrust-consent-sdk, .zm-modal { display: none !important; opacity: 0 !important; }
                        
                        /* දකුණු පස ඇති 'Live streaming' කළු පෙට්ටිය සඳහා සියලුම විය හැකි selectors */
                        #live-indicator-container, 
                        .live-indicator, 
                        .meeting-info-live-streaming__container, 
                        .zm-notification, 
                        .zm-toast-container, 
                        [aria-label*="streaming"], 
                        [class*="streaming"] { 
                            display: none !important; 
                            visibility: hidden !important; 
                            opacity: 0 !important;
                            pointer-events: none !important;
                            width: 0 !important;
                            height: 0 !important;
                        }

                        /* වීඩියෝව තිරයට මැදි කිරීම */
                        .video-canvas-container { top: 0 !important; left: 0 !important; height: 100vh !important; width: 100vw !important; }
                        body, html { overflow: hidden !important; cursor: none !important; }
                    `
                });

                // 2. JavaScript මගින් එම element එක බලහත්කාරයෙන්ම ඉවත් කිරීම (DOM removal)
                await page.evaluate(() => {
                    const selectors = [
                        '#live-indicator-container', 
                        '.live-indicator', 
                        '.meeting-info-live-streaming__container',
                        '.zm-notification'
                    ];
                    selectors.forEach(s => {
                        const el = document.querySelector(s);
                        if (el) el.remove(); // Element එක සම්පූර්ණයෙන්ම delete කර දමයි
                    });

                    // "streaming live" යන වචනය අඩංගු ඕනෑම div එකක් මකා දැමීම
                    const divs = document.querySelectorAll('div');
                    divs.forEach(d => {
                        if (d.innerText && d.innerText.includes('streaming live')) {
                            d.remove();
                        }
                    });
                });
            } catch (e) {}
        }, 2000); // සෑම තත්පර 2කට වරක්ම මෙය පරීක්ෂා කරයි

    } catch (error) {
        console.error("Error:", error);
    }
}

run();
