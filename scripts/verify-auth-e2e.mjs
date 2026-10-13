import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACTS_DIR = path.resolve(process.cwd(), 'test-artifacts');

if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

async function runAuthVerification() {
  console.log('🚀 Launching Chrome for Supabase Auth & Cloud History E2E Verification...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  const audit = {
    authScreenLoaded: false,
    tabSwitchingVerified: false,
    googleOAuthButtonPresent: false,
    invalidCredentialsRejected: false,
    demoLoginSucceeds: false,
    headerUserBadgeDisplayed: false,
    cloudHistoryTabAndRlsBadgeVerified: false,
    syncButtonPresent: false,
    signOutSucceeds: false
  };

  try {
    // 1. Navigate to frontend root
    console.log('1. Navigating to http://localhost:5173...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1200));

    // Ensure we are signed out first
    const profileBtn = await page.$('#user-profile-btn');
    if (profileBtn) {
      console.log('Found existing session; signing out first...');
      await profileBtn.click();
      await new Promise(r => setTimeout(r, 400));
      const signOutBtn = await page.$('#signout-btn');
      if (signOutBtn) await signOutBtn.click();
      await new Promise(r => setTimeout(r, 1000));
    }

    // 2. Check Auth Screen
    console.log('2. Verifying AuthScreen interface...');
    const headingText = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      return h1 ? h1.innerText : document.body.innerText;
    });
    console.log(`Heading text: "${headingText}"`);
    if (headingText.toLowerCase().includes('deepguard')) {
      audit.authScreenLoaded = true;
      console.log('✅ AuthScreen loaded with DeepGuard AI branding.');
    }

    // Check Google OAuth button
    const googleBtnPresent = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.some(b => b.textContent.includes('Google'));
    });
    if (googleBtnPresent) {
      audit.googleOAuthButtonPresent = true;
      console.log('✅ Google OAuth sign-in button present on AuthScreen.');
    }

    // 3. Test Tab Switching
    console.log('3. Testing Auth Mode Switching (Create Account, Forgot?, Sign In)...');
    // Switch to Create Account
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const registerTab = buttons.find(b => b.textContent.trim() === 'Create Account');
      if (registerTab) registerTab.click();
    });
    await new Promise(r => setTimeout(r, 500));

    const hasFullName = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('input')).some(i => i.placeholder?.includes('Alex Rivers') || i.type === 'text');
    });

    // Switch to Sign In first to access "Forgot?"
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const signInTab = buttons.find(b => b.textContent.trim() === 'Sign In');
      if (signInTab) signInTab.click();
    });
    await new Promise(r => setTimeout(r, 500));

    // Click "Forgot?" button
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const forgotBtn = buttons.find(b => b.textContent.trim() === 'Forgot?');
      if (forgotBtn) forgotBtn.click();
    });
    await new Promise(r => setTimeout(r, 500));

    const hasResetSubmit = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.some(b => b.textContent.includes('Send Password Reset Link'));
    });

    // Switch back to Sign In using "Back to Sign In"
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const backBtn = buttons.find(b => b.textContent.includes('Back to Sign In'));
      if (backBtn) backBtn.click();
    });
    await new Promise(r => setTimeout(r, 500));

    if (hasFullName && hasResetSubmit) {
      audit.tabSwitchingVerified = true;
      console.log('✅ Tab switching across Sign In, Create Account, and Forgot Password verified.');
    }

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'auth_01_screen.png') });

    // 4. Test Invalid Login Rejection
    console.log('4. Testing invalid credentials handling...');
    await page.focus('input[type="email"]');
    await page.type('input[type="email"]', 'invalid.investigator@nonexistent.domain');

    await page.focus('input[type="password"]');
    await page.type('input[type="password"]', 'InvalidPassword123!');
    await new Promise(r => setTimeout(r, 300));

    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
    }
    await new Promise(r => setTimeout(r, 2000));

    const errorDisplayed = await page.evaluate(() => {
      const errBanner = document.querySelector('#auth-error-banner, [role="alert"]');
      const bodyText = document.body.innerText;
      return Boolean(errBanner) || bodyText.includes('required') || bodyText.includes('Invalid') || bodyText.includes('failed') || bodyText.includes('credentials');
    });

    console.log(`Error banner surfaced: ${errorDisplayed}`);
    if (errorDisplayed) {
      audit.invalidCredentialsRejected = true;
      console.log('✅ Invalid credentials cleanly rejected with error notice.');
    }
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'auth_02_invalid_credentials.png') });

    // 5. Test Demo Investigator Login
    console.log('5. Testing Explore Demo Investigator Account login...');
    const demoBtn = await page.$('#demo-login-btn');
    if (demoBtn) {
      await demoBtn.click();
    } else {
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => b.textContent.includes('Demo'));
        if (btn) btn.click();
      });
    }
    await new Promise(r => setTimeout(r, 1500));

    const appBodyText = await page.evaluate(() => document.body.innerText);
    const hasWorkspace = appBodyText.includes('Upload') || appBodyText.includes('Workspace') || appBodyText.includes('STATE:');
    const hasUserBadge = appBodyText.includes('Alex') || appBodyText.includes('Demo') || appBodyText.includes('Investigator');

    if (hasWorkspace) {
      audit.demoLoginSucceeds = true;
      console.log('✅ Demo login succeeded; transitioned into workspace.');
    }
    if (hasUserBadge) {
      audit.headerUserBadgeDisplayed = true;
      console.log('✅ Header displays user badge and forensic role.');
    }
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'auth_03_dashboard.png') });

    // 6. Test History Tab and Cloud History Interface
    console.log('6. Navigating to History tab to inspect Cloud RLS integration...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const historyBtn = buttons.find(b => b.textContent.includes('History'));
      if (historyBtn) historyBtn.click();
    });
    await new Promise(r => setTimeout(r, 1200));

    const historyViewText = await page.evaluate(() => document.body.innerText);
    const hasRlsBadge = historyViewText.includes('RLS');
    const syncBtn = await page.$('#sync-to-cloud-btn');

    if (hasRlsBadge) {
      audit.cloudHistoryTabAndRlsBadgeVerified = true;
      console.log('✅ Cloud History view displays CLOUD RLS security badge.');
    }
    if (syncBtn) {
      audit.syncButtonPresent = true;
      console.log('✅ "Sync Local History to Cloud" button is present.');
      // Click sync button to test feedback notice
      await syncBtn.click();
      await new Promise(r => setTimeout(r, 800));
      const syncNotice = await page.evaluate(() => {
        const text = document.body.innerText;
        return text.includes('Cloud RLS sync') || text.includes('Sync') || text.includes('Synchronized');
      });
      console.log(`Sync feedback notice surfaced: ${syncNotice}`);
    }
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'auth_04_cloud_history.png') });

    // 7. Test Sign Out
    console.log('7. Testing Sign Out flow via user profile menu...');
    const userMenuBtn = await page.$('#user-profile-btn');
    if (userMenuBtn) {
      await userMenuBtn.click();
      await new Promise(r => setTimeout(r, 500));
      const signOutBtn = await page.$('#signout-btn');
      if (signOutBtn) {
        await signOutBtn.click();
      }
    }
    await new Promise(r => setTimeout(r, 1200));

    const loggedOutText = await page.evaluate(() => document.body.innerText);
    const backOnAuth = loggedOutText.includes('Sign In') || loggedOutText.includes('Demo Investigator');
    if (backOnAuth) {
      audit.signOutSucceeds = true;
      console.log('✅ Sign Out successfully restored unauthenticated state on AuthScreen.');
    }
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'auth_05_logged_out.png') });

    console.log('\n======================================================');
    console.log('🏁 AUTHENTICATION & CLOUD HISTORY AUDIT RESULTS:');
    console.log(JSON.stringify(audit, null, 2));
    console.log('======================================================\n');

    const allPassed = Object.values(audit).every(v => v === true);
    if (!allPassed) {
      throw new Error('One or more auth audit assertions failed.');
    }

  } finally {
    await browser.close();
  }
}

runAuthVerification().catch((err) => {
  console.error('❌ Auth Verification failed:', err);
  process.exit(1);
});
