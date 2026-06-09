#  APK Tracker

An automated, local-first Android application designed for power users to track, bypass, and download specific APK variants (like `arm64-v8a`) directly from APKMirror without dealing with messy search results or Cloudflare blocks.

---

##  Version 4 (Current: The UI/UX Polish Update)
**Branch:** `v4`  
Version 4 focuses on giving the app a premium, professional look by breaking free from Android's default UI constraints.

###  What's New in v4:
*   **Custom Premium Header:** Completely disabled the default React Navigation header to build a custom, edge-to-edge top bar.
*   **Two-Tone Logo Branding:** Implemented a sleek, two-tone colored logo (`APK Tracker`) centered prominently at the top of the screen.
*   **Restructured Layout:** Re-aligned the "My Watchlist" category header to the left side with refined typography to give the app a clean, modern dashboard feel.
*   **Shadows & Depth:** Added subtle elevation and bottom-border shadow rendering to separate the top header from the scrolling list.

---

##  Version 3 (The Automation Update)
**Branch:** `v3`  
Version 3 transformed the app from a manual tracker into a fully automated smart assistant.
*   **X-Ray Auto-Detect:** Scans the phone's hard drive to auto-fill current installed app versions natively.
*   **Direct Link Sniper Bot:** Bypasses search bars and uses direct URLs to auto-click the newest stable release.
*   **Web Sync Fallback:** If Android hides a system app, the bot pings the web to grab the baseline version automatically.

---

##  Version 2 (The Native Rewrite)
**Branch:** `v2`  
Transitioned the app from a web-app to a native Android app using React Native, SQLite, and a headless WebView to bypass Cloudflare.

---

##  Version 1 (The Prototype)
**Branch:** `main`  
The initial Vanilla JS + Capacitor prototype to test the core logic of scraping APKMirror.

---

##  How to run locally:
1. Clone the repository and checkout the `v4` branch.
2. Install dependencies: `npm install`
3. Start the Metro Bundler: `npm start`
4. Build and install via Android Studio.