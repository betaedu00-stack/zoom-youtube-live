const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function run() {
    let zoomUrl = process.env.ZOOM_URL;
    if (!zoomUrl) {
        console.error("No Zoom URL provided!");
        process.exit(1);
    }

    // 1. ලින්ක් එක ඕනෑම එකකට වැඩ කරන ලෙස සකස් කිරීම (Normalization)
    // /j/ (Meeting) හෝ /w/ (Webinar) හෝ /s/ සියල්ලම /wc/join/ (Web Client) බවට හරවයි
    let targetUrl = zoomUrl
        .replace('/j/', '/wc/join/')
        .replace('/w/', '/wc/join/')
        .replace('/s/', '/wc/join/')
        .replace('/j/', '/wc/join/'); 

    // දැනටමත් /wc/join/ නැතිනම් එය එකතු කිරීම (සමහර ලින්ක් සඳහා)
    if (!targetUrl.includes('/wc/join/')) {
        targetUrl = targetUrl.replace('.zoom.us/', '.zoom.us/wc/join/');
    }

    console.log("Original URL:", zoomUrl);
    console.log("Targeting Web Client URL:", targetUrl);

    const browser = await puppeteer.launch({
        headless: false,
        executablePath: '/usr/bin/google-chrome',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu',
            '--window-size=1920,1080',
            '--start-maximized',
            '--kiosk',
            '--disable-infobars',
            '--autoplay-policy=no-user-gesture-required'
        ],
        ignoreDefaultArgs: ['--enable-automation'],
        defaultViewport: { width: 1920, height: 1080 }
    });

    const page = await browser.newPage();

    try {
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 90000 });
        console.log("Page loaded. Waiting for joining steps...");

        // 2. නම (සහ අවශ්‍ය නම් ඊමේල්) ඇතුළත් කිරීමේ පියවර
        await new Promise(r => setTimeout(r, 15000));

        await page.evaluate(() => {
            // තිරයේ ඇති සියලුම input fields සෙවීම
            const inputs = Array.from(document.querySelectorAll('input'));
            
            // නම ඇතුළත් කිරීම
            const nameField = inputs.find(i => i.type === 'text' || i.id === 'inputname' || i.name === 'name' || i.placeholder.includes('Name'));
            if (nameField) {
                nameField.value = 'β Edu Live';
                nameField.dispatchEvent(new Event('input', { bubbles: True }));
            }

            // Webinar එකකදී ඊමේල් එක ඇසුවේ නම් එයට දත්තයක් ඇතුළත් කිරීම
            const emailField = inputs.find(i => i.type === 'email' || i.name === 'email' || i.placeholder.includes('Email'));
            if (emailField) {
                emailField.value = 'live@betaedu.com'; // ඕනෑම ඊමේල් එකක්
                emailField.dispatchEvent(new Event('input', { bubbles: True }));
            }
        });

        // 3. Join/Enter Button එක එබීම
        console.log("Attempting to click Join...");
        await page.keyboard.press('Enter'); 
        await new Promise(r => setTimeout(r, 2000));
        await page.keyboard.press('Enter'); // තහවුරු කිරීමට

        // 4. UI පිරිසිදු කිරීම සහ Audio සම්බන්ධ කිරීම (Loop)
        setInterval(async () => {
            try {
                await page.evaluate(() => {
                    // වෝටර්මාර්ක්, ලේබල් සහ කළු පෙට්ටි මැකීම
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

                    // "Join Audio" බටන් එකක් මතු වුවහොත් එය එබීම
                    const btns = Array.from(document.querySelectorAll('button'));
                    const audioBtn = btns.find(b => b.innerText.includes('Computer Audio'));
                    if (audioBtn) audioBtn.click();
                });
            } catch (e) {}
        }, 5000);

    } catch (error) {
        console.error("Error in Zoom Logic:", error);
    }
}

run();
