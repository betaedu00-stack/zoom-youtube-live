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
            '--start-maximized'
        ],
        defaultViewport: { width: 1920, height: 1080 }
    });

    const page = await browser.newPage();
    let targetUrl = zoomUrl.replace('/j/', '/wc/join/');

    console.log("Navigating to Zoom...");
    await page.goto(targetUrl, { waitUntil: 'networkidle2' });

    try {
        // 1. පිටුව ලෝඩ් වන තෙක් තත්පර 15ක් රැඳී සිටීම
        await new Promise(r => setTimeout(r, 15000));

        // 2. නම ඇතුළත් කරන කොටුව "Focus" කිරීමට Tab Key එක භාවිතා කිරීම
        // මෙය selector එකක් නැතත් වැඩ කරන ක්‍රමයකි
        console.log("Attempting to focus and type name...");
        
        // මුලින්ම පිටුවේ මැදට ක්ලික් කරන්න (input එක ඇති ප්‍රදේශය)
        await page.mouse.click(960, 490); 
        await new Promise(r => setTimeout(r, 1000));

        // සියලුම දත්ත මකා (Select All + Backspace) නම ටයිප් කිරීම
        await page.keyboard.down('Control');
        await page.keyboard.press('A');
        await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');
        
        await page.keyboard.type('β Edu Live', { delay: 150 });
        console.log("Name typed via Keyboard Simulation.");

        // 3. Enter Key එක එබීම (Join Button එක එබීමට සමානයි)
        await page.keyboard.press('Enter');
        await new Promise(r => setTimeout(r, 2000));
        await page.keyboard.press('Enter'); // තහවුරු කිරීමට දෙපාරක්
        console.log("Enter pressed.");

        // 4. අමතරව "Join" බටන් එක හමු වුවහොත් එය ක්ලික් කිරීම
        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const join = btns.find(b => b.innerText.includes('Join'));
            if (join) join.click();
        });

        // 5. Watermarks මැකීම (Loop එකක් ලෙස)
        setInterval(async () => {
            try {
                await page.evaluate(() => {
                    const selectors = [
                        '.meeting-app__watermark', '.recording-label', 
                        '#onetrust-consent-sdk', '.zm-modal', 
                        '.modal-dialog', '.full-screen-widget'
                    ];
                    selectors.forEach(s => {
                        const el = document.querySelector(s);
                        if (el) el.style.display = 'none';
                    });
                });
            } catch (e) {}
        }, 5000);

    } catch (error) {
        console.error("Error:", error);
    }
}

run();
