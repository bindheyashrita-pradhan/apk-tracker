# 📱 APK Tracker

An automated, local-first Android application designed for power users to track, bypass, and download specific APK variants (like `arm64-v8a`) directly from APKMirror without dealing with messy search results or Cloudflare blocks.

---

## 🔄 Version 5 (Current: The Batch Processing & Memory Update)
**Branch:** `v5`  
Version 5 transforms the app into a true power-user tool by introducing mass-import capabilities, queue systems, and persistent memory to handle multiple apps automatically without losing data.

### ✨ What's New in v5:
*   **Batch Import Mode:** Added a toggle to paste a list of multiple APKMirror links at once. The app automatically loops through them, extracts the data, and saves them all in one click.
*   **"Check All" Queue Engine:** Added a master button that automatically cycles through your entire watchlist. It uses a smart queue system with a 2.5-second cooldown between checks to prevent Cloudflare IP bans.
*   **Zero-Typing Web Fallback:** If Android's privacy system hides a pre-installed app (like Google Calendar) from the local scanner, the app now falls back to the web, pings the APKMirror link, and automatically extracts the baseline version so you never have to type manually.
*   **The ReVanced Dodger & Name Cleaner:** Upgraded the package scanner to strictly enforce official developer tags (e.g., `com.google`) to avoid accidentally tracking modded/ReVanced apps. It also intelligently cleans up redundant names (e.g., fixing "Google Messenger Google Inc").
*   **Persistent Update Memory:** Uses `AsyncStorage` to permanently save newly found updates. If an update is found, the app transforms the UI into a green "Download" button that survives app restarts.
*   **Anti-Freeze Failsafe:** Added a strict 20-second timeout to the invisible WebView. If an app page freezes or network drops, the failsafe forces the queue to skip the broken app and continue checking the rest.

---

## 🎨 Version 4 (The UI/UX Polish Update)
**Branch:** `v4`  
*   **Custom Premium Header:** Completely bypassed the default Android navigation to build a custom, edge-to-edge top header.
*   **Two-Tone Logo Branding:** Added a sleek, two-tone logo (`APK Tracker`) and refined the dashboard layout with shadows and borders.

---

## 🏆 Version 3 (The Automation Update)
**Branch:** `v3`  
*   **X-Ray Auto-Detect:** Scans the phone's hard drive to auto-fill current installed app versions natively.
*   **Direct Link Sniper Bot:** Bypasses search bars and uses direct URLs to auto-click the newest stable release.
*   **Table-Locked Date Extraction:** Safely extracts the exact upload date while ignoring sidebar traps.

---

## 🚀 Version 2 (The Native Rewrite)
**Branch:** `v2`  
Transitioned the app from a web-app to a native Android app using React Native, SQLite, and a headless WebView to bypass Cloudflare natively.

---

## 🛑 Version 1 (The Prototype)
**Branch:** `main`  
The initial Vanilla JS + Capacitor prototype to test the core logic of scraping APKMirror.

---

## 🛠️ How to run locally:
1. Clone the repository and checkout the `v5` branch.
2. Install dependencies: `npm install`
3. Start the Metro Bundler: `npm start`
4. Build and install via Android Studio.