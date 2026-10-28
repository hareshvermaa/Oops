# OOPS! - Android Release & Packaging Guide (Capacitor)

This guide describes how to package OOPS! into an Android App Bundle (`.aab`) or APK using the Capacitor wrapper already configured in this repository.

---

## 1. Prerequisites

- **Node.js**: v18+ or v20+
- **Android Studio**: Ladybug / Hedgehog (2024+)
- **Android SDK**: API 36 with Android Build Tools (the generated wrapper targets API 36)
- **Java JDK**: OpenJDK 17 or 21

---

## 2. Syncing the Android project

From the project root directory:

```bash
# Build the web game and sync the Android wrapper
npm run android:sync

# Open the native project in Android Studio
npm run android:open
```

---

## 3. Portrait Orientation Lock & Fullscreen Configuration

In `android/app/src/main/AndroidManifest.xml`:

1. The generated manifest already locks the game to portrait. Under `<activity android:name=".MainActivity" ...>`:
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

## 5. Optional Rewarded Video Integration (Not Enabled)

Ads are disabled in the current offline build. Do not grant rewards for simulated ads. If rewarded ads are added later, integrate and test a real provider only after policy review. For native Android production:

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

## 7. Building a Signed Android App Bundle (AAB) for Google Play

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
3. **Manual Backup**: The project is self-contained in the workspace directory with configuration files, TypeScript source, level templates, and tests ready for local `npm install && npm run build`.
