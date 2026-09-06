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
            '--disable-blink-features=AutomationControlled',
            '--window-size=1920,1080',
            '--start-maximized',
            '--disable-infobars'
        ],
        ignoreDefaultArgs: ['--enable-automation']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Bot detection මඟහැරීමට සැබෑ මනුෂ්‍යයෙකුගේ Browser එකක් ලෙස පෙනී සිටීම
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    try {
        console.log("Navigating to Zoom...");
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 90000 });

        // 1. පේජ් එක සම්පූර්ණයෙන් ලෝඩ් වන තෙක් තත්පර 20ක් රැඳී සිටීම
        console.log("Waiting for Zoom to settle...");
        await new Promise(r => setTimeout(r, 20000));

        // 2. නම ඇතුළත් කරන කොටුව (Input) සෙවීම සහ නම ටයිප් කිරීම
        console.log("Attempting to find name field and type...");
        const isTyped = await page.evaluate(() => {
            // පේජ් එකේ ඇති සියලුම input tags පරීක්ෂා කිරීම
            const inputs = Array.from(document.querySelectorAll('input'));
            const nameBox = inputs.find(i => 
                i.placeholder.includes('Name') || 
                i.name === 'inputname' || 
                i.id === 'inputname' ||
                (i.type === 'text' && i.id !== 'meeting_number')
            );

            if (nameBox) {
                nameBox.focus();
                nameBox.value = 'Dasun';
                // Zoom එකට නම ලැබුණු බව දැනුම් දීමට අවශ්‍ය Events ක්‍රියාත්මක කිරීම
                nameBox.dispatchEvent(new Event('input', { bubbles: true }));
                nameBox.dispatchEvent(new Event('change', { bubbles: true }));
                return true;
            }
            return false;
        });

        // 3. යම් හෙයකින් ඉහත ක්‍රමය වැඩ නොකළොත් (Tab method as backup)
        if (!isTyped) {
            console.log("Selector failed, trying Tab method...");
            await page.keyboard.press('Tab'); await new Promise(r => setTimeout(r, 500));
            await page.keyboard.press('Tab'); await new Promise(r => setTimeout(r, 500));
            await page.keyboard.type('Dasun', { delay: 150 });
        }

        await new Promise(r => setTimeout(r, 3000));

        // 4. Join බොත්තම බලහත්කාරයෙන් Enable කර Click කිරීම
        console.log("Force-clicking Join button...");
        await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const joinBtn = buttons.find(b => b.innerText.toLowerCase().includes('join'));
            
            if (joinBtn) {
                // බොත්තම අක්‍රිය කරන ඕනෑම දෙයක් ඉවත් කරන්න
                joinBtn.removeAttribute('disabled');
                joinBtn.disabled = false;
                joinBtn.classList.remove('disabled');
                joinBtn.style.opacity = "1";
                joinBtn.style.pointerEvents = "auto";
                
                joinBtn.click(); // JavaScript Click
            }
        });

        // 5. Bot detected පණිවිඩය ආවොත් එය DOM එකෙන් ඉවත් කිරීම (Bypass error)
        await page.evaluate(() => {
            const alerts = document.querySelectorAll('.zm-alert, .alert, #join-err-msg');
            alerts.forEach(a => a.remove());
        });

        console.log("Execution finished. Monitoring UI...");

        // 6. මීටින් එක ඇතුළත UI සැඟවීම සහ Audio සම්බන්ධ කිරීම
        setInterval(async () => {
            try {
                await page.evaluate(() => {
                    const css = `
                        .meeting-app__watermark, .audio-watermark, .recording-label, .footer, .header, 
                        #onetrust-consent-sdk, .zm-modal, #live-indicator-container, .zm-notification { display: none !important; opacity: 0 !important; } 
                        .video-canvas-container { top: 0 !important; left: 0 !important; height: 100vh !important; width: 100vw !important; } 
                        body, html { overflow: hidden !important; cursor: none !important; }
                    `;
                    let style = document.getElementById('beta-style') || document.createElement('style');
                    style.id = 'beta-style'; style.innerHTML = css; document.head.appendChild(style);

                    const audioBtn = Array.from(document.querySelectorAll('button')).find(b => 
                        b.innerText.includes('Computer Audio') || b.innerText.includes('Join Audio')
                    );
                    if (audioBtn) audioBtn.click();
                });
            } catch (e) {}
        }, 5000);

    } catch (e) {
        console.error("Critical Failure:", e);
    }
}

run();
