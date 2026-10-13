import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const FIXTURES_DIR = path.resolve(process.cwd(), 'backend', 'test_media_fixtures');
const ARTIFACTS_DIR = path.resolve(process.cwd(), 'test-artifacts');

if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

async function runPhase6Verification() {
  console.log('🚀 Launching Chrome for Phase 6 Calibrated Pipeline Verification...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  const auditReport = {
    inconclusiveVerdictVerified: false,
    syntheticVerdictVerified: false,
    realVerdictVerified: false,
    videoFrameBasedNoticeVerified: false,
    audioAuthenticityCaveatVerified: false
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
        const demoBtn = buttons.find(b => b.textContent.includes('Explore Demo Investigator Account')) ||
                        buttons.find(b => b.textContent.includes('Sign In'));
        if (demoBtn) demoBtn.click();
      });
      await new Promise(r => setTimeout(r, 1200));
      console.log('✅ Logged in successfully');
    }

    // Helper: Reset to upload view
    async function resetToUpload() {
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const anotherBtn = buttons.find(b => b.textContent.includes('Analyze Another File') || b.textContent.includes('Upload'));
        if (anotherBtn) {
          anotherBtn.click();
          return;
        }
        const newScanBtn = buttons.find(b => b.textContent.includes('New Scan'));
        if (newScanBtn) newScanBtn.click();
      });
      await new Promise(r => setTimeout(r, 800));
    }

    // Helper: Upload file and click Analyze Now
    async function uploadAndAnalyze(filePath) {
      const fileInput = await page.$('input[type="file"]');
      if (!fileInput) throw new Error('File input element not found');
      await fileInput.uploadFile(filePath);
      await new Promise(r => setTimeout(r, 900));

      // Click "Analyze Now"
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const analyzeBtn = buttons.find(b => b.textContent.includes('Analyze Now'));
        if (analyzeBtn) analyzeBtn.click();
      });

      console.log(`Uploaded ${path.basename(filePath)}, waiting for analysis completion...`);
      await page.waitForFunction(
        () => {
          const text = document.body.innerText;
          return text.includes('STATE: COMPLETED') || 
                 text.includes('Analysis Summary') || 
                 text.includes('ANALYSIS LIMITED') || 
                 text.includes('UNCERTAIN') || 
                 text.includes('Likely AI-Generated') ||
                 text.includes('Likely Authentic') ||
                 text.includes('Inconclusive');
        },
        { timeout: 25000 }
      );
      await new Promise(r => setTimeout(r, 1000));
    }

    // --- TEST 1: Inconclusive Image ---
    console.log('\n--- Test 1: Inconclusive Image (inconclusive_image.png) ---');
    const inconclusiveFile = path.join(FIXTURES_DIR, 'inconclusive_image.png');
    await uploadAndAnalyze(inconclusiveFile);

    const text1 = await page.evaluate(() => document.body.innerText);
    const hasUncertainLabel = text1.toLowerCase().includes('inconclusive') || text1.toLowerCase().includes('uncertain');
    const hasMarginNotice = text1.includes('0.70') || text1.includes('0.76') || text1.toLowerCase().includes('ambiguous margin');
    console.log(`Inconclusive/Uncertain text present: ${hasUncertainLabel}`);
    console.log(`Ambiguous margin (0.70 - 0.76) notice present: ${hasMarginNotice}`);

    if (hasUncertainLabel && hasMarginNotice) {
      auditReport.inconclusiveVerdictVerified = true;
      console.log('✅ TEST 1 PASSED: Ambiguous sample correctly rendered as Inconclusive with margin disclosure.');
    }
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'phase6_01_inconclusive.png') });

    // --- TEST 2: Synthetic Deepfake Image ---
    console.log('\n--- Test 2: Synthetic Image (synthetic_image.png) ---');
    await resetToUpload();
    const syntheticFile = path.join(FIXTURES_DIR, 'synthetic_image.png');
    await uploadAndAnalyze(syntheticFile);

    const text2 = await page.evaluate(() => document.body.innerText);
    const hasSyntheticLabel = text2.toLowerCase().includes('likely ai-generated') || text2.includes('AI-Generated Synthetic Media');
    console.log(`Synthetic classification present: ${hasSyntheticLabel}`);

    if (hasSyntheticLabel) {
      auditReport.syntheticVerdictVerified = true;
      console.log('✅ TEST 2 PASSED: Synthetic deepfake correctly identified as Likely AI-Generated.');
    }
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'phase6_02_synthetic.png') });

    // --- TEST 3: Real Image ---
    console.log('\n--- Test 3: Real Image (real_image.jpg) ---');
    await resetToUpload();
    const realFile = path.join(FIXTURES_DIR, 'real_image.jpg');
    await uploadAndAnalyze(realFile);

    const text3 = await page.evaluate(() => document.body.innerText);
    const hasRealLabel = text3.toLowerCase().includes('likely authentic');
    const hasAuthenticityCaveat = text3.includes('does not guarantee') || text3.includes('Absence of synthetic') || text3.includes('photographic authenticity');
    console.log(`Authentic label present: ${hasRealLabel}`);
    console.log(`Authenticity disclaimer present: ${hasAuthenticityCaveat}`);

    if (hasRealLabel && hasAuthenticityCaveat) {
      auditReport.realVerdictVerified = true;
      console.log('✅ TEST 3 PASSED: Authentic media correctly identified with non-absolute provenance caveat.');
    }
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'phase6_03_real.png') });

    // --- TEST 4: Video Exploratory Keyframe Analysis ---
    console.log('\n--- Test 4: Video (sample_video.mp4) ---');
    await resetToUpload();
    const videoFile = path.join(FIXTURES_DIR, 'sample_video.mp4');
    await uploadAndAnalyze(videoFile);

    const text4 = await page.evaluate(() => document.body.innerText);
    const hasFrameBasedText = text4.includes('Frame-Based') || text4.includes('Keyframe Analysis');
    console.log(`Frame-based text present: ${hasFrameBasedText}`);

    if (hasFrameBasedText) {
      auditReport.videoFrameBasedNoticeVerified = true;
      console.log('✅ TEST 4 PASSED: Video analysis truthfully presents frame-based methodology.');
    }
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'phase6_04_video_exploratory.png') });

    // --- TEST 5: Audio Authenticity Caveat ---
    console.log('\n--- Test 5: Audio (sample_audio.wav) ---');
    await resetToUpload();
    const audioFile = path.join(FIXTURES_DIR, 'sample_audio.wav');
    await uploadAndAnalyze(audioFile);

    const text5 = await page.evaluate(() => document.body.innerText);
    const hasAudioCaveat = text5.includes('absence of artifacts is not proof') || text5.includes('Authenticity Caveat') || text5.includes('synthetic vocoder');
    console.log(`Audio caveat disclosure present: ${hasAudioCaveat}`);

    if (hasAudioCaveat) {
      auditReport.audioAuthenticityCaveatVerified = true;
      console.log('✅ TEST 5 PASSED: Audio classification explicitly conveys absence-of-evidence caveats.');
    }
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'phase6_05_audio_caveats.png') });

  } catch (err) {
    console.error('❌ Error during Phase 6 verification:', err);
  } finally {
    await browser.close();
  }

  console.log('\n========================================');
  console.log('📊 PHASE 6 EMPIRICAL AUDIT RESULTS:');
  console.log(JSON.stringify(auditReport, null, 2));
  console.log('========================================');

  const allPassed = Object.values(auditReport).every(v => v === true);
  if (allPassed) {
    console.log('🎉 ALL 5 CALIBRATED MODALITY BEHAVIORS CONFIRMED WITH ZERO REGRESSIONS!');
    process.exit(0);
  } else {
    console.log('⚠️ Some calibrated modality checks did not meet verification criteria.');
    process.exit(1);
  }
}

runPhase6Verification();
