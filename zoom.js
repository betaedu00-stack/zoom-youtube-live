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
            '--disable-blink-features=AutomationControlled', // බොට් එකක් බව හැඟවෙන ප්‍රධාන ලක්ෂණය අක්‍රිය කරයි
            '--disable-infobars',
            '--window-size=1920,1080',
            '--start-maximized'
        ],
        ignoreDefaultArgs: ['--enable-automation']
    });

    const page = await browser.newPage();

    // 1. Browser එකේ ඇති සියලුම 'Bot' ලක්ෂණ සැඟවීම
    await page.evaluateOnNewDocument(() => {
        // WebDriver property එක ඉවත් කිරීම
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        // Chrome object එකක් ඇති බව පෙන්වීම
        window.chrome = { runtime: {} };
        // Plugins සහ Languages සැබෑ ලෙස පෙන්වීම
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    });

    try {
        console.log("Navigating to Zoom with Ultimate Stealth...");
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 90000 });

        // 2. සැබෑ මනුෂ්‍යයෙකු ලෙස Mouse එක චලනය කිරීම
        await page.mouse.move(100, 100);
        await new Promise(r => setTimeout(r, 2000));
        await page.mouse.move(400, 300);

        // 3. පේජ් එක ලෝඩ් වන තෙක් තත්පර 15ක් රැඳී සිටින්න
        await new Promise(r => setTimeout(r, 15000));

        // 4. යම් හෙයකින් Bot Warning එක ආවොත් එය DOM එකෙන් බලහත්කාරයෙන් ඉවත් කිරීම
        await page.evaluate(() => {
            const warning = document.querySelector('.zm-alert') || document.querySelector('.alert-warning');
            if (warning) warning.remove();
            
            // "Sign in to join" බොත්තම වෙනුවට සාමාන්‍ය Join බොත්තම පෙන්වීමට උත්සාහ කිරීම
            const signBtn = document.querySelector('.zm-btn--primary');
            if (signBtn && signBtn.innerText.includes('Sign in')) {
                signBtn.innerText = 'Join';
            }
        });

        // 5. නම ඇතුළත් කිරීම (Dasun)
        console.log("Entering Name...");
        const inputSelector = 'input[name="inputname"]';
        await page.waitForSelector(inputSelector, { visible: true });
        await page.click(inputSelector);
        
        // අකුරෙන් අකුර සැබෑ ලෙස ටයිප් කිරීම
        const name = "Dasun";
        for (let char of name) {
            await page.keyboard.type(char, { delay: 200 });
        }

        await new Promise(r => setTimeout(r, 2000));

        // 6. Join බොත්තම ක්ලික් කිරීම
        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const joinBtn = btns.find(b => b.innerText.toLowerCase().includes('join'));
            if (joinBtn) {
                joinBtn.disabled = false;
                joinBtn.click();
            }
        });

        console.log("Join Attempted!");

        // 7. මීටින් එක තුළ UI පිරිසිදු කිරීමේ ලූපය
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
