const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const https = require('https');
const FormData = require('form-data');

puppeteer.use(StealthPlugin());

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));


// ======================================================
// TELEGRAM
// ======================================================

async function sendTelegramPhoto(photoPath, message) {
    const tgToken = process.env.TG_TOKEN;
    const chatId = process.env.CHAT_ID;

    if (!tgToken || !chatId) {
        console.log("Telegram credentials missing.");
        return;
    }

    if (!fs.existsSync(photoPath)) {
        console.log("Screenshot file not found:", photoPath);
        return;
    }

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

        const req = https.request(options, (res) => {

            let data = '';

            res.on('data', chunk => {
                data += chunk;
            });

            res.on('end', () => {
                console.log("Telegram response:", data);
                resolve(data);
            });

        });

        req.on('error', reject);

        form.pipe(req);
    });
}


async function sendTelegramMessage(message) {

    const tgToken = process.env.TG_TOKEN;
    const chatId = process.env.CHAT_ID;

    if (!tgToken || !chatId) return;

    const body = JSON.stringify({
        chat_id: chatId,
        text: message
    });

    const options = {
        method: 'POST',
        host: 'api.telegram.org',
        path: `/bot${tgToken}/sendMessage`,
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body)
        }
    };

    return new Promise((resolve, reject) => {

        const req = https.request(options, (res) => {

            res.on('data', () => {});

            res.on('end', resolve);
        });

        req.on('error', reject);

        req.write(body);
        req.end();
    });
}


// ======================================================
// GITHUB VARIABLE
// ======================================================

async function getGithubCommand() {

    const repo = process.env.GH_REPO;
    const token = process.env.GH_TOKEN;

    if (!repo || !token) {
        return null;
    }

    try {

        const res = await fetch(
            `https://api.github.com/repos/${repo}/actions/variables/ZOOM_CMD`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github+json'
                }
            }
        );

        if (!res.ok) {
            return null;
        }

        const data = await res.json();

        return data.value || null;

    } catch (e) {

        console.log("GitHub command read error:", e.message);

        return null;
    }
}


async function resetGithubCommand() {

    const repo = process.env.GH_REPO;
    const token = process.env.GH_TOKEN;

    if (!repo || !token) return;

    try {

        await fetch(
            `https://api.github.com/repos/${repo}/actions/variables/ZOOM_CMD`,
            {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: 'ZOOM_CMD',
                    value: 'NONE'
                })
            }
        );

    } catch (e) {

        console.log("GitHub command reset error:", e.message);
    }
}


// ======================================================
// SCREENSHOT
// ======================================================

async function sendCurrentScreenshot(page, reason) {

    try {

        const path = '/tmp/zoom_current.png';

        await page.screenshot({
            path: path,
            fullPage: false
        });

        await sendTelegramPhoto(
            path,
            `⚠️ Zoom එකේ මේ අවස්ථාවේදී action එකක් අවශ්‍යයි.\n\n${reason}\n\n` +
            `Screenshot එක බලලා අවශ්‍ය command එක Telegram එකෙන් එවන්න.\n\n` +
            `/type value\n` +
            `/click Join\n` +
            `/click Continue\n` +
            `/screenshot`
        );

        console.log("Screenshot sent to Telegram.");

    } catch (e) {

        console.log("Screenshot error:", e.message);
    }
}


// ======================================================
// PAGE TEXT
// ======================================================

async function getPageInfo(page) {

    try {

        return await page.evaluate(() => {

            const visible = (el) => {

                const style = window.getComputedStyle(el);

                return (
                    style.display !== 'none' &&
                    style.visibility !== 'hidden' &&
                    el.offsetParent !== null
                );
            };

            const inputs = Array.from(
                document.querySelectorAll('input, textarea')
            )
            .filter(visible)
            .map((el, index) => ({
                index,
                type: el.type || '',
                name: el.name || '',
                id: el.id || '',
                placeholder: el.placeholder || '',
                aria: el.getAttribute('aria-label') || '',
                value: el.value || ''
            }));


            const buttons = Array.from(
                document.querySelectorAll('button')
            )
            .filter(visible)
            .map((el, index) => ({
                index,
                text: (el.innerText || el.textContent || '')
                    .trim()
                    .replace(/\s+/g, ' ')
            }))
            .filter(x => x.text);


            return {
                url: location.href,
                title: document.title,
                inputs,
                buttons
            };

        });

    } catch (e) {

        return {
            url: page.url(),
            title: '',
            inputs: [],
            buttons: []
        };
    }
}


