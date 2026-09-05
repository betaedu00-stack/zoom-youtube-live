const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function run() {
    const browser = await puppeteer.launch({
        headless: false, // GitHub Actions වලදී xvfb මගින් ක්‍රියාත්මක වේ
        args: [
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
            '--allow-file-access-from-files',
            '--disable-setuid-sandbox',
            '--no-sandbox',
            '--window-size=1920,1080'
        ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Zoom මීටින් ලින්ක් එක (මෙහි ඔබේ URL එක යොදන්න හෝ Environment Variable එකක් භාවිතා කරන්න)
    const zoomUrl = process.env.ZOOM_URL; 
    
    // Zoom Web Client එකට සෘජුවම යාම (Direct Web Join Link)
    const webUrl = zoomUrl.replace('/j/', '/wc/join/');

    await page.goto(webUrl, { waitUntil: 'networkidle2' });

    try {
        // මීටින් එකට සම්බන්ධ වීමට නම ඇතුළත් කිරීම
        await page.waitForSelector('#inputname');
        await page.type('#inputname', 'β Edu Live Stream');
        await page.click('.u-btn.join-btn');

        console.log("Joining Meeting...");

        // ශ්‍රව්‍ය (Audio) සම්බන්ධ කිරීම සහ Watermarks ඉවත් කිරීම
        await page.waitForTimeout(10000); // මීටින් එක ලෝඩ් වන තෙක්

        // CSS Injection මගින් Watermarks සහ අනවශ්‍ය දේවල් සැඟවීම
        await page.addStyleTag({
            content: `
                .meeting-app__watermark, 
                .recording-label, 
                .participant-id-label { 
                    display: none !important; 
                }
            `
        });

        console.log("Watermarks hidden. Streaming started...");

    } catch (e) {
        console.error("Error during automation:", e);
    }

    // බ්‍රව්සරය වසා නොදමා පවත්වා ගැනීම
}

run();
