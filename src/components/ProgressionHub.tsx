import React, { useEffect, useRef, useState } from 'react';
import { X, Sparkles, Coins, Gem, Timer, Trophy, Share2, LockKeyhole } from 'lucide-react';
import { EndlessState, GadgetType } from '../types/game';
import { sound } from '../utils/audio';

const CARD_TYPES: GadgetType[] = [
  'wood_ramp',
  'bouncy_pad',
  'wind_fan',
  'spring_launcher',
  'seesaw',
  'domino_block',
];
const CARD_INFO: Record<GadgetType, { label: string; icon: string }> = {
  wood_ramp: { label: 'Cloud Ramp', icon: '📐' },
  bouncy_pad: { label: 'Jelly Pad', icon: '🌸' },
  wind_fan: { label: 'Breeze Fan', icon: '💨' },
  spring_launcher: { label: 'Pop Spring', icon: '⚡' },
  seesaw: { label: 'Teeter Totter', icon: '⚖️' },
  domino_block: { label: 'Domino', icon: '🁢' },
};
const BUILDINGS = [
  ['Pip’s Cottage', '🏡'],
  ['Gadget Garage', '🛠️'],
  ['Pal Garden', '🌷'],
  ['Star Lookout', '🔭'],
] as const;
const TABS = [
  ['spin', 'Daily Spin'],
  ['mini', 'Mini-game'],
  ['village', 'Village'],
  ['collection', 'Collection'],
  ['records', 'Records'],
  ['invite', 'Invite'],
] as const;
type Tab = (typeof TABS)[number][0];

interface ProgressionHubProps {
  endless: EndlessState;
  onClose: () => void;
  onSpin: () => void;
  onUpgradeBuilding: (index: number) => boolean;
  onMiniGameReward: (score: number) => void;
  onShare: () => Promise<void>;
}

