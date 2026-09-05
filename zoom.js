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
    
    // Web Client එකට ලින්ක් එක හැරවීම
    let targetUrl = zoomUrl.replace('/j/', '/wc/join/');

    console.log("Navigating to Zoom Web Client...");
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 90000 });

    try {
        // 1. නම ඇතුළත් කරන කොටුව එනතෙක් රැඳී සිටීම
        console.log("Searching for name input field...");
        await page.waitForSelector('input', { visible: true, timeout: 60000 });

        // 2. සියලුම input fields අතරින් නම ඇතුළත් කළ යුතු එක සොයා ගැනීම
        await page.evaluate(() => {
            const inputs = Array.from(document.querySelectorAll('input'));
            // නම ඇතුළත් කරන කොටුව බොහෝ විට පළමු text input එකයි
            const nameField = inputs.find(i => i.type === 'text' || i.id === 'inputname' || i.name === 'name');
            if (nameField) {
                nameField.value = 'β Edu Live';
                // සැබෑ ලෙසම ටයිප් කළාක් මෙන් පෙන්වීමට events trigger කිරීම
                nameField.dispatchEvent(new Event('input', { bubbles: true }));
                nameField.dispatchEvent(new Event('change', { bubbles: true }));
                console.log("Name value set via JS.");
            }
        });

        // අමතර ආරක්ෂාවට Puppeteer මගිනුත් ටයිප් කරමු
        await page.type('input', 'β Edu Live');
        console.log("Typed name via Puppeteer.");

        // 3. Join Button එක එබීම
        console.log("Searching for Join button...");
        await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const joinBtn = buttons.find(b => b.innerText.includes('Join') || b.classList.contains('join-btn'));
            if (joinBtn) {
                joinBtn.click();
                console.log("Join button clicked via JS.");
            }
        });

        // 4. UI Clean-up (Watermarks මැකීම)
        // මීටින් එකට ලොග් වී ටික වෙලාවකින් මෙය ක්‍රියාත්මක වේ
        setInterval(async () => {
            try {
                await page.addStyleTag({
                    content: `
                        .meeting-app__watermark, .recording-label, 
                        #onetrust-consent-sdk, .zm-modal, .modal-dialog,
                        .full-screen-widget { 
                            display: none !important; 
                            opacity: 0 !important;
                        }
                    `
                });
            } catch (e) {}
        }, 10000);

    } catch (error) {
        console.error("Critical Error during automation:", error.message);
        await page.screenshot({ path: 'error_screenshot.png' });
    }
}

run();
