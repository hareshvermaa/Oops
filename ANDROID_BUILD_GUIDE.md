# OOPS! - Android Release & Packaging Guide (Capacitor)

This guide documents the exact, factual steps to package the OOPS! 2D physics chain-reaction puzzle game into a production-ready Android App Bundle (`.aab`) or APK using Capacitor.

---

## 1. Prerequisites

- **Node.js**: v18+ or v20+
- **Android Studio**: Ladybug / Hedgehog (2024+)
- **Android SDK**: API 34+ (Android 14) or API 35 (Android 15) with Android Build Tools
- **Java JDK**: OpenJDK 17 or 21

---

## 2. Capacitor Installation & Initialization

From the project root directory:

```bash
# 1. Build optimized production web assets
npm run build

# 2. Install Capacitor CLI, Core, and Android native platform
npm install @capacitor/core @capacitor/cli @capacitor/android

# 3. Initialize Capacitor configuration
npx cap init "OOPS!" "com.oops.game" --web-dir "dist"

# 4. Add the native Android platform project
npx cap add android
```

---

## 3. Portrait Orientation Lock & Fullscreen Configuration

In `android/app/src/main/AndroidManifest.xml`:

1. Under `<activity android:name=".MainActivity" ...>`:
   ```xml
   android:screenOrientation="portrait"
   android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
   ```

2. Status bar and navigation bar styling in `capacitor.config.json` (or `capacitor.config.ts`):
   ```json
   {
     "appId": "com.oops.game",
     "appName": "OOPS!",
     "webDir": "dist",
     "plugins": {
       "StatusBar": {
         "style": "DARK",
         "backgroundColor": "#020617"
       }
     }
   }
   ```

---

## 4. App Icons and Splash Screen Assets

Generate adaptive Android icons and splash assets:
- `res/mipmap-mdpi/ic_launcher.png` (48x48)
- `res/mipmap-hdpi/ic_launcher.png` (72x72)
- `res/mipmap-xhdpi/ic_launcher.png` (96x96)
- `res/mipmap-xxhdpi/ic_launcher.png` (144x144)
- `res/mipmap-xxxhdpi/ic_launcher.png` (192x192)
- High-res Play Store icon (512x512 32-bit PNG)

You can automatically generate all mipmap density assets using `@capacitor/assets`:
```bash
npm install -D @capacitor/assets
npx capacitor-assets generate --android
```

---

## 5. Google AdMob Rewarded Video Integration (Production)

Monetization is intentionally dormant in the web preview to avoid fake ads and invalid traffic. For native Android production:

```bash
npm install @capacitor-community/admob
npx cap sync android
```

In `android/app/src/main/AndroidManifest.xml`, insert your real AdMob Application ID:
```xml
<meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY"/>
```

In TypeScript/Capacitor runtime:
```ts
import { AdMob, RewardAdOptions, AdLoadInfo } from '@capacitor-community/admob';

// Initialize AdMob SDK
await AdMob.initialize({
  requestTrackingAuthorization: true,
  testingDevices: ['YOUR_TEST_DEVICE_ID'],
  initializeForTesting: false,
});

// Load Rewarded Ad
const options: RewardAdOptions = {
  adId: 'ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ', // Your real Rewarded Ad Unit ID
};
await AdMob.prepareRewardVideoAd(options);

// Show Rewarded Ad and credit hints upon valid completion
await AdMob.showRewardVideoAd();
AdMob.addListener('onRewardedVideoCompleted', (reward) => {
  // Grant +1 hint to the player safely
});
```

---

## 6. Google Play Store Submission & Families Policy Compliance

Because OOPS! is a cartoon toybox physics game appealing to both children and adults:
1. **Target Age Group**: In Play Console > Policy > Target Audience and Content, select your target age (e.g., 9–12 and 13+ or All Ages).
2. **Families Policy**:
   - Use only Families-compliant ad networks (AdMob with Families Self-Certification enabled).
   - Ensure ads displayed are rated G / PG.
3. **Data Safety & Privacy Policy**:
   - Provide a valid, publicly hosted Privacy Policy URL.
   - Declare that no sensitive personal data (location, contacts, camera) is collected.

---

## 7. Building Signed Android App Bundle (AAB) for Google Play

1. Open the Android project in Android Studio:
   ```bash
   npx cap open android
   ```
2. In Android Studio:
   - Select **Build** > **Generate Signed Bundle / APK...**
   - Choose **Android App Bundle (.aab)**.
   - Create or select your production release keystore (`.jks`).
   - Select **release** variant and V2 (Full APK Signature).
3. Generated bundle location:
   `android/app/release/app-release.aab`
4. Upload `app-release.aab` to Google Play Console under Internal Testing / Closed Testing track.

---

## 8. Exporting Source Code from Google AI Studio

To download or export the entire project:
1. **Direct Download**: Use the AI Studio top toolbar **Export** or **Download Project as ZIP** button.
2. **GitHub Push**: Use the AI Studio GitHub integration to push the repository directly to your GitHub account.
3. **Manual Backup**: The project is completely self-contained in the workspace directory with all configuration files, TypeScript source, 200 level definitions, and tests ready for local `npm install && npm run build`.