function localDay() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export const ProgressionHub: React.FC<ProgressionHubProps> = ({
  endless,
  onClose,
  onSpin,
  onUpgradeBuilding,
  onMiniGameReward,
  onShare,
}) => {
  const [tab, setTab] = useState<Tab>('spin');
  const [spinning, setSpinning] = useState(false);
  const [miniActive, setMiniActive] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(10);
  const [miniScore, setMiniScore] = useState(0);
  const miniStarted = useRef(false);
  const miniReported = useRef(false);
  const spinTimer = useRef<number | null>(null);
  const canSpin = endless.dailySpinClaimDay !== localDay();

  useEffect(() => () => {
    if (spinTimer.current !== null) window.clearTimeout(spinTimer.current);
  }, []);

  useEffect(() => {
    if (!miniActive) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((seconds) => {
        if (seconds <= 1) {
          setMiniActive(false);
          return 0;
        }
        return seconds - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [miniActive]);

  useEffect(() => {
    if (miniActive || secondsLeft !== 0 || !miniStarted.current || miniReported.current) return;
    miniReported.current = true;
    miniStarted.current = false;
    setMiniActive(false);
    onMiniGameReward(miniScore);
  }, [miniActive, miniScore, onMiniGameReward, secondsLeft]);

  const startMiniGame = () => {
    miniStarted.current = true;
    miniReported.current = false;
    setMiniScore(0);
    setSecondsLeft(10);
    setMiniActive(true);
  };

  const startSpin = () => {
    if (!canSpin || spinning) return;
    setSpinning(true);
    sound.playClick();
    spinTimer.current = window.setTimeout(() => {
      onSpin();
      setSpinning(false);
      spinTimer.current = null;
    }, 850);
  };

  const tabContent = () => {
    switch (tab) {
      case 'spin':
        return (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className={`grid h-32 w-32 place-items-center rounded-full border-8 border-white bg-gradient-to-br from-amber-300 via-pink-300 to-violet-400 text-5xl shadow-xl ${spinning ? 'animate-spin' : ''}`}>
              🎡
            </div>
            <div>
              <h4 className="text-lg font-black text-violet-800">One free spin each day</h4>
              <p className="text-xs text-slate-500">A small offline bonus—no purchase or streak required.</p>
            </div>
            <button
              onClick={startSpin}
              disabled={!canSpin || spinning}
              className="rounded-2xl border-b-4 border-amber-600 bg-amber-400 px-8 py-3 font-black text-amber-950 disabled:opacity-50"
            >
              {spinning ? 'SPINNING…' : canSpin ? 'SPIN' : 'CLAIMED TODAY'}
            </button>
          </div>
        );
      case 'mini':
        return (
          <div className="flex flex-col items-center gap-4 py-5 text-center">
            <div className="flex w-full items-center justify-between rounded-2xl bg-sky-50 px-4 py-3">
              <span className="flex items-center gap-2 font-black text-sky-700"><Timer size={18} /> {miniActive ? `${secondsLeft}s left` : '10 second round'}</span>
              <span className="font-black text-violet-700">Taps: {miniScore}</span>
            </div>
            <button
              disabled={!miniActive}
              onClick={() => {
                setMiniScore((score) => score + 1);
                sound.playClick();
              }}
              className={`grid h-36 w-36 place-items-center rounded-full border-8 border-white text-5xl shadow-xl transition-transform active:scale-90 ${miniActive ? 'bg-gradient-to-br from-pink-300 to-orange-300' : 'bg-slate-100'}`}
            >
              ✨
            </button>
            {!miniActive ? (
              <button onClick={startMiniGame} className="rounded-2xl border-b-4 border-emerald-700 bg-emerald-500 px-7 py-3 font-black text-white">
                START MINI-GAME
              </button>
            ) : (
              <p className="text-xs font-bold text-slate-500">Tap the star as many times as you can. Rewards are earned in this device’s local save.</p>
            )}
          </div>
        );
      case 'village':
        return (
          <div className="grid grid-cols-2 gap-3 py-3">
            {BUILDINGS.map(([name, icon], index) => {
              const level = endless.villageLevels[index] ?? 0;
              const cost = 120 + level * 100;
              return (
                <div key={name} className="flex flex-col items-center rounded-2xl border-2 border-white bg-gradient-to-b from-sky-100 to-emerald-100 p-3 text-center shadow">
                  <span className="text-4xl">{icon}</span>
                  <b className="mt-1 text-xs text-violet-900">{name}</b>
                  <span className="text-[10px] text-slate-600">Level {level}</span>
                  <button
                    disabled={endless.coins < cost}
                    onClick={() => onUpgradeBuilding(index)}
                    className="mt-2 rounded-xl bg-white px-2 py-1.5 text-[10px] font-black text-amber-700 shadow disabled:opacity-40"
                  >
                    Upgrade · {cost} 🪙
                  </button>
                </div>
              );
            })}
          </div>
        );
      case 'collection': {
        const complete = CARD_TYPES.every((type) => endless.gadgetCards.includes(type));
        return (
          <div className="py-3">
            <div className="mb-3 flex items-center justify-between rounded-2xl bg-amber-50 p-3">
              <div><b className="text-sm text-amber-800">Gadget Workshop</b><p className="text-[10px] text-slate-500">Collect cards from spins and mini-games.</p></div>
              <span className="font-black text-amber-700">{endless.gadgetCards.length}/{CARD_TYPES.length}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {CARD_TYPES.map((type) => {
                const owned = endless.gadgetCards.includes(type);
                return (
                  <div key={type} className={`flex aspect-square flex-col items-center justify-center rounded-2xl border-2 ${owned ? 'border-amber-200 bg-amber-50' : 'border-dashed border-slate-200 bg-slate-100'}`}>
                    <span className={`text-3xl ${owned ? '' : 'grayscale opacity-30'}`}>{owned ? CARD_INFO[type].icon : '🔒'}</span>
                    <span className="mt-1 text-center text-[9px] font-bold text-slate-600">{owned ? CARD_INFO[type].label : 'Not found'}</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 rounded-xl bg-violet-50 p-2 text-center text-[10px] font-bold text-violet-700">
              {complete ? endless.collectionRewardClaimed ? 'Set complete! Nice collecting.' : 'Set complete! Your bonus is ready.' : 'Complete the set for a one-time coin and gem bonus.'}
            </p>
          </div>
        );
      }
      case 'records':
        return (
          <div className="flex flex-col gap-3 py-4">
            <div className="flex items-center gap-3 rounded-2xl bg-amber-50 p-4"><Trophy className="text-amber-500" /><div><b className="text-sm text-slate-700">Best mini-game score</b><p className="text-xs text-slate-500">This device only · {endless.bestMiniScore} taps</p></div></div>
            <div className="flex items-center gap-3 rounded-2xl bg-orange-50 p-4"><Sparkles className="text-orange-500" /><div><b className="text-sm text-slate-700">Best puzzle streak</b><p className="text-xs text-slate-500">This device only · {endless.bestStreak} wins</p></div></div>
            <p className="text-center text-[10px] text-slate-500">Global rankings need online accounts and server-verified scores.</p>
          </div>
        );
      case 'invite':
        return (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Share2 className="h-10 w-10 text-sky-500" />
            <h4 className="font-black text-sky-800">Invite a friend</h4>
            <p className="max-w-[250px] text-xs text-slate-500">Share an invite message. Tracked invite links and referral rewards need the secure online service.</p>
            <button onClick={() => void onShare()} className="min-h-11 rounded-2xl bg-sky-500 px-6 py-3 text-xs font-black text-white">SHARE INVITE TEXT</button>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-sm">
      <section className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-[30px] border-4 border-white bg-gradient-to-b from-white to-violet-50 shadow-2xl">
        <header className="flex items-center justify-between bg-violet-700 px-4 py-3 text-white">
          <div><h3 className="font-black">OOPS! Game Hub</h3><div className="mt-1 flex gap-3 text-[10px] font-bold"><span className="flex items-center gap-1"><Coins size={12} />{endless.coins}</span><span className="flex items-center gap-1"><Gem size={12} />{endless.gems}</span></div></div>
          <button onClick={onClose} aria-label="Close game hub" className="rounded-full bg-white/15 p-3"><X size={18} /></button>
        </header>
        <nav className="flex gap-1 overflow-x-auto bg-violet-100 p-2">
          {TABS.map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} className={`min-h-11 shrink-0 rounded-xl px-3 py-2 text-[10px] font-black ${tab === id ? 'bg-white text-violet-800 shadow' : 'text-violet-500'}`}>{label}</button>
          ))}
        </nav>
        <div className="overflow-y-auto px-4 pb-4">
          {tabContent()}
          <div className="mt-2 flex items-center justify-center gap-1 rounded-xl bg-slate-100 p-2 text-center text-[9px] text-slate-500">
            <LockKeyhole size={12} /> Offline save only. Paid coin packs are unavailable until verified billing and backend are connected.
          </div>
        </div>
      </section>
    </div>
  );
};
