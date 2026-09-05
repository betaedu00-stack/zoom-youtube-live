const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function run() {
    console.log("Launching System Chrome...");
    try {
        const browser = await puppeteer.launch({
            headless: false,
            executablePath: '/usr/bin/google-chrome', // Ubuntu එකේ තියෙන Chrome එක
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-gpu',
                '--start-maximized',
                '--window-size=1920,1080',
                '--autoplay-policy=no-user-gesture-required'
            ],
            defaultViewport: null
        });

        const page = await browser.newPage();
        let zoomUrl = process.env.ZOOM_URL;
        
        if (zoomUrl.includes('/j/')) {
            zoomUrl = zoomUrl.replace('/j/', '/wc/join/');
        }

        console.log("Navigating to Zoom...");
        await page.goto(zoomUrl, { waitUntil: 'networkidle2', timeout: 90000 });

        // Join Screen එක එනකම් ඉන්න
        await page.waitForSelector('#inputname', { timeout: 30000 });
        await page.type('#inputname', 'β Edu Live');
        await page.click('.u-btn.join-btn');
        console.log("Join button clicked.");

        // මීටින් එක ඇතුළත UI සැකසීම
        setTimeout(async () => {
            await page.addStyleTag({
                content: '.meeting-app__watermark, .recording-label { display: none !important; }'
            });
            console.log("Watermarks hidden.");
        }, 20000);

    } catch (error) {
        console.error("CRITICAL ERROR:", error);
    }
}

run();
