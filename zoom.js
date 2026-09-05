const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function run() {
    const browser = await puppeteer.launch({
        headless: false, // Xvfb හරහා ක්‍රියාත්මක වේ
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu',
            '--disable-dev-shm-usage',
            '--window-size=1920,1080',
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
            '--autoplay-policy=no-user-gesture-required'
        ],
        defaultViewport: { width: 1920, height: 1080 }
    });

    const page = await browser.newPage();

    // Zoom Meeting URL එක සකසා ගැනීම
    let zoomUrl = process.env.ZOOM_URL;
    // 'Join from Browser' ලින්ක් එකට සෘජුවම යාම
    if (zoomUrl.includes('/j/')) {
        zoomUrl = zoomUrl.replace('/j/', '/wc/join/');
    }

    console.log("Navigating to Zoom...");
    await page.goto(zoomUrl, { waitUntil: 'networkidle2' });

    try {
        // මීටින් එකට සම්බන්ධ වීමට නම ඇතුළත් කිරීම
        await page.waitForSelector('#inputname', { timeout: 20000 });
        await page.type('#inputname', 'β Edu Live');
        
        // Join Button එක එබීම
        await page.click('.u-btn.join-btn');
        console.log("Joined Meeting Room.");

        // මීටින් එක සම්පූර්ණයෙන් ලෝඩ් වන තෙක් රැඳී සිටීම
        await page.waitForTimeout(15000);

        // 1. Watermarks සහ UI Elements මැකීම (CSS Injection)
        await page.addStyleTag({
            content: `
                .meeting-app__watermark, .recording-label, .participant-id-label, 
                .zm-audio-status-indicator, .audio-watermark { 
                    display: none !important; 
                    opacity: 0 !important;
                }
            `
        });

        // 2. Procedural Audio Generation (Copyright ගැටලු නැති කිරීමට)
        // මෙහිදී බ්‍රව්සරය තුළ ඉතා සියුම් Harmonic ශබ්දයක් නිපදවයි
        await page.evaluate(() => {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            setInterval(() => {
                const oscillator = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(220 + Math.random() * 10, audioCtx.currentTime); 
                gainNode.gain.setValueAtTime(0.005, audioCtx.currentTime); // ඉතා සියුම් ශබ්දයක්
                oscillator.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                oscillator.start();
                oscillator.stop(audioCtx.currentTime + 1);
            }, 5000);
        });

        console.log("Streaming setup complete. Watermarks hidden.");

        // දෝෂ නිරාකරණය සඳහා ස්ක්‍රීන්ෂොට් එකක් ගැනීම
        await page.screenshot({ path: 'debug.png' });

    } catch (e) {
        console.error("Automation Error: ", e);
        await page.screenshot({ path: 'error.png' });
    }
}

run();
