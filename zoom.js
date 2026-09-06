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

        // 1. පේජ් එක ලෝඩ් වීමට සෑහෙන වේලාවක් (තත්පර 35ක්) ලබා දෙන්න
        console.log("Zoom පද්ධතිය ලෝඩ් වන තෙක් රැඳී සිටියි...");
        await new Promise(r => setTimeout(r, 35000));

        // 2. කරදරකාරී බැනර් සහ Tooltips මකා දැමීම
        await page.evaluate(() => {
            const trash = document.querySelectorAll('.ant-tooltip, #onetrust-consent-sdk, a, footer');
            trash.forEach(el => el.remove());
        });

        // 3. React පද්ධතිය මඟහැර නම ඇතුළත් කිරීමේ "Supirima" ක්‍රමය
        console.log("නම එන්නත් කරමින් (Injecting Name)...");
        await page.evaluate(() => {
            function setNativeValue(element, value) {
                const valueSetter = Object.getOwnPropertyDescriptor(element, 'value').set;
                const prototype = Object.getPrototypeOf(element);
                const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value').set;

                if (valueSetter && valueSetter !== prototypeValueSetter) {
                    prototypeValueSetter.call(element, value);
                } else {
                    valueSetter.call(element, value);
                }
            }

            const input = document.querySelector('input[name="inputname"]') || document.querySelector('input');
            if (input) {
                input.focus();
                // React State එක Update කරන නියම ක්‍රමය
                setNativeValue(input, 'Dasun');
                // Events Trigger කිරීම
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                input.dispatchEvent(new Event('blur', { bubbles: true }));
            }
        });

        // අමතර තහවුරු කිරීමට Keyboard එකෙන් තව වතාවක් ටයිප් කරන්න
        await page.keyboard.type(' ', { delay: 100 });
        await new Promise(r => setTimeout(r, 2000));

        // 4. Join බොත්තම බලහත්කාරයෙන් සක්‍රිය කර ක්ලික් කිරීම
        console.log("Join බොත්තම ඔබමින්...");
        await page.evaluate(() => {
            const joinBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('join'));
            if (joinBtn) {
                // බොත්තමේ බාධාවන් ඉවත් කිරීම
                joinBtn.disabled = false;
                joinBtn.classList.remove('disabled');
                joinBtn.removeAttribute('disabled');
                
                // JavaScript මගින් ක්ලික් කිරීම
                joinBtn.click();
            }
        });

        // Keyboard Enter එකත් Backup එකක් විදිහට ඔබමු
        await page.keyboard.press('Enter');

        // 5. මීටින් එක ඇතුළත UI පිරිසිදු කරන ලූපය
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
