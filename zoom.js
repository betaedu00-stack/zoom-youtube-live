const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function run() {
    console.log("Checking Environment...");
    const zoomUrl = process.env.ZOOM_URL;

    if (!zoomUrl || zoomUrl === "") {
        console.error("CRITICAL ERROR: ZOOM_URL secret is missing or empty!");
        process.exit(1);
    }

    console.log("Launching Browser...");
    try {
        const browser = await puppeteer.launch({
            headless: false,
            executablePath: '/usr/bin/google-chrome',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-gpu',
                '--start-maximized',
                '--window-size=1920,1080'
            ],
            defaultViewport: null
        });

        const page = await browser.newPage();
        
        // URL එක සකස් කිරීම
        let targetUrl = zoomUrl;
        if (targetUrl.includes('/j/')) {
            targetUrl = targetUrl.replace('/j/', '/wc/join/');
        }

        console.log("Navigating to:", targetUrl);
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 90000 });

        // නම ඇතුළත් කිරීම
        console.log("Waiting for input name field...");
        await page.waitForSelector('#inputname', { timeout: 45000 });
        await page.type('#inputname', 'β Edu Live');
        
        await page.click('.u-btn.join-btn');
        console.log("Join button clicked. Waiting for meeting...");

        // UI පිරිසිදු කිරීම (තත්පර 30කට පසු)
        setTimeout(async () => {
            await page.addStyleTag({
                content: '.meeting-app__watermark, .recording-label, #onetrust-consent-sdk { display: none !important; }'
            });
            console.log("UI Cleaned.");
        }, 30000);

    } catch (error) {
        console.error("BROWSER ERROR:", error.message);
    }
}

run();
