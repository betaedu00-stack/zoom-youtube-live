const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function run() {
    console.log("Starting Browser...");
    const browser = await puppeteer.launch({
        headless: false,
        executablePath: '/usr/bin/google-chrome', // Stable Chrome භාවිතා කිරීම
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
    await page.setViewport({ width: 1920, height: 1080 });

    let zoomUrl = process.env.ZOOM_URL;
    if (zoomUrl.includes('/j/')) {
        zoomUrl = zoomUrl.replace('/j/', '/wc/join/');
    }

    console.log("Navigating to Zoom: " + zoomUrl);
    
    try {
        await page.goto(zoomUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        
        // කුකීස් හෝ වෙනත් Popups මැකීම
        await page.addStyleTag({ content: '#onetrust-consent-sdk { display: none !important; }' });

        // නම ඇතුළත් කිරීම
        console.log("Waiting for Join Input...");
        await page.waitForSelector('#inputname', { timeout: 30000 });
        await page.type('#inputname', 'β Edu Live Stream');
        
        // Join Button එක එබීම
        await page.click('.u-btn.join-btn');
        console.log("Join Button Clicked.");

        // මීටින් එක ඇතුළට යන තෙක් රැඳී සිටීම
        await page.waitForTimeout(15000);

        // Watermarks සහ අනවශ්‍ය දේවල් CSS මගින් සැඟවීම
        await page.addStyleTag({
            content: `
                .meeting-app__watermark, .recording-label, .participant-id-label, 
                .zm-audio-status-indicator, .audio-watermark, .full-screen-widget { 
                    display: none !important; 
                    opacity: 0 !important;
                }
                body { overflow: hidden !important; }
            `
        });

        // Procedural Audio (Copyright වැළැක්වීමට සියුම් හඬක් නිපදවීම)
        await page.evaluate(() => {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            setInterval(() => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(200, audioCtx.currentTime);
                gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.5);
            }, 10000);
        });

        console.log("Automation successful. Ready to stream.");
        
        // Debugging Screenshot
        await page.screenshot({ path: 'zoom_live.png' });

    } catch (e) {
        console.error("Error: ", e);
        await page.screenshot({ path: 'error_debug.png' });
    }
}

run();
