const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function run() {
    console.log("Launching Chrome...");
    const browser = await puppeteer.launch({
        headless: false,
        executablePath: '/usr/bin/google-chrome', // පද්ධතියේ ඇති Chrome භාවිතා කරයි
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu',
            '--disable-dev-shm-usage',
            '--start-maximized',
            '--window-size=1920,1080',
            '--autoplay-policy=no-user-gesture-required',
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream'
        ],
        defaultViewport: null
    });

    const page = await browser.newPage();
    
    let zoomUrl = process.env.ZOOM_URL;
    if (zoomUrl.includes('/j/')) {
        zoomUrl = zoomUrl.replace('/j/', '/wc/join/');
    }

    console.log("Joining Zoom Meeting...");
    
    try {
        await page.goto(zoomUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        
        // මීටින් එකට ලොග් වීමේ පියවර
        await page.waitForSelector('#inputname', { timeout: 30000 });
        await page.type('#inputname', 'β Edu Live');
        await page.click('.u-btn.join-btn');
        console.log("Clicking Join...");

        await new Promise(r => setTimeout(r, 15000)); // රැඳී සිටීම

        // Watermarks සහ UI සැඟවීම
        await page.addStyleTag({
            content: `
                .meeting-app__watermark, .recording-label, .participant-id-label, 
                .zm-audio-status-indicator, .audio-watermark, #onetrust-consent-sdk { 
                    display: none !important; 
                }
            `
        });

        // Copyright Audio (Procedural)
        await page.evaluate(() => {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            setInterval(() => {
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(220, ctx.currentTime);
                g.gain.setValueAtTime(0.001, ctx.currentTime);
                osc.connect(g); g.connect(ctx.destination);
                osc.start(); osc.stop(ctx.currentTime + 1);
            }, 10000);
        });

        console.log("Stream is ready on virtual display.");
        await page.screenshot({ path: 'ready.png' });

    } catch (e) {
        console.error("Automation Error:", e);
        await page.screenshot({ path: 'error.png' });
    }
}

run();
