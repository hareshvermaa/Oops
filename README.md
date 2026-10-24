# OOPS! — 2D Physics Chain-Reaction Puzzle Game

An exceptionally cute, charming, funny, and satisfying 2D physics puzzle game for mobile and web. Players freely place and rotate whimsical gadgets to craft chain reactions that guide lovable cartoon characters into their target goals.

---

## 🌟 Game Highlights

- **200 Progressive Campaign Levels**: Handcrafted across 10 distinct themed worlds.
- **10 Themed Toybox Worlds**:
  1. *Kitchen Catastrophe*: Morning sunlight, checkered counter tiles, frying pans, and butter pats.
  2. *Messy Bedroom*: Lavender dusk, starry wallpaper, crescent moon, and fluffy snooze pillows.
  3. *Toy Workshop*: Mint blueprint drafting grid, wooden toy blocks, and workbench gears.
  4. *Office Chaos*: Bulletin corkboard, pastel sticky notes, paperclips, and ruler markings.
  5. *Supermarket Sweep*: Pastel pink candy aisles, grocery shelves, and wire carts.
  6. *Lush Garden*: Meadow sky, green rolling hills, floating dandelion motes, and lawn grass.
  7. *Construction Zone*: Architectural grid, crane trusses, and bold hazard stripes.
  8. *Candy Factory*: Confectionery swirl, peppermint pinwheels, and frosting drips.
  9. *Science Lab*: Isometric cyan graph paper, glowing bubbling flasks, and cleanroom plating.
  10. *Grand Finale*: Royal arcade purple starfield, golden stage drapes, and victory pedestal.
- **Expressive Character System**: Dynamic squash-and-stretch on collision impacts, idle breathing wobble, natural blinking, eye tracking, comic impact reactions, and celebration animations.
- **Real Physical Gadgets**:
  - *Wood Ramps*: Smooth rolling slopes with continuous 0–359° rotation.
  - *Bouncy Pads*: Responsive spring trampolines with directional rebound impulses.
  - *Wind Fans*: Directional aerodynamic airflow fields with animated streamlines.
  - *Domino Blocks*: Momentum-transferring toppling blocks.
  - *Seesaws*: Playground teeter-totter levers with realistic fulcrum constraints.
  - *Spring Launchers*: Mechanical jack-in-the-box launchers with explosive launch impulses.
- **Pure Procedural Audio**: Low-latency Web Audio sound engine synthesizing clicks, spring boings, wooden taps, breezy whooshes, crystal dings, star pops, and cheerful pentatonic melodies without external audio assets.
- **Zero-Pill Mobile UI**: Built with strict typographic hierarchy, responsive layout, large touch targets, fine-stepper angle adjustments, and safe local persistence.

---

## 🚀 Quick Start & Development

### 1. Prerequisites
- Node.js 18+ or 20+
- npm 9+

### 2. Installation
```bash
npm install
```

### 3. Local Development
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

### 4. Running the Automated Test Suite
```bash
npm test
```
Executes headless Matter.js physics validation across all 200 campaign levels, state transition verifications (SETUP -> RUNNING -> RESET), and save progression logic.

### 5. Type Checking & Production Build
```bash
npm run lint    # Type-check via tsc --noEmit
npm run build   # Production Vite bundle into /dist
```

---

## 📁 Project Architecture

```
├── .aistudio/             # AI Studio workspace configuration
├── scripts/
│   └── validate-game.ts   # Headless 200-level physics test runner & state auditor
├── src/
│   ├── components/
│   │   ├── ExportGuideModal.tsx    # In-game Android & AdMob packaging guide
│   │   ├── GadgetTray.tsx          # Inventory tray, continuous slider & steppers
│   │   ├── GameCanvas.tsx          # Matter.js canvas viewport & touch gesture handler
│   │   ├── HintModal.tsx           # Ghost hints and auto-placer
│   │   ├── HowToPlayModal.tsx      # Visual tutorial modal
│   │   ├── HUD.tsx                 # Top status header, star meter, audio toggles
│   │   ├── LevelCompleteModal.tsx  # Celebratory star popping modal & next-level CTA
│   │   ├── LevelSelectScreen.tsx   # Level grid with star ratings & lock status
│   │   ├── SettingsModal.tsx       # Audio toggles, progress reset, dev unlock
│   │   ├── TitleScreen.tsx         # Animated 3D cartoon logo & interactive mascot
│   │   ├── ValidatorScreen.tsx     # Player-facing QA validator screen
│   │   └── WorldSelectScreen.tsx   # World map with progress & star badges
│   ├── game/
│   │   ├── levels.ts               # Complete 200-level definitions & metadata
│   │   └── PhysicsEngine.ts        # Custom Matter.js engine & cartoon vector renderer
│   ├── types/
│   │   └── game.ts                 # TypeScript interfaces, enums, level schemas
│   ├── utils/
│   │   ├── audio.ts                # Web Audio synthesizer & cartoon soundscape
│   │   └── storage.ts              # Resilient localStorage save/load store
│   ├── App.tsx                     # Main application controller & state machine
│   ├── index.css                   # Global styles & Tailwind imports
│   └── main.tsx                    # React DOM entry point
├── ANDROID_BUILD_GUIDE.md # Exhaustive Capacitor Android build & Play Store manual
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript compiler configuration
└── vite.config.ts         # Vite build configuration
```

---

## 📱 Android Packaging & Capacitor Guide

Refer to `ANDROID_BUILD_GUIDE.md` for exact step-by-step instructions:
1. `npm run build`
2. `npm install @capacitor/core @capacitor/cli @capacitor/android`
3. `npx cap init "OOPS!" "com.oops.game" --web-dir "dist"`
4. `npx cap add android`
5. Configure portrait orientation in `AndroidManifest.xml` (`android:screenOrientation="portrait"`).
6. Build signed Android App Bundle (AAB) in Android Studio and upload to Google Play Console.

---

## 🔒 Security & Privacy

- No third-party tracking scripts, telemetry, or analytics.
- No external CDN network calls during gameplay.
- No hardcoded secrets, API keys, or fake publisher IDs.
- Child-friendly design with transparent, non-deceptive rewards and zero dark patterns.