// ======================================================
// CLICK BUTTON
// ======================================================

async function clickButtonByText(page, wantedText) {

    const wanted = wantedText.toLowerCase().trim();

    return await page.evaluate((wanted) => {

        const visible = (el) => {

            const style = window.getComputedStyle(el);

            return (
                style.display !== 'none' &&
                style.visibility !== 'hidden' &&
                el.offsetParent !== null
            );
        };


        const buttons = Array.from(
            document.querySelectorAll(
                'button, [role="button"], input[type="button"], input[type="submit"]'
            )
        ).filter(visible);


        let target = buttons.find(el => {

            const text = (
                el.innerText ||
                el.textContent ||
                el.value ||
                ''
            )
            .trim()
            .toLowerCase();

            return text === wanted;
        });


        if (!target) {

            target = buttons.find(el => {

                const text = (
                    el.innerText ||
                    el.textContent ||
                    el.value ||
                    ''
                )
                .trim()
                .toLowerCase();

                return text.includes(wanted);
            });
        }


        if (target) {

            target.scrollIntoView({
                behavior: 'instant',
                block: 'center'
            });

            target.click();

            return true;
        }


        return false;

    }, wanted);
}


// ======================================================
// TYPE INTO BEST INPUT
// ======================================================

async function typeIntoBestInput(page, value) {

    const info = await getPageInfo(page);

    console.log("Visible inputs:", info.inputs);


    // --------------------------------------------------
    // If only one input exists, use it.
    // --------------------------------------------------

    if (info.inputs.length === 1) {

        const input = info.inputs[0];

        await page.evaluate((input) => {

            const el =
                document.querySelectorAll('input, textarea')[input.index];

            if (el) {
                el.focus();
                el.value = '';
            }

        }, input);

        await page.keyboard.type(value, {
            delay: 40
        });

        return true;
    }


    // --------------------------------------------------
    // Try common input fields.
    // --------------------------------------------------

    const candidates = [
        'input[name="inputname"]',
        'input[name="inputemail"]',
        'input[name="name"]',
        'input[name="email"]',
        'input[type="email"]',
        'input[placeholder*="name" i]',
        'input[placeholder*="email" i]',
        'input[aria-label*="name" i]',
        'input[aria-label*="email" i]',
        'input[placeholder*="passcode" i]',
        'input[placeholder*="password" i]'
    ];


    for (const selector of candidates) {

        try {

            const element = await page.$(selector);

            if (element) {

                const visible = await element.isIntersectingViewport();

                if (visible) {

                    await element.click({
                        clickCount: 3
                    });

                    await page.keyboard.press('Backspace');

                    await page.keyboard.type(value, {
                        delay: 40
                    });

                    return true;
                }
            }

        } catch (e) {}
    }


    // --------------------------------------------------
    // Last fallback: first visible editable field.
    // --------------------------------------------------

    const result = await page.evaluate(() => {

        const visible = (el) => {

            const style = window.getComputedStyle(el);

            return (
                style.display !== 'none' &&
                style.visibility !== 'hidden' &&
                el.offsetParent !== null &&
                !el.disabled
            );
        };


        const el = Array.from(
            document.querySelectorAll('input, textarea')
        ).find(visible);


        if (el) {

            el.focus();

            el.value = '';

            return true;
        }

        return false;
    });


    if (result) {

        await page.keyboard.type(value, {
            delay: 40
        });

        return true;
    }


    return false;
}


// ======================================================
// AUTOMATIC COMMON BUTTONS
// ======================================================

