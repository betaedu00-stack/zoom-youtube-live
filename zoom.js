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
            '--start-maximized'
        ],
        ignoreDefaultArgs: ['--enable-automation']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    try {
        console.log("Zoom වෙත පිවිසෙමින්...");
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 90000 });

        // 1. පේජ් එක ලෝඩ් වීමට සෑහෙන වේලාවක් ලබා දෙන්න
        await new Promise(r => setTimeout(r, 25000));

        // 2. Cookies සහ කරදරකාරී ලින්ක් මකා දැමීම (Click එක නිවැරදි වීමට මෙය අත්‍යවශ්‍යයි)
        await page.evaluate(() => {
            const elementsToRemove = document.querySelectorAll('#onetrust-consent-sdk, a, footer, .terms-service');
            elementsToRemove.forEach(el => el.remove());
        });

        // 3. නම ඇතුළත් කිරීම (සැබෑ මනුෂ්‍යයෙක් ටයිප් කරනවා වගේ)
        const inputSelector = 'input[name="inputname"]';
        await page.waitForSelector(inputSelector, { visible: true });
        await page.click(inputSelector);
        
        await page.keyboard.down('Control');
        await page.keyboard.press('A');
        await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');

        console.log("නම ටයිප් කරමින්...");
        const name = "Dasun";
        for (let char of name) {
            await page.keyboard.type(char, { delay: Math.random() * 300 + 100 });
        }

        // ටයිප් කර තත්පර 3ක් ඉන්න (Human delay)
        await new Promise(r => setTimeout(r, 3000));

        // 4. Join බොත්තම මවුස් එකෙන් ක්ලික් කිරීම (The Coordinate Click)
        console.log("Join බොත්තම මවුස් එකෙන් ක්ලික් කරමින්...");
        const joinBtnHandle = await page.evaluateHandle(() => {
            return Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('join'));
        });

        if (joinBtnHandle) {
            const box = await joinBtnHandle.boundingBox();
            if (box) {
                // මවුස් එක බොත්තම මැදට ගෙන ගොස් ක්ලික් කිරීම
                await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
                await page.mouse.down();
                await new Promise(r => setTimeout(r, 100));
                await page.mouse.up();
                console.log("Mouse Click සාර්ථකයි!");
            }
        }

        // 5. මීටින් එක ඇතුළත UI පිරිසිදු කිරීම සහ Audio සම්බන්ධ කිරීම
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
        console.error("දෝෂයක් පවතී:", e);
    }
}

run();
