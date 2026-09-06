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
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ],
        ignoreDefaultArgs: ['--enable-automation']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    try {
        console.log("Zoom එකට ඇතුළු වෙමින්...");
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 90000 });

        // 1. පේජ් එක ලෝඩ් වෙනකම් තත්පර 30ක් ඉවසමු (හුඟක් වෙලාවට පරක්කු වෙන්නේ ඒකයි)
        await new Promise(r => setTimeout(r, 30000));

        // 2. නම ඇතුළත් කරන කොටුව හොයාගන්නා තෙක් උත්සාහ කිරීම (Retry Loop)
        let nameEntered = false;
        for (let i = 0; i < 5; i++) {
            console.log(`නම ඇතුළත් කිරීමට උත්සාහ කරයි (වාරය: ${i+1})...`);
            
            nameEntered = await page.evaluate(async () => {
                const input = document.querySelector('input[name="inputname"]') || 
                              document.querySelector('input[id="inputname"]') ||
                              document.querySelector('input[type="text"]');
                
                if (input) {
                    input.focus();
                    input.click();
                    input.value = ""; // කලින් තිබුණු දේවල් මකන්න
                    return true;
                }
                return false;
            });

            if (nameEntered) {
                // සැබෑ මනුස්සයෙක් වගේ අකුරෙන් අකුර ටයිප් කිරීම
                await page.keyboard.type('Dasun', { delay: 300 }); 
                // Zoom එකට නම ලැබුණා කියලා තහවුරු කරන්න Tab එකක් ඔබමු
                await page.keyboard.press('Tab');
                await new Promise(r => setTimeout(r, 2000));
                break;
            }
            await new Promise(r => setTimeout(r, 5000));
        }

        // 3. නම හරියට වැටිලද කියලා චෙක් කිරීම
        const finalCheck = await page.evaluate(() => {
            const el = document.querySelector('input');
            return el ? el.value : '';
        });

        if (finalCheck.includes('Dasun')) {
            console.log("නම සාර්ථකයි! දැන් Join වෙමු.");
            
            // 4. Join බොත්තම සොයා එය බලහත්කාරයෙන් එබීම
            await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const joinBtn = buttons.find(b => b.innerText.toLowerCase().includes('join'));
                if (joinBtn) {
                    joinBtn.disabled = false;
                    joinBtn.click();
                }
            });
        } else {
            console.log("නම වැටුණේ නැහැ. අන්තිම උත්සාහය ලෙස Tab ක්‍රමය භාවිතා කරයි...");
            await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
            await page.keyboard.type('Dasun', { delay: 200 });
            await page.keyboard.press('Enter');
        }

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

                    const btn = Array.from(document.querySelectorAll('button')).find(b => 
                        b.innerText.includes('Computer Audio') || b.innerText.includes('Join Audio')
                    );
                    if (btn) btn.click();
                });
            } catch (e) {}
        }, 5000);

    } catch (e) {
        console.error("දෝෂයක් පවතී:", e);
    }
}

run();
