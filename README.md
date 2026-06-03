# APK Tracker (v1 - Capacitor Prototype)

This is the v1 prototype of APK Tracker, built using Vanilla JavaScript, Vite, and Capacitor. It is designed to be a lightweight tool for Android power users to track app updates from APKMirror, specifically targeting `arm64-v8a` variants.

## Features (v1)
*   **Sleek Dark Mode UI:** Native-looking mobile interface using CSS.
*   **Watchlist Management:** Add apps via their APKMirror link.
*   **Release Tracking:** Filter between Stable and Beta/Alpha releases.
*   **Local Storage:** App saves your watchlist permanently to your phone's storage.
*   **Capacitor Integration:** Ready to be compiled into a native Android `.apk`.

## Tech Stack
*   **Frontend:** Vanilla JavaScript, HTML5, CSS3
*   **Bundler:** Vite
*   **Android Bridge:** Capacitor by Ionic

## How to Build and Run
To run this project on an Android device via USB:

1. Install dependencies:
   ```bash
   npm install

2.  Build the web assets:
    npm run build
3.  Sync the assets to the Android folder:
    npx cap sync
4.  Open in Android Studio to install on your device:
    npx cap open android

(Note: This v1 branch serves as the visual and structural prototype. Active
development of the backend scraping logic has been moved to the v2 React Native
architecture).
