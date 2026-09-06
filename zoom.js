const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function run() {
    const zoomUrl = process.env.ZOOM_URL;
    if (!zoomUrl) { process.exit(1); }

    // ලින්ක් එක ඕනෑම එකකට වැඩ කරන ලෙස සැකසීම (/j/ හෝ /w/ -> /wc/join/)
    let targetUrl = zoomUrl.replace('/j/', '/wc/join/').replace('/w/', '/wc/join/');
    if (!targetUrl.includes('/wc/join/')) {
        targetUrl = targetUrl.replace('.zoom.us/', '.zoom.us/wc/join/');
    }

    const browser = await puppeteer.launch({
        headless: false,
        executablePath: '/usr/bin/google-chrome',
        args: [
            '--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu',
            '--window-size=1920,1080', '--start-maximized', '--kiosk',
            '--disable-infobars', '--autoplay-policy=no-user-gesture-required'
        ],
        ignoreDefaultArgs: ['--enable-automation'],
        defaultViewport: { width: 1920, height: 1080 }
    });

    const page = await browser.newPage();
    console.log("Opening Zoom Web Client:", targetUrl);
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 90000 });

    try {
        // 1. නම ඇතුළත් කිරීමේ කොටස එනතෙක් රැඳී සිටීම
        await page.waitForSelector('input', { visible: true, timeout: 60000 });
        console.log("Join field found. Entering details...");

        // 2. නම සහ ඊමේල් ඇතුළත් කර Join බටන් එක එබීම (Advanced JS Injection)
        await page.evaluate(() => {
            const inputs = Array.from(document.querySelectorAll('input'));
            
            // නම ඇතුළත් කරන කොටුව සොයා ගැනීම
            const nameField = inputs.find(i => i.type === 'text' || i.id === 'inputname' || i.placeholder.includes('Name'));
            if (nameField) {
                nameField.value = 'β Edu Live';
                nameField.dispatchEvent(new Event('input', { bubbles: true }));
                nameField.dispatchEvent(new Event('change', { bubbles: true }));
            }

            // වෙබිනාර් එකක් නම් ඊමේල් එකත් පිරවීම
            const emailField = inputs.find(i => i.type === 'email' || i.placeholder.includes('Email'));
            if (emailField) {
                emailField.value = 'live@betaedu.com';
                emailField.dispatchEvent(new Event('input', { bubbles: true }));
                emailField.dispatchEvent(new Event('change', { bubbles: true }));
            }

            // Join බටන් එක සොයාගෙන එබීම
            setTimeout(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const joinBtn = buttons.find(b => b.innerText.includes('Join') || b.classList.contains('join-btn'));
                if (joinBtn) joinBtn.click();
            }, 1000);
        });

        // 3. මීටින් එක ඇතුළතදී Audio සම්බන්ධ කිරීම සහ පෙනුම පිරිසිදු කිරීම (Infinite Loop)
        setInterval(async () => {
            try {
                await page.evaluate(() => {
                    // වෝටර්මාර්ක් සහ අනවශ්‍ය දේවල් මැකීම
                    const selectors = [
                        '.meeting-app__watermark', '.audio-watermark', '.recording-label',
                        '.participant-id-label', '.meeting-info-icon__container', 
                        '.footer', '.pwa-footer', '.header', '.pwa-header',
                        '#onetrust-consent-sdk', '.zm-modal', '#live-indicator-container',
                        '.zm-notification', '.notification-list-container'
                    ];
                    selectors.forEach(s => {
                        const el = document.querySelector(s);
                        if (el) el.style.display = 'none';
                    });

                    // Audio සම්බන්ධ කිරීමේ පණිවිඩය ආවොත් එය ක්ලික් කිරීම
                    const btns = Array.from(document.querySelectorAll('button'));
                    const audioBtn = btns.find(b => b.innerText.includes('Computer Audio'));
                    if (audioBtn) audioBtn.click();
                    
                    // වීඩියෝව මුළු තිරයටම ගැනීම
                    const video = document.querySelector('.video-canvas-container');
                    if (video) {
                        video.style.top = '0'; video.style.left = '0';
                        video.style.height = '100vh'; video.style.width = '100vw';
                    }
                });
            } catch (e) {}
        }, 5000);

    } catch (error) {
        console.error("Automation error:", error);
    }
}

run();