async function tryCommonButtons(page) {

    const buttons = [
        'Join from your browser',
        'Join from Browser',
        'Join',
        'Continue',
        'Submit',
        'Register',
        'I Agree',
        'Agree'
    ];


    for (const text of buttons) {

        try {

            const clicked = await clickButtonByText(
                page,
                text
            );

            if (clicked) {

                console.log("Clicked:", text);

                await sleep(3000);

                return true;
            }

        } catch (e) {}
    }

    return false;
}


// ======================================================
// COMMAND HANDLER
// ======================================================

async function handleTelegramCommand(page, command) {

    if (!command || command === 'NONE') {
        return false;
    }


    console.log("Received command:", command);


    // --------------------------------------------------
    // /type VALUE
    // --------------------------------------------------

    if (command.startsWith('/type ')) {

        const value = command.substring(6).trim();

        if (!value) {

            await sendTelegramMessage(
                "⚠️ /type command එකට value එකක් දෙන්න.\n\nඋදාහරණය:\n/type 123456"
            );

            await resetGithubCommand();

            return true;
        }


        const typed = await typeIntoBestInput(
            page,
            value
        );


        if (typed) {

            await sleep(1000);

            await page.keyboard.press('Enter');

            await sleep(3000);

            await tryCommonButtons(page);

            await sendTelegramMessage(
                "✅ Value එක browser එකේ input කරලා තියෙනවා."
            );

        } else {

            await sendTelegramMessage(
                "⚠️ දැනට browser එකේ editable input එකක් හමු වුණේ නැහැ."
            );
        }


        await resetGithubCommand();

        return true;
    }


    // --------------------------------------------------
    // /click BUTTON
    // --------------------------------------------------

    if (command.startsWith('/click ')) {

        const text = command.substring(7).trim();

        const clicked = await clickButtonByText(
            page,
            text
        );


        if (clicked) {

            await sleep(4000);

            await sendTelegramMessage(
                `✅ "${text}" button එක click කළා.`
            );

        } else {

            await sendTelegramMessage(
                `⚠️ "${text}" කියන button එක හමු වුණේ නැහැ.`
            );
        }


        await resetGithubCommand();

        return true;
    }


    // --------------------------------------------------
    // /screenshot
    // --------------------------------------------------

    if (command === '/screenshot') {

        await sendCurrentScreenshot(
            page,
            "ඔයා screenshot එකක් ඉල්ලලා තියෙනවා."
        );

        await resetGithubCommand();

        return true;
    }


    // --------------------------------------------------
    // /enter
    // --------------------------------------------------

    if (command === '/enter') {

        await page.keyboard.press('Enter');

        await sleep(3000);

        await sendTelegramMessage(
            "✅ Enter press කළා."
        );

        await resetGithubCommand();

        return true;
    }


    // --------------------------------------------------
    // /auto
    // --------------------------------------------------

    if (command === '/auto') {

        await tryCommonButtons(page);

        await page.keyboard.press('Enter');

        await sleep(3000);

        await sendTelegramMessage(
            "⚡ Automatic Join attempt එකක් කළා."
        );

        await resetGithubCommand();

        return true;
    }


    // --------------------------------------------------
    // Unknown command
    // --------------------------------------------------

    await sendTelegramMessage(
        "⚠️ Unknown command එකක්.\n\nභාවිතා කරන්න:\n/type value\n/click Join\n/click Continue\n/enter\n/screenshot\n/auto"
    );

    await resetGithubCommand();

    return true;
}


// ======================================================
// MAIN
// ======================================================

