# 📱 APK Tracker

An automated, local-first Android application designed for power users to track, bypass, and download specific APK variants (like `arm64-v8a`) directly from APKMirror without dealing with messy search results or Cloudflare blocks.

---

## ⚡ Version 6 (Current: The Lightning Engine Update)
**Branch:** `v6`  
Version 6 completely removes the heavy, hidden `WebView` browser and replaces it with a blazing-fast native `fetch()` engine, speeding up the app by 10x while saving massive amounts of battery and RAM.

### ✨ What's New in v6:
*   **The Secret Backdoor:** Uses a specialized, whitelisted User-Agent (`APKUpdater-v3.0.3`) to completely bypass Cloudflare's math puzzles natively without loading HTML, CSS, or Ads.
*   **Lightning Scraper:** Scrapes variants and math-checks versions in under 2 seconds per app.
*   **Cloudflare Breath-Timer:** Intelligently pauses for 1.5 seconds between page navigations to prevent temporary IP bans while batch scanning.
*   **Crash-Free Dev Mode:** Suppressed React Native's aggressive grey `console.error` boxes to allow silent, graceful failures in the background if a network request drops.

---

## 🔄 Version 5 (The Batch Processing Update)
**Branch:** `v5`  
*   **Batch Import Mode:** Paste multiple APKMirror links at once to auto-scan and mass-import.
*   **"Check All" Queue Engine:** Automatically cycles through your entire watchlist.
*   **Zero-Typing Web Fallback:** Secretly pings APKMirror to grab baseline versions if Android hides system apps locally.
*   **Persistent Memory:** Uses `AsyncStorage` to permanently save newly found updates so "Download" buttons survive app restarts.

---

## 🎨 Version 4 (The UI/UX Polish Update)
**Branch:** `v4`  
*   **Custom Premium Header:** Completely bypassed the default Android navigation to build a custom, edge-to-edge top header with Two-Tone Logo Branding.

---

## 🏆 Version 3 (The Automation Update)
**Branch:** `v3`  
*   **X-Ray Auto-Detect:** Scans the phone's hard drive to auto-fill current installed app versions.
*   **Table-Locked Date Extraction:** Safely extracts the exact upload date while ignoring sidebar traps.

---

## 🚀 Version 2 & 1 (The Native Rewrite & Prototype)
**Branches:** `v2` and `main`  
Transitioned from a Vanilla JS web-app to a native Android app using React Native and SQLite.

---

## 🛠️ How to run locally:
1. Clone the repository and checkout the `v6` branch.
2. Install dependencies: `npm install`
3. Start the Metro Bundler: `npm start`
4. Build and install via Android Studio.