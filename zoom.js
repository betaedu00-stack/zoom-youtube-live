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
            '--kiosk', // බ්‍රව්සර් එක Full Screen කිරීමට
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

        // නම ඇතුළත් කිරීම (Keyboard simulation)
        await page.mouse.click(960, 490); 
        await page.keyboard.type('β Edu Live', { delay: 100 });
        await page.keyboard.press('Enter');

        // පිරිසිදු Full Screen පෙනුමක් ලබා දීමට CSS Injection (Loop එකක් ලෙස)
        setInterval(async () => {
            try {
                await page.addStyleTag({
                    content: `
                        .meeting-app__watermark, .audio-watermark, 
                        .recording-label, .participant-id-label, 
                        .meeting-info-icon__container, .footer, 
                        .pwa-footer, .header, .pwa-header,
                        #onetrust-consent-sdk, .zm-modal { display: none !important; opacity: 0 !important; }
                        
                        .video-canvas-container { top: 0 !important; left: 0 !important; height: 100vh !important; width: 100vw !important; }
                        body, html { overflow: hidden !important; cursor: none !important; }
                    `
                });
            } catch (e) {}
        }, 5000);

    } catch (error) {
        console.error("Error:", error);
    }
}

run();
