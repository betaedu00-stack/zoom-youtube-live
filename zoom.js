const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function run() {
    const zoomUrl = process.env.ZOOM_URL;
    if (!zoomUrl) {
        console.error("ZOOM_URL is missing!");
        process.exit(1);
    }

    const browser = await puppeteer.launch({
        headless: false,
        executablePath: '/usr/bin/google-chrome',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu',
            '--window-size=1920,1080',
            '--start-maximized'
        ],
        defaultViewport: null
    });

    const page = await browser.newPage();
    
    // Zoom Web Client එකට සෘජුවම යාම
    let targetUrl = zoomUrl.replace('/j/', '/wc/join/');
    if (!targetUrl.includes('?pwd=')) {
        // සමහර විට pwd එක පස්සේ එන්න පුළුවන්, ඒ නිසා check කරන්න
    }

    console.log("Opening Zoom Web Client...");
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 90000 });

    try {
        // නම ඇතුළත් කරන කොටුව එනතෙක් රැඳී සිටීම (විවිධ selectors පරීක්ෂා කරයි)
        console.log("Waiting for name field...");
        const nameSelector = 'input[name="name"], #inputname, .input-name';
        await page.waitForSelector(nameSelector, { visible: true, timeout: 60000 });

        // නම ඇතුළත් කිරීම (β Edu Live)
        await page.focus(nameSelector);
        await page.type(nameSelector, 'β Edu Live', { delay: 100 });
        console.log("Name entered.");

        // Join Button එක සෙවීම සහ එබීම
        const joinBtnSelector = '.u-btn.join-btn, button[type="submit"], .zm-btn';
        await page.waitForSelector(joinBtnSelector, { visible: true });
        await page.click(joinBtnSelector);
        console.log("Join button clicked!");

        // මීටින් එකට ලොග් වූ පසු UI එක පිරිසිදු කිරීම
        setTimeout(async () => {
            try {
                await page.addStyleTag({
                    content: `
                        .meeting-app__watermark, .recording-label, 
                        #onetrust-consent-sdk, .zm-modal, .modal-dialog { 
                            display: none !important; 
                        }
                    `
                });
                console.log("UI cleaning applied.");
            } catch (err) {}
        }, 20000);

    } catch (error) {
        console.error("Automation error:", error.message);
        // Debugging සඳහා Screenshot එකක් ගන්න
        await page.screenshot({ path: 'debug_error.png' });
    }
}

run();
