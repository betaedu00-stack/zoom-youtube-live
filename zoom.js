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
            '--window-size=1920,1080'
        ],
        ignoreDefaultArgs: ['--enable-automation']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    try {
        console.log("Navigating to:", targetUrl);
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 90000 });

        // 1. පේජ් එක ලෝඩ් වන තෙක් රැඳී සිටින්න
        await new Promise(r => setTimeout(r, 20000));

        // 2. නම ඇතුළත් කිරීම සහ Events Trigger කිරීම
        console.log("Entering Name...");
        await page.evaluate(() => {
            const input = document.querySelector('input[name="inputname"]') || document.querySelector('input[type="text"]');
            if (input) {
                input.focus();
                input.value = 'Dasun';
                // Zoom එකට නම ලැබුණු බව දැනුම් දීමට අවශ්‍ය සියලුම Events ක්‍රියාත්මක කිරීම
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
                input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
            }
        });

        // අමතර ආරක්ෂාවට Keyboard එකෙන්ද ටයිප් කරන්න
        await page.keyboard.type(' ', { delay: 100 }); 
        await new Promise(r => setTimeout(r, 2000));

        // 3. Join බොත්තම බලහත්කාරයෙන් සක්‍රිය කර ක්ලික් කිරීම (The Fix)
        console.log("Force enabling Join button...");
        await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const joinBtn = buttons.find(b => b.innerText.toLowerCase().includes('join'));
            
            if (joinBtn) {
                // බොත්තම අක්‍රිය කරන Class සහ Attributes ඉවත් කිරීම
                joinBtn.removeAttribute('disabled');
                joinBtn.classList.remove('disabled');
                joinBtn.disabled = false;
                joinBtn.style.opacity = "1";
                joinBtn.style.pointerEvents = "auto";
                
                // ක්ලික් කිරීම
                joinBtn.click();
                console.log("Join button clicked via script.");
            }
        });

        // 4. යම් හෙයකින් ඉහත ක්‍රමය මදි වුවහොත් Mouse එකෙන් බොත්තම ක්ලික් කිරීම
        const joinButtonCoords = await page.evaluate(() => {
            const b = Array.from(document.querySelectorAll('button')).find(btn => btn.innerText.toLowerCase().includes('join'));
            if (b) {
                const { left, top, width, height } = b.getBoundingClientRect();
                return { x: left + width / 2, y: top + height / 2 };
            }
            return null;
        });

        if (joinButtonCoords) {
            await page.mouse.click(joinButtonCoords.x, joinButtonCoords.y);
        }

        // 5. මීටින් එක තුළ UI පිරිසිදු කිරීම
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
        console.error("Error:", e);
    }
}

run();
