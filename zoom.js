const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const ZOOM_URL = process.env.ZOOM_URL;
const ZOOM_PASSCODE = process.env.ZOOM_PASSCODE;
const DISPLAY_NAME = "Live Streamer";

(async () => {
    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/google-chrome',
        headless: false, // අපි Virtual Display එකක් පාවිච්චි කරන නිසා false දෙනවා
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu',
            '--disable-dev-shm-usage',
            '--window-size=1920,1080',
            '--window-position=0,0',
            '--start-fullscreen',
            '--autoplay-policy=no-user-gesture-required'
        ],
        ignoreDefaultArgs: ['--enable-automation']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    console.log("Navigating to Zoom URL...");
    await page.goto(ZOOM_URL, { waitUntil: 'networkidle2' });

    // 1. Watermark එක ඉවත් කිරීම සඳහා CSS Inject කිරීම
    await page.addStyleTag({
        content: `
            div[class*="watermark"], 
            div[id*="watermark"],
            .send-video-container canvas,
            .meeting-app-watermark { 
                display: none !important; 
                opacity: 0 !important;
                visibility: hidden !important;
            }
        `
    });
    console.log("Watermark hiding CSS injected.");

    // 2. නම සහ Passcode එක ලබා දීම (මෙහිදී අදාළ HTML elements load වනතුරු බලා සිටී)
    try {
        await page.waitForSelector('input[id="input-for-name"]', { timeout: 10000 });
        await page.type('input[id="input-for-name"]', DISPLAY_NAME);
        
        if (ZOOM_PASSCODE) {
            await page.waitForSelector('input[id="input-for-pwd"]', { timeout: 5000 }).catch(()=>console.log("No passcode field found."));
            const pwdInput = await page.$('input[id="input-for-pwd"]');
            if (pwdInput) await page.type('input[id="input-for-pwd"]', ZOOM_PASSCODE);
        }

        await page.click('button.preview-join-button');
        console.log("Clicked Join Meeting.");

        // 3. Join Audio බොත්තම එබීම (Computer Audio මගින්)
        await page.waitForSelector('button.join-audio-by-voip', { timeout: 15000 });
        await page.click('button.join-audio-by-voip');
        console.log("Joined Computer Audio.");
        
    } catch (error) {
        console.log("Error during Zoom login flow: ", error);
    }
})();
