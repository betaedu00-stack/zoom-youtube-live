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
            '--disable-web-security'
        ],
        ignoreDefaultArgs: ['--enable-automation']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // බොට් ලක්ෂණ සම්පූර්ණයෙන් සැඟවීම (Identity Spoofing)
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        window.chrome = { runtime: {} };
        Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
    });

    try {
        console.log("Zoom පේජ් එකට ඇතුළු වෙමින්...");
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 90000 });

        // පේජ් එක ලෝඩ් වීමට සෑහෙන වේලාවක් (තත්පර 40ක්) ලබා දෙන්න
        console.log("Zoom පද්ධතිය සූදානම් වන තෙක් රැඳී සිටියි...");
        await new Promise(r => setTimeout(r, 40000));

        // සියලුම බාධක එකවර ඉවත් කිරීමේ "Nuclear" Injection එක
        await page.evaluate(async () => {
            const nameToType = "Dasun";

            // 1. React පද්ධතිය ඇතුළට නම රිංගවීම
            function injectReactValue(el, value) {
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
                nativeInputValueSetter.call(el, value);
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }

            // 2. පේජ් එකේ තියෙන input එක හොයාගන්නා තෙක් ලූපයක් ක්‍රියාත්මක කිරීම
            const nameField = document.querySelector('input[name="inputname"]') || document.querySelector('input[type="text"]');
            
            if (nameField) {
                nameField.focus();
                injectReactValue(nameField, nameToType);
                console.log("නම Inject කරන ලදී.");
            }

            // 3. කරදරකාරී Cookies, Tooltips සහ ලින්ක් මකා දැමීම
            const trash = document.querySelectorAll('a, #onetrust-consent-sdk, .ant-tooltip, footer, .terms-service');
            trash.forEach(el => el.remove());

            // 4. Form එකේ Validation අක්‍රිය කිරීම (Please fill out this field වැළැක්වීමට)
            const forms = document.querySelectorAll('form');
            forms.forEach(f => f.setAttribute('novalidate', 'true'));
        });

        // සැබෑ මනුෂ්‍යයෙකු ලෙස Keyboard එකෙන් තහවුරු කිරීම
        await page.keyboard.press('Tab');
        await new Promise(r => setTimeout(r, 2000));
        await page.keyboard.type(' ', { delay: 100 });

        // 5. Join බොත්තම බලහත්කාරයෙන් ඔබන ලූපය (Force Click Loop)
        console.log("Join බොත්තම බලහත්කාරයෙන් ඔබමින්...");
        for (let i = 0; i < 10; i++) {
            await page.evaluate(() => {
                const joinBtn = Array.from(document.querySelectorAll('button')).find(b => 
                    b.innerText.toLowerCase().includes('join') && !b.innerText.toLowerCase().includes('sign')
                );
                
                if (joinBtn) {
                    joinBtn.disabled = false;
                    joinBtn.removeAttribute('disabled');
                    joinBtn.classList.remove('disabled');
                    joinBtn.style.backgroundColor = '#0E71EB'; // නිල් පාට කරන්න
                    joinBtn.click();
                }
            });
            await page.keyboard.press('Enter');
            await new Promise(r => setTimeout(r, 5000)); // සෑම තත්පර 5කට වරක්ම බොත්තම ඔබයි
        }

        // 6. මීටින් එක ඇතුළත UI පිරිසිදු කිරීම සහ Audio සම්බන්ධ කිරීම
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
