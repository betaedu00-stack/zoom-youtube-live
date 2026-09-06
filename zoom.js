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
            // සැබෑ පුද්ගලයෙකු ලෙස පෙනීමට අලුත්ම Chrome Version එකක් ලෙස පෙනී සිටීම
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ],
        ignoreDefaultArgs: ['--enable-automation'],
        defaultViewport: { width: 1920, height: 1080 }
    });

    const page = await browser.newPage();

    // 1. Zoom එකට බොට් කෙනෙක් නොවන බව ඒත්තු ගැන්වීමට අවශ්‍ය Cookies කලින්ම ඇතුල් කිරීම
    await page.setCookie({
        name: 'zm_v_optin',
        value: 'true',
        domain: '.zoom.us'
    }, {
        name: 'JSESSIONID',
        value: 'abc',
        domain: '.zoom.us'
    });

    try {
        console.log("Navigating to Zoom...");
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 90000 });

        // 2. Privacy පිටුවට හෝ Cookie පිටුවට ගියහොත් එය මඟහැරීමට උත්සාහ කිරීම
        await new Promise(r => setTimeout(r, 15000)); 

        // Privacy පේජ් එකේ "Accept" බොත්තම ඇත්නම් එය සෙවීම සහ ක්ලික් කිරීම
        const privacyAccept = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button, a'));
            const acceptBtn = buttons.find(b => b.innerText.includes('Accept') || b.innerText.includes('Agree'));
            if (acceptBtn) {
                acceptBtn.click();
                return true;
            }
            return false;
        });

        if (privacyAccept) {
            console.log("Privacy accepted. Waiting for redirect...");
            await new Promise(r => setTimeout(r, 10000));
        }

        // 3. මීටින් එකට ලොග් වන තැනට යෑම (Selector මගින් කෙලින්ම නම ඇතුල් කිරීම)
        // Tab එබීමට වඩා මෙය සාර්ථකයි
        console.log("Checking for name input field...");
        await page.waitForSelector('input[name="inputname"]', { visible: true, timeout: 30000 }).catch(() => {});
        
        const inputFound = await page.evaluate(() => {
            const nameInput = document.querySelector('input[name="inputname"]') || document.querySelector('#inputname');
            if (nameInput) {
                nameInput.value = ''; // පවතින නමක් ඇත්නම් මකන්න
                return true;
            }
            return false;
        });

        if (inputFound) {
            await page.type('input[name="inputname"]', 'Dasun', { delay: 200 });
        } else {
            // Selector එක හමු නොවූයේ නම් නැවත Tab ක්‍රමය භාවිතා කිරීම (Back-up)
            await page.keyboard.press('Tab'); await new Promise(r => setTimeout(r, 1000));
            await page.keyboard.press('Tab'); await new Promise(r => setTimeout(r, 1000));
            await page.keyboard.type('Dasun', { delay: 200 });
        }

        console.log("Name typed: Dasun");
        await new Promise(r => setTimeout(r, 1000));
        await page.keyboard.press('Enter');

        // 4. UI එක සැඟවීම සහ Audio Connect කිරීමේ ලූපය
        setInterval(async () => {
            try {
                await page.evaluate(() => {
                    // ඔක්කොම අනවශ්‍ය දේවල් මකන්න
                    const selectorsToRemove = [
                        '#onetrust-consent-sdk', '.privacy-policy-banner', '.meeting-app__watermark',
                        '.audio-watermark', '.recording-label', '.footer', '.header', '.zm-modal'
                    ];
                    selectorsToRemove.forEach(s => {
                        const el = document.querySelector(s);
                        if (el) el.remove();
                    });

                    // Screen එක full screen කරන්න
                    const css = `
                        .video-canvas-container { top: 0 !important; left: 0 !important; height: 100vh !important; width: 100vw !important; } 
                        body, html { overflow: hidden !important; cursor: none !important; }
                    `;
                    let style = document.getElementById('beta-style') || document.createElement('style');
                    style.id = 'beta-style'; style.innerHTML = css; document.head.appendChild(style);

                    // Join Audio බොත්තම ක්ලික් කිරීම
                    const joinAudio = Array.from(document.querySelectorAll('button')).find(b => 
                        b.innerText.includes('Computer Audio') || b.innerText.includes('Join Audio')
                    );
                    if (joinAudio) joinAudio.click();
                });
            } catch (e) {}
        }, 5000);

    } catch (e) {
        console.error("Critical Error:", e);
    }
}

run();
