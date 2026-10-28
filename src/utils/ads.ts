/**
 * Ads layer (NOT yet wired to AdMob).
 *
 * Design rules baked in here so the monetisation can never fight the fun:
 *  - Rewarded ads only for things the player CHOOSES (extra hint, double coins). Never forced.
 *  - Interstitials: off by default; when enabled they only appear right after a WIN (never after a
 *    fail / while frustrated), never in the first 10 levels, and at most once per cooldown.
 *  - Child safety: if the game is published as "Designed for Families" / child-directed, AdMob must
 *    be configured with tagForChildDirectedTreatment + Families-certified ad networks only.
 *
 * Ads are unavailable until a real, policy-compliant provider is integrated. The offline build
 * must not pretend an ad was watched or grant an ad-gated reward.
 */
export const ADS_CONFIG = {
  mode: 'disabled' as 'disabled' | 'admob',
  interstitialsEnabled: false,
  interstitialMinLevel: 11,
  interstitialCooldownMs: 3 * 60 * 1000,
  interstitialEveryNLevels: 4,
};

let lastInterstitialAt = 0;

export type RewardedPlacement = 'extra_hint' | 'double_coins' | 'swap_puzzle';

export function showRewardedAd(_placement: RewardedPlacement): Promise<boolean> {
  return Promise.resolve(false);
}

export function shouldShowInterstitial(ctx: {
  levelNumber: number;
  justWon: boolean;
  lastAttempts: number;
  frustration: number;
}): boolean {
  if (!ADS_CONFIG.interstitialsEnabled) return false;
  if (!ctx.justWon) return false;
  if (ctx.levelNumber < ADS_CONFIG.interstitialMinLevel) return false;
  if (ctx.levelNumber % ADS_CONFIG.interstitialEveryNLevels !== 0) return false;
  if (ctx.lastAttempts >= 3 || ctx.frustration > 0.3) return false;
  return Date.now() - lastInterstitialAt > ADS_CONFIG.interstitialCooldownMs;
}

export function markInterstitialShown() {
  lastInterstitialAt = Date.now();
}
