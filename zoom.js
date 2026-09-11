const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const https = require('https');
const FormData = require('form-data');
puppeteer.use(StealthPlugin());

async function sendTelegramPhoto(photoPath, message) {
    const tgToken = process.env.TG_TOKEN;
    const chatId = process.env.CHAT_ID;
    if (!tgToken || !chatId) return;

    const form = new FormData();
    form.append('chat_id', chatId);
    form.append('caption', message);
    form.append('photo', fs.createReadStream(photoPath));

    const options = {
        method: 'POST',
        host: 'api.telegram.org',
        path: `/bot${tgToken}/sendPhoto`,
        headers: form.getHeaders()
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => { res.on('end', resolve); });
        req.on('error', reject);
        form.pipe(req);
    });
}

async function run() {
    const zoomUrl = process.env.ZOOM_URL;
    const zoomFullName = (process.env.ZOOM_NAME && process.env.ZOOM_NAME.trim() !== '') ? process.env.ZOOM_NAME : 'dasun madusan';
    const zoomEmail = (process.env.ZOOM_EMAIL && process.env.ZOOM_EMAIL.trim() !== '') ? process.env.ZOOM_EMAIL : 'betaedu00@gmail.com';

    let targetUrl = zoomUrl.includes('/j/') || zoomUrl.includes('/w/') ? zoomUrl.replace('/j/', '/wc/join/').replace('/w/', '/wc/join/') : zoomUrl;

    const browser = await puppeteer.launch({
        headless: false,
        executablePath: '/usr/bin/google-chrome',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080', '--start-maximized', '--disable-web-security'],
        ignoreDefaultArgs: ['--enable-automation']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    try {
        console.log("Zoom වෙත පිවිසෙමින්...");
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 90000 });
        await new Promise(r => setTimeout(r, 15000));

        // =====================================
        // Telegram එකෙන් එන දත්ත අරගෙන Type කරන Remote Control කොටස
        // =====================================
        setInterval(async () => {
            try {
                const res = await fetch(`https://api.github.com/repos/${process.env.GH_REPO}/actions/variables/ZOOM_CMD`, {
                    headers: { 'Authorization': `token ${process.env.GH_TOKEN}`, 'Accept': 'application/vnd.github.v3+json' }
                });
                
                if (res.ok) {
                    const data = await res.json();
                    if (data.value && data.value !== 'NONE') {
                        console.log("Telegram එකෙන් විධානයක් ලැබුණි: ", data.value);
                        
                        // තිරයේ පෙනෙන්නට ඇති හිස් Input කොටුවක් (Passcode / Email) සොයා එයට Type කිරීම
                        await page.evaluate(() => {
                            const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"])'));
                            for(let el of inputs) {
                                if(!el.disabled && el.offsetParent !== null) {
                                    el.focus();
                                    el.value = ''; // පරණ දත්ත මැකීම
                                    break;
                                }
                            }
                        });
                        
                        // දත්තය Type කර Enter ඔබයි
                        await page.keyboard.type(data.value, {delay: 50});
                        await page.keyboard.press('Enter');

                        // බොත්තමක් තියෙනවා නම් ඒකත් ඔබන්න උත්සාහ කරයි (උදා: Join/Submit)
                        await page.evaluate(() => {
                            const joinBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('join') || b.innerText.toLowerCase().includes('submit') || b.innerText.toLowerCase().includes('register'));
                            if(joinBtn) joinBtn.click();
                        });

                        // දත්තය පාවිච්චි කරලා ඉවර නිසා GitHub Variable එක ආයෙත් "NONE" කරනවා
                        await fetch(`https://api.github.com/repos/${process.env.GH_REPO}/actions/variables/ZOOM_CMD`, {
                            method: 'PATCH',
                            headers: { 'Authorization': `token ${process.env.GH_TOKEN}`, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name: 'ZOOM_CMD', value: 'NONE' })
                        });

                        // තත්පර 8කට පසු තිරයේ අලුත් තත්ත්වය Screenshot ගෙන Telegram එකට යවයි
                        setTimeout(async () => {
                            await page.screenshot({ path: 'after_fix.png' });
                            await sendTelegramPhoto('after_fix.png', "✅ ඔබ යැවූ දත්තය ඇතුළත් කළා! දැන් තිරය දිස්වන්නේ මෙලෙසයි.");
                        }, 8000);
                    }
                }
            } catch (e) { console.error("Remote control loop error"); }
        }, 10000); // සෑම තත්පර 10කට වරක් පරීක්ෂා කරයි
        // =====================================

        // සාමාන්‍ය Join / Register වැඩපිළිවෙල (කලින් කේතයමයි)
        const pageUrl = page.url();
        if (pageUrl.includes('/register/') || pageUrl.includes('webinar/register')) {
            const nameParts = zoomFullName.split(' ');
            await page.evaluate(({ fName, lName, email }) => {
                const triggerInput = (el, val) => { if (el) { el.focus(); Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(el, val); el.dispatchEvent(new Event('input', { bubbles: true })); } };
                triggerInput(document.querySelector('input[name="question_first_name"]') || document.querySelector('input[aria-label="First Name"]'), fName);
                triggerInput(document.querySelector('input[name="question_last_name"]') || document.querySelector('input[aria-label="Last Name"]'), lName);
                triggerInput(document.querySelector('input[name="question_email"]') || document.querySelector('input[aria-label="Email Address"]'), email);
            }, { fName: nameParts[0], lName: nameParts[1] || 'madusan', email: zoomEmail });
            await new Promise(r => setTimeout(r, 2000));
            await page.evaluate(() => { const btn = document.querySelector('button#btnSubmit') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Register') || b.innerText.includes('Join')); if (btn) btn.click(); });
        } else {
            await page.evaluate(({ name, email }) => {
                const triggerInput = (el, val) => { if (el) { el.focus(); Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(el, val); el.dispatchEvent(new Event('input', { bubbles: true })); } };
                triggerInput(document.querySelector('input[name="inputname"]'), name);
                triggerInput(document.querySelector('input[name="inputemail"]'), email);
            }, { name: zoomFullName, email: zoomEmail });
        }

        await new Promise(r => setTimeout(r, 2000));
        for (let i = 0; i < 5; i++) {
            await page.evaluate(() => { const joinBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('join') || b.innerText.toLowerCase().includes('agree')); if (joinBtn && !joinBtn.disabled) joinBtn.click(); });
            await page.keyboard.press('Enter');
            await new Promise(r => setTimeout(r, 3000));
        }

        // --- Screenshot එවන කොටස ---
        setTimeout(async () => {
            const isInMeeting = await page.evaluate(() => { return document.querySelector('.audio-watermark') !== null || document.querySelector('.meeting-app__watermark') !== null || Array.from(document.querySelectorAll('button')).some(b => b.innerText.includes('Leave')); });
            if (!isInMeeting) {
                await page.screenshot({ path: 'error_screen.png' });
                await sendTelegramPhoto('error_screen.png', "⚠️ අවධානයට: Stream එක හිර වී ඇත! කරුණාකර තිරයේ දිස්වන දේ පරීක්ෂා කර එයට අදාල දත්තය `/fix` සමග එවන්න. (උදා: /fix 12345)");
            }
        }, 60000);

        setInterval(async () => {
            try {
                await page.evaluate(() => {
                    const css = `.meeting-app__watermark, .audio-watermark, .recording-label, .footer, .header, #onetrust-consent-sdk, .zm-modal, #live-indicator-container { display: none !important; } .video-canvas-container { height: 100vh !important; width: 100vw !important; top:0!important; left:0!important; } body, html { cursor: none !important; overflow: hidden !important; }`;
                    let style = document.getElementById('beta-style') || document.createElement('style');
                    style.id = 'beta-style'; style.innerHTML = css; document.head.appendChild(style);
                    const audio = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Computer Audio'));
                    if (audio) audio.click();
                });
            } catch (e) {}
        }, 5000);

    } catch (e) {}
}
run();
