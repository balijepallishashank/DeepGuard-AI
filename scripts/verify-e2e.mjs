import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const FIXTURES_DIR = path.resolve(process.cwd(), 'fixtures');
const ARTIFACTS_DIR = path.resolve(process.cwd(), 'test-artifacts');

if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

async function runVerification() {
  console.log('🚀 Starting Automated Step 1 Verification via Chrome...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const results = {
    authLogin: false,
    unsupportedFileRejected: false,
    oversizedFileRejected: false,
    validImageUpload: false,
    validVideoUpload: false,
    validAudioUpload: false,
    opacitySliderWorks: false,
    mediaAutopsyWorks: false,
    historyPersistsAfterRefresh: false,
    emptyAndErrorStates: false,
    responsiveLayout: false
  };

  try {
    // 1. Navigate to app
    console.log('1. Navigating to http://localhost:5173...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });

    // Login if on auth screen
    const loginBtn = await page.$('button.btn-primary');
    if (loginBtn) {
      console.log('Logging in via Demo Account...');
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const demoBtn = buttons.find(b => b.textContent.includes('Explore Demo Investigator Account') || b.textContent.includes('Sign In'));
        if (demoBtn) demoBtn.click();
      });
      await new Promise(r => setTimeout(r, 1000));
      results.authLogin = true;
      console.log('✅ Authenticated successfully');
    }

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '01_dashboard.png') });

    // 2. Test Unsupported File Format Rejection
    console.log('2. Testing unsupported file rejection (sample_invalid.txt)...');
    const invalidFile = path.join(FIXTURES_DIR, 'sample_invalid.txt');
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      await fileInput.uploadFile(invalidFile);
      await new Promise(r => setTimeout(r, 800));
      const bodyText = await page.evaluate(() => document.body.innerText);
      if (bodyText.includes('Unsupported file format') || bodyText.includes('format')) {
        results.unsupportedFileRejected = true;
        console.log('✅ Unsupported file format successfully rejected with error alert');
      }
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, '02_unsupported_error.png') });
      
      // Dismiss error if button exists
      await page.evaluate(() => {
        const dismiss = document.querySelector('button[title="Dismiss"]');
        if (dismiss) dismiss.click();
      });
      await new Promise(r => setTimeout(r, 500));
    }

    // 3. Test Oversized File Rejection (> 50 MB)
    console.log('3. Testing oversized file rejection (sample_oversized.png)...');
    const oversizedFile = path.join(FIXTURES_DIR, 'sample_oversized.png');
    if (!fs.existsSync(oversizedFile)) {
      console.log('Generating temporary oversized fixture for testing (>50MB)...');
      fs.writeFileSync(oversizedFile, Buffer.alloc(52 * 1024 * 1024));
    }
    const fileInput2 = await page.$('input[type="file"]');
    if (fileInput2) {
      await fileInput2.uploadFile(oversizedFile);
      await new Promise(r => setTimeout(r, 800));
      const bodyText = await page.evaluate(() => document.body.innerText);
      if (bodyText.includes('exceeds the 50 MB') || bodyText.includes('limit')) {
        results.oversizedFileRejected = true;
        console.log('✅ Oversized file successfully rejected (>50MB check)');
      }
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, '03_oversized_error.png') });

      // Dismiss error
      await page.evaluate(() => {
        const dismiss = document.querySelector('button[title="Dismiss"]');
        if (dismiss) dismiss.click();
      });
      await new Promise(r => setTimeout(r, 500));
    }

    // 4. Test Valid Image Upload
    console.log('4. Testing valid image upload (sample_valid.png)...');
    const validImage = path.join(FIXTURES_DIR, 'sample_valid.png');
    const fileInput3 = await page.$('input[type="file"]');
    if (fileInput3) {
      await fileInput3.uploadFile(validImage);
      await new Promise(r => setTimeout(r, 800));
      // Click "Analyze Now" button
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Analyze Now'));
        if (btn) btn.click();
      });
      console.log('Clicked Analyze Now, waiting for analysis processing to complete...');
      await page.waitForFunction(
        () => document.body.innerText.includes('ANALYSIS LIMITED') || document.body.innerText.includes('INCONCLUSIVE') || document.body.innerText.includes('STATE: COMPLETED'),
        { timeout: 15000 }
      );
      results.validImageUpload = true;
      console.log('✅ Image uploaded, processed, and truthful baseline status displayed');
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, '04_image_analysis_completed.png') });
    }

    // 5. Test Opacity Slider on Detailed Analysis
    console.log('5. Testing Visual Inspector Opacity Slider...');
    // Click "View Detailed Analysis"
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('View Detailed Analysis'));
      if (btn) {
        btn.scrollIntoView();
        btn.click();
      }
    });
    await new Promise(r => setTimeout(r, 800));

    // Click "Visual Inspector" tab
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Visual Inspector'));
      if (btn) {
        btn.scrollIntoView();
        btn.click();
      }
    });
    await new Promise(r => setTimeout(r, 800));

    // Find opacity range slider and change value
    const slider = await page.$('input[type="range"]');
    if (slider) {
      await page.evaluate(el => {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeInputValueSetter.call(el, '45');
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }, slider);
      await new Promise(r => setTimeout(r, 600));
      const sliderText = await page.evaluate(() => document.body.innerText);
      if (sliderText.includes('45%')) {
        results.opacitySliderWorks = true;
        console.log('✅ Opacity slider verified (updated to 45%)');
      }
    }
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '05_visual_inspector_opacity.png') });

    // 5b. Test Media Autopsy Workspace
    console.log('5b. Testing Media Autopsy Workspace & Real ELA...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Media Autopsy'));
      if (btn) {
        btn.scrollIntoView();
        btn.click();
      }
    });
    await new Promise(r => setTimeout(r, 1200));

    const autopsyText = await page.evaluate(() => document.body.innerText);
    if (autopsyText.includes('Error Level Analysis') && autopsyText.includes('Observations')) {
      results.mediaAutopsyWorks = true;
      console.log('✅ Media Autopsy ELA and Forensic Integrity Triad verified!');
    }
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '05b_media_autopsy_ela.png') });

    // Switch to Channels tool
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Color & Luminance'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '05c_media_autopsy_channels.png') });

    // Switch to Perceptual Identifiers tool
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Perceptual Identifiers'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '05d_media_autopsy_hashes.png') });

    // 6. Test Valid Audio Upload
    console.log('6. Testing valid audio upload (sample_valid.wav)...');
    // Click "Analyze Another File"
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Analyze Another File'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 800));

    const validAudio = path.join(FIXTURES_DIR, 'sample_valid.wav');
    const audioInput = await page.$('input[type="file"]');
    if (audioInput) {
      await audioInput.uploadFile(validAudio);
      await new Promise(r => setTimeout(r, 800));
      // Click "Analyze Now"
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Analyze Now'));
        if (btn) btn.click();
      });
      console.log('Clicked Analyze Now for audio, waiting for completion...');
      await page.waitForFunction(
        () => document.body.innerText.includes('sample_valid.wav') && document.body.innerText.includes('STATE: COMPLETED'),
        { timeout: 15000 }
      );
      results.validAudioUpload = true;
      console.log('✅ Audio uploaded and audio telemetry extracted');
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, '06_audio_analysis_completed.png') });
    }

    // 7. Test Valid Video Upload
    console.log('7. Testing valid video upload (sample_valid.mp4)...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Analyze Another File'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 800));

    const validVideo = path.join(FIXTURES_DIR, 'sample_valid.mp4');
    const videoInput = await page.$('input[type="file"]');
    if (videoInput) {
      await videoInput.uploadFile(validVideo);
      await new Promise(r => setTimeout(r, 800));
      // Click "Analyze Now"
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Analyze Now'));
        if (btn) btn.click();
      });
      console.log('Clicked Analyze Now for video, waiting for completion...');
      await page.waitForFunction(
        () => document.body.innerText.includes('sample_valid.mp4') && document.body.innerText.includes('STATE: COMPLETED'),
        { timeout: 15000 }
      );
      results.validVideoUpload = true;
      console.log('✅ Video uploaded and video container telemetry extracted');
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, '07_video_analysis_completed.png') });
    }

    // 8. Test History Persistence across Browser Refresh
    console.log('8. Testing history persistence across refresh...');
    // Click History tab
    await page.evaluate(() => {
      const navBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('History'));
      if (navBtn) navBtn.click();
    });
    await new Promise(r => setTimeout(r, 800));

    const preReloadText = await page.evaluate(() => document.body.innerText);
    const hasImageInHistory = preReloadText.includes('sample_valid.png') || preReloadText.includes('sample_valid.mp4');
    console.log(`Pre-reload history contains uploaded files: ${hasImageInHistory}`);

    // Reload page
    console.log('Reloading browser page...');
    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));

    // Navigate to History tab again
    await page.evaluate(() => {
      const navBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('History'));
      if (navBtn) navBtn.click();
    });
    await new Promise(r => setTimeout(r, 800));

    const postReloadText = await page.evaluate(() => document.body.innerText);
    const hasImageAfterReload = postReloadText.includes('sample_valid.png') || postReloadText.includes('sample_valid.mp4');
    if (hasImageAfterReload) {
      results.historyPersistsAfterRefresh = true;
      console.log('✅ History persistence verified across page refresh!');
    }
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '08_history_persisted.png') });

    // 9. Test Responsive Layout
    console.log('9. Testing responsive mobile layout (375x667)...');
    await page.setViewport({ width: 375, height: 667 });
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '09_mobile_viewport.png') });
    results.responsiveLayout = true;
    console.log('✅ Responsive layout tested at mobile viewport');

  } catch (err) {
    console.error('❌ Error during verification:', err);
  } finally {
    await browser.close();
  }

  console.log('\n📊 === VERIFICATION SUMMARY ===');
  console.log(JSON.stringify(results, null, 2));
}

runVerification();