async function run() {

    const zoomUrl = process.env.ZOOM_URL;

    const zoomFullName =
        process.env.ZOOM_NAME &&
        process.env.ZOOM_NAME.trim() !== ''
            ? process.env.ZOOM_NAME.trim()
            : 'dasun madusan';


    const zoomEmail =
        process.env.ZOOM_EMAIL &&
        process.env.ZOOM_EMAIL.trim() !== ''
            ? process.env.ZOOM_EMAIL.trim()
            : 'betaedu00@gmail.com';


    if (!zoomUrl) {

        console.log("ZOOM_URL missing.");

        return;
    }


    console.log("====================================");
    console.log("Zoom Automation Starting");
    console.log("Name:", zoomFullName);
    console.log("Email:", zoomEmail);
    console.log("URL:", zoomUrl);
    console.log("====================================");


    const browser = await puppeteer.launch({

        headless: false,

        executablePath: '/usr/bin/google-chrome',

        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--window-size=1920,1080',
            '--start-maximized',
            '--disable-dev-shm-usage',
            '--autoplay-policy=no-user-gesture-required'
        ],

        ignoreDefaultArgs: [
            '--enable-automation'
        ]
    });


    const page = await browser.newPage();


    await page.setViewport({
        width: 1920,
        height: 1080
    });


    // --------------------------------------------------
    // Permissions
    // --------------------------------------------------

    const context = browser.defaultBrowserContext();

    try {

        await context.overridePermissions(
            'https://zoom.us',
            [
                'microphone',
                'camera',
                'notifications'
            ]
        );

    } catch (e) {}


    try {

        console.log("Opening original Zoom URL...");

        await page.goto(
            zoomUrl,
            {
                waitUntil: 'domcontentloaded',
                timeout: 120000
            }
        );


        await sleep(8000);


        // ==================================================
        // Main monitoring loop
        // ==================================================

        let lastScreenshotTime = 0;

        while (true) {

            try {

                const info = await getPageInfo(page);

                console.log(
                    "Current URL:",
                    info.url
                );


                console.log(
                    "Inputs:",
                    info.inputs.length,
                    "Buttons:",
                    info.buttons.length
                );


                // --------------------------------------------------
                // Try browser join / common buttons automatically
                // --------------------------------------------------

                await tryCommonButtons(page);


                // --------------------------------------------------
                // Detect common registration / input screen
                // --------------------------------------------------

                const hasInputs =
                    info.inputs.length > 0;


                const buttonText =
                    info.buttons
                        .map(x => x.text.toLowerCase())
                        .join(' ');


                const looksLikeJoinScreen =
                    hasInputs ||
                    buttonText.includes('join') ||
                    buttonText.includes('register') ||
                    buttonText.includes('continue') ||
                    buttonText.includes('passcode');


                // --------------------------------------------------
                // Screenshot only periodically
                // --------------------------------------------------

                const now = Date.now();


                if (
                    looksLikeJoinScreen &&
                    now - lastScreenshotTime > 30000
                ) {

                    lastScreenshotTime = now;


                    await sendCurrentScreenshot(
                        page,
                        "Zoom join/registration screen එකක් හඳුනාගත්තා."
                    );
                }


                // --------------------------------------------------
                // Check Telegram command
                // --------------------------------------------------

                const command =
                    await getGithubCommand();


                if (
                    command &&
                    command !== 'NONE'
                ) {

                    await handleTelegramCommand(
                        page,
                        command
                    );
                }


                // --------------------------------------------------
                // Meeting detection
                // --------------------------------------------------

                const meetingDetected =
                    await page.evaluate(() => {

                        const text =
                            document.body
                                ? document.body.innerText.toLowerCase()
                                : '';

                        return (
                            text.includes('leave') ||
                            text.includes('participants') ||
                            text.includes('mute') ||
                            text.includes('unmute') ||
                            text.includes('stop video')
                        );
                    });


                if (meetingDetected) {

                    console.log(
                        "Possible meeting screen detected."
                    );


                    await sendTelegramMessage(
                        "🟢 Zoom meeting screen එක detect වුණා.\n\nදැන් YouTube stream එකට යාමට browser එක සූදානම්."
                    );


                    // Meeting detected.
                    // Do not exit browser.
                    // FFmpeg workflow continues.
                }


                await sleep(10000);

            } catch (loopError) {

                console.log(
                    "Monitoring loop error:",
                    loopError.message
                );

                await sleep(5000);
            }
        }

    } catch (error) {

        console.log(
            "Zoom automation error:",
            error
        );


        try {

            await page.screenshot({
                path: '/tmp/zoom_error.png'
            });


            await sendTelegramPhoto(
                '/tmp/zoom_error.png',
                `❌ Zoom automation error.\n\n${error.message}`
            );

        } catch (e) {}

    }
}


run();
