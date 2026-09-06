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
            '--disable-web-security',
            '--allow-running-insecure-content'
        ],
        ignoreDefaultArgs: ['--enable-automation']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    try {
        console.log("Zoom වෙත ප්‍රවේශ වෙමින්...");
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 90000 });

        // 1. Zoom පද්ධතිය සූදානම් වීමට සෑහෙන වේලාවක් (තත්පර 40ක්) ලබා දෙන්න
        console.log("Zoom Scripts ලෝඩ් වන තෙක් රැඳී සිටියි...");
        await new Promise(r => setTimeout(r, 40000));

        // 2. අත්‍යවශ්‍ය පියවර: reCAPTCHA සහ අනවශ්‍ය වැටවල් (Validation) ඉවත් කිරීම
        await page.evaluate(() => {
            // HTML5 Validation අක්‍රිය කිරීම (Please fill out this field පණිවිඩය එන එක නවත්වයි)
            const forms = document.querySelectorAll('form');
            forms.forEach(f => f.setAttribute('novalidate', 'true'));
            
            const inputs = document.querySelectorAll('input');
            inputs.forEach(i => {
                i.removeAttribute('required');
                i.setAttribute('aria-required', 'false');
            });

            // බැනර් සහ අනවශ්‍ය Modals මකා දැමීම
            const trash = document.querySelectorAll('.ant-tooltip, #onetrust-consent-sdk, a, footer, .terms-service');
            trash.forEach(el => el.remove());
        });

        // 3. නම ඇතුළත් කිරීමේ ප්‍රබලම ක්‍රමය (System-level Insertion)
        console.log("නම ඇතුළත් කරමින්...");
        const nameInput = 'input[name="inputname"]';
        await page.waitForSelector(nameInput, { visible: true });
        
        await page.click(nameInput);
        await new Promise(r => setTimeout(r, 1000));

        // Browser එකේ අභ්‍යන්තර "InsertText" විධානය මගින් නම එන්නත් කිරීම
        await page.evaluate((name) => {
            const el = document.querySelector('input[name="inputname"]');
            el.focus();
            document.execCommand('insertText', false, name);
            el.dispatchEvent(new Event('input', { bubbles: true }));
        }, 'Dasun');

        await new Promise(r => setTimeout(r, 3000));

        // 4. Join බොත්තම බලහත්කාරයෙන් Enable කර ක්ලික් කිරීම (The Forceful Join)
        console.log("Join බොත්තම ඔබමින්...");
        await page.evaluate(() => {
            const joinBtn = Array.from(document.querySelectorAll('button')).find(b => 
                b.innerText.toLowerCase().includes('join') && !b.innerText.toLowerCase().includes('sign')
            );
            
            if (joinBtn) {
                // බොත්තම Disable කරන හැම දේම අයින් කරන්න
                joinBtn.disabled = false;
                joinBtn.removeAttribute('disabled');
                joinBtn.classList.remove('disabled');
                joinBtn.style.pointerEvents = 'auto';
                joinBtn.style.opacity = '1';
                joinBtn.style.backgroundColor = '#0E71EB'; // නිල් පාට කරන්න
                
                // බලහත්කාරයෙන් ක්ලික් කරන්න
                joinBtn.click();
            }
        });

        // Enter backup එකක් ලෙස ඔබන්න
        await page.keyboard.press('Enter');

        // 5. මීටින් එක ඇතුළත සියල්ල පිරිසිදු කරන ලූපය
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
        console.error("බරපතල දෝෂයකි:", e);
    }
}

run();
