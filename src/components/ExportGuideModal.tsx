import React from 'react';
import { X, Smartphone, DollarSign, CheckCircle2, ShieldAlert } from 'lucide-react';
import { sound } from '../utils/audio';

interface ExportGuideModalProps {
  onClose: () => void;
}

export const ExportGuideModal: React.FC<ExportGuideModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl p-5 text-white shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">
              Android APK & AdMob Integration Guide
            </h3>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Environment Status */}
        <div className="p-3 bg-blue-950/40 border border-blue-900/50 rounded-2xl my-3 flex items-start gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-200">
            <span className="font-bold text-white block mb-0.5">Current App Status</span>
            OOPS! is running as a high-performance HTML5 mobile web app with native touch event handlers, 720x1280 portrait viewport framing, and Matter.js physics.
          </div>
        </div>

        {/* Step-by-Step Production Guide */}
        <div className="flex flex-col gap-4 text-xs text-slate-300">
          {/* Section 1: Android Capacitor Wrapper */}
          <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700">
            <h4 className="font-bold text-white text-sm flex items-center gap-1.5 mb-1.5">
              <span>1. Android APK / AAB Packaging</span>
            </h4>
            <p className="mb-2 text-slate-400">
              Wrap the compiled Vite build using standard Capacitor tooling:
            </p>
            <div className="bg-slate-950 p-2.5 rounded-xl font-mono text-[11px] text-emerald-400 overflow-x-auto leading-relaxed border border-slate-800">
              npm run build<br />
              npm i @capacitor/core @capacitor/cli @capacitor/android<br />
              npx cap init "OOPS!" "com.oops.game"<br />
              npx cap add android<br />
              npx cap copy<br />
              npx cap open android
            </div>
            <div className="mt-2 text-[11px] text-slate-400">
              In <code className="text-amber-300">android/app/src/main/AndroidManifest.xml</code>, ensure:
              <br />
              <code className="text-amber-300">android:screenOrientation="portrait"</code>
            </div>
          </div>

          {/* Section 2: Real Google AdMob Setup */}
          <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700">
            <h4 className="font-bold text-white text-sm flex items-center gap-1.5 mb-1.5">
              <DollarSign className="w-4 h-4 text-amber-400" />
              <span>2. Real Google AdMob Setup</span>
            </h4>
            <p className="mb-2 text-slate-400">
              Monetization is intentionally dormant in the web preview to avoid fake ads. For production Android release:
            </p>
            <ol className="list-decimal pl-4 space-y-1.5 text-slate-300">
              <li>Create an AdMob account at <strong className="text-white">admob.google.com</strong>.</li>
              <li>Register an Android app and obtain your App ID (<code className="text-amber-300">ca-app-pub-XXXX~YYYY</code>).</li>
              <li>Create a <strong>Rewarded Video Ad Unit</strong> (for free hints).</li>
              <li>Install <code className="text-emerald-400">@capacitor-community/admob</code>:</li>
            </ol>
            <div className="bg-slate-950 p-2.5 rounded-xl font-mono text-[11px] text-emerald-400 mt-2 overflow-x-auto border border-slate-800">
              npm i @capacitor-community/admob<br />
              npx cap sync
            </div>
          </div>

          {/* Section 3: Google Play Store Release Checklist */}
          <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700">
            <h4 className="font-bold text-white text-sm mb-1.5">
              3. Google Play Store Submission
            </h4>
            <ul className="list-disc pl-4 space-y-1 text-slate-300">
              <li>Generate upload keystore in Android Studio.</li>
              <li>Build signed Android App Bundle (AAB): <code className="text-amber-300">Build &gt; Generate Signed Bundle</code>.</li>
              <li>Upload 720x1280 portrait screenshots and 512x512 app icon.</li>
              <li>Complete Privacy Policy URL and Content Rating questionnaire.</li>
            </ul>
          </div>
        </div>

        <button
          onClick={() => {
            sound.playClick();
            onClose();
          }}
          className="w-full mt-4 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl text-xs transition-colors"
        >
          Close Guide
        </button>
      </div>
    </div>
  );
};
