/**
 * Advanced Idle Expression System - Human-like Natural Behavior
 *
 * Fitur untuk realisme maksimal:
 * 1. Micro-expressions (0.3-1.5s) - Ekspresi sangat singkat
 * 2. Variable intensity - Tidak selalu sama, ada variasi
 * 3. Emotional momentum - Cenderung stay di mood yang sama
 * 4. Asymmetric timing - Tidak predictable
 * 5. Random long pauses - Kadang neutral lama (seperti melamun)
 * 6. Intensity fluctuation - Ekspresi naik-turun sedikit
 */

import type { VRM } from '@pixiv/three-vrm';
import { getLipSyncMouthValue } from './vrm-animations';

interface ExpressionSlot {
  name: string;
  weight: number;
  minDuration: number;
  maxDuration: number;
  baseIntensity: number;
  intensityVariation: number; // ±variation
  isMicro?: boolean;
  mood?: 'positive' | 'negative' | 'neutral';
}

// ── Expression Pool ───────────────────────────────────────────────────────────
const EXPRESSIONS: ExpressionSlot[] = [
  // Regular expressions - durasi lebih panjang untuk lebih natural
  // Ganti happy dengan relaxed (senyum normal) untuk menghindari lidah melet konstan saat idle
  { name: 'relaxed',   weight: 2.0, minDuration: 4,   maxDuration: 10, baseIntensity: 0.12, intensityVariation: 0.04, mood: 'positive' },
  { name: 'surprised', weight: 0.2, minDuration: 2,   maxDuration: 4,  baseIntensity: 0.10, intensityVariation: 0.03, mood: 'neutral' },
  { name: 'sad',       weight: 0.1, minDuration: 3,   maxDuration: 6,  baseIntensity: 0.06, intensityVariation: 0.02, mood: 'negative' },
  
  // Micro-expressions - dikurangi intensity dan frekuensi (happy sebagai micro-wink singkat sangat aman & lucu!)
  { name: 'happy',     weight: 0.3, minDuration: 0.5, maxDuration: 1.2, baseIntensity: 0.05, intensityVariation: 0.02, isMicro: true, mood: 'positive' },
  { name: 'surprised', weight: 0.2, minDuration: 0.4, maxDuration: 0.8, baseIntensity: 0.05, intensityVariation: 0.02, isMicro: true, mood: 'neutral' },
  { name: 'relaxed',   weight: 0.3, minDuration: 0.6, maxDuration: 1.2, baseIntensity: 0.08, intensityVariation: 0.02, isMicro: true, mood: 'positive' },
];

// Neutral configuration - DIPERPANJANG untuk lebih natural
const NEUTRAL_WEIGHT = 30.0; // Stabilizing at 30.0 (high but not excessive)
const NEUTRAL_MIN = 12;     
const NEUTRAL_MAX = 45;     
const NEUTRAL_LONG_PAUSE_CHANCE = 0.40; 
const NEUTRAL_LONG_MIN = 45; 
const NEUTRAL_LONG_MAX = 120; 

// Emotional momentum
const MOOD_MOMENTUM_BOOST = 1.2; 

// Lerp speed range (variable per transition)
// INCREASED to avoid "slowly closing eyes" effect
const LERP_SPEED_MIN = 0.8; 
const LERP_SPEED_MAX = 1.8; 
const LERP_SPEED_RESUME = 2.0; // ~500ms fade in after TTS ends (Requirement 19.3)

// Intensity fluctuation during hold
const INTENSITY_FLUCTUATION_SPEED = 0.15; 
const INTENSITY_FLUCTUATION_AMOUNT = 0.0; // OFF - keep eyes stable

// ── State ─────────────────────────────────────────────────────────────────────
let _enabled = true;
let _paused = false;
let _currentWeights: Record<string, number> = {};
let _targetWeights: Record<string, number> = {};
let _baseTargetIntensity = 0; // Base intensity untuk fluctuation
let _transitioning = false;
let _holdTimer = 0;
let _holdTarget = 5;
let _activeName = 'neutral';
let _lastIndex = -1;
let _currentMood: 'positive' | 'negative' | 'neutral' = 'neutral';
let _lerpSpeed = 2.0;
let _fluctuationPhase = 0; // Untuk intensity fluctuation
let _resumeTransitionCount = 0; // Counter untuk transisi setelah resume - gradually speed up

// Mood override
let _moodOverrideTimer = 0;
let _moodOverrideDuration = 0;
let _inMoodOverride = false;
let _overrideMoodName = '';

// Easing type chosen once per transition start (not per frame/key)
let _useEaseOut = true;

let manualMode = false;

// ── Helpers ───────────────────────────────────────────────────────────────────

function _pickNext(): { 
  weights: Record<string, number>; 
  name: string; 
  duration: number; 
  intensity: number;
  mood: 'positive' | 'negative' | 'neutral';
} {
  // Build pool with neutral
  const pool: Array<{
    name: string;
    weight: number;
    minDuration: number;
    maxDuration: number;
    intensity: number;
    mood: 'positive' | 'negative' | 'neutral';
    isMicro: boolean;
  }> = [];
  
  // Neutral dengan chance untuk long pause
  const isLongPause = Math.random() < NEUTRAL_LONG_PAUSE_CHANCE;
  pool.push({
    name: 'neutral',
    weight: NEUTRAL_WEIGHT,
    minDuration: isLongPause ? NEUTRAL_LONG_MIN : NEUTRAL_MIN,
    maxDuration: isLongPause ? NEUTRAL_LONG_MAX : NEUTRAL_MAX,
    intensity: 0,
    mood: 'neutral',
    isMicro: false,
  });
  
  // Add expressions dengan mood momentum
  for (const expr of EXPRESSIONS) {
    let weight = expr.weight;
    
    // Boost weight jika mood sama dengan current mood
    if (expr.mood === _currentMood && _currentMood !== 'neutral') {
      weight *= MOOD_MOMENTUM_BOOST;
    }
    
    // Randomize intensity dalam range
    const intensityVariation = (Math.random() - 0.5) * 2 * expr.intensityVariation;
    const intensity = Math.max(0.1, Math.min(1, expr.baseIntensity + intensityVariation));
    
    pool.push({
      name: expr.name,
      weight,
      minDuration: expr.minDuration,
      maxDuration: expr.maxDuration,
      intensity,
      mood: expr.mood || 'neutral',
      isMicro: expr.isMicro || false,
    });
  }
  
  // Reduce weight untuk ekspresi terakhir (anti-repeat)
  const adjusted = pool.map((p, i) => ({
    ...p,
    weight: i === _lastIndex ? p.weight * 0.15 : p.weight,
  }));
  
  // Weighted random selection
  const total = adjusted.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * total;
  let chosen = adjusted[0];
  let chosenIdx = 0;
  
  for (let i = 0; i < adjusted.length; i++) {
    r -= adjusted[i].weight;
    if (r <= 0) {
      chosen = adjusted[i];
      chosenIdx = i;
      break;
    }
  }
  
  _lastIndex = chosenIdx;
  _currentMood = chosen.mood;
  
  // Randomize duration dengan slight bias ke tengah (lebih natural)
  const durationRange = chosen.maxDuration - chosen.minDuration;
  const bias = (Math.random() + Math.random()) / 2; // Triangular distribution
  const duration = chosen.minDuration + bias * durationRange;
  
  // Randomize lerp speed - use resume speed for first few transitions after TTS ends
  if (_resumeTransitionCount < 5) {
    // Gradually increase speed from LERP_SPEED_RESUME toward normal range
    _lerpSpeed = LERP_SPEED_RESUME + (_resumeTransitionCount * 0.1);
    _resumeTransitionCount++;
  } else {
    // Normal random lerp speed
    _lerpSpeed = LERP_SPEED_MIN + Math.random() * (LERP_SPEED_MAX - LERP_SPEED_MIN);
  }
  
  // Build weights
  const weights: Record<string, number> = {};
  if (chosen.name !== 'neutral') {
    weights[chosen.name] = chosen.intensity;
  }
  
  // Log dengan info tambahan
  const microLabel = chosen.isMicro ? ' [micro]' : '';
  const longLabel = isLongPause && chosen.name === 'neutral' ? ' [long pause]' : '';
  const speedLabel = _resumeTransitionCount > 0 && _resumeTransitionCount <= 3 ? ` [slow transition ${_resumeTransitionCount}/3]` : '';
  if (import.meta.env.DEV) console.log(`[Idle Expression] → ${chosen.name}${microLabel}${longLabel}${speedLabel} (${duration.toFixed(1)}s, intensity: ${chosen.intensity.toFixed(2)}, lerp: ${_lerpSpeed.toFixed(1)})`);
  
  return {
    weights,
    name: chosen.name,
    duration,
    intensity: chosen.intensity,
    mood: chosen.mood,
  };
}

/**
 * Pure linear interpolation function.
 * Exported for testability and reuse.
 * 
 * @param start - Start value
 * @param end - End value
 * @param t - Interpolation factor in [0, 1]
 * @returns Interpolated value in [min(start, end), max(start, end)]
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

/** @internal Alias for backward compatibility within this module */
function _lerp(a: number, b: number, t: number): number {
  return lerp(a, b, t);
}

// ── Public API ────────────────────────────────────────────────────────────────

export function initIdleExpression(): void {
  _enabled = true;
  _paused = false;
  _currentWeights = {};
  _targetWeights = {};
  _transitioning = false;
  _holdTimer = 0;
  _holdTarget = 8 + Math.random() * 7; // Increased: 8-15 detik untuk expression pertama
  _activeName = 'neutral';
  _lastIndex = -1;
  _currentMood = 'neutral';
  _lerpSpeed = 2.0;
  _fluctuationPhase = 0;
  _inMoodOverride = false;
  _moodOverrideTimer = 0;
  _moodOverrideDuration = 0;
  
  if (import.meta.env.DEV) console.log('[Idle Expression] Advanced system initialized! First expression in', _holdTarget.toFixed(1), 'seconds');
}

export function debugExpressionKeys(vrm: VRM): void {
  if (!vrm.expressionManager) {
    if (import.meta.env.DEV) console.warn('[Idle Expression] No expressionManager found!');
    return;
  }
  
  const expressions = vrm.expressionManager.expressions;
  const keys = Object.keys(expressions);
  if (import.meta.env.DEV) {
    console.log('[Idle Expression] Available expression keys:', keys);
    console.log('[Idle Expression] Total expressions:', keys.length);
  }
  
  const names: string[] = [];
  for (const key of keys) {
    const expr = expressions[key];
    if (expr && typeof expr === 'object' && 'expressionName' in expr) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      names.push((expr as any).expressionName || key);
    } else {
      names.push(key);
    }
  }
  if (import.meta.env.DEV) console.log('[Idle Expression] Expression names:', names);
}

export function setIdleExpressionPaused(paused: boolean): void {
  _paused = paused;
  
  // CRITICAL: Reset all idle expression weights saat paused
  // Ini mencegah idle expression (seperti happy/relaxed yang buka mulut)
  // mengganggu lip sync saat TTS berbicara.
  // Namun, jika sedang dalam mood override (misal: sad, angry), pertahankan agar ekspresi tetap sesuai konteks!
  if (paused) {
    if (_inMoodOverride) {
      if (import.meta.env.DEV) console.log('[Idle Expression] Paused - keeping active mood override');
    } else {
      _currentWeights = {};
      _targetWeights = {};
      _transitioning = false;
      _fluctuationPhase = 0;
      if (import.meta.env.DEV) console.log('[Idle Expression] Paused - all weights cleared for lip sync');
    }
  } else {
    if (_inMoodOverride) {
      if (import.meta.env.DEV) console.log('[Idle Expression] Resumed - keeping active mood override');
    } else {
      _currentWeights = {}; // Start from neutral (all 0)
      _targetWeights = {};  // Target neutral first
      _holdTarget = 10 + Math.random() * 5; // Hold neutral 10-15 detik
      _holdTimer = 0;
      _activeName = 'neutral';
      _transitioning = false; // Tidak transitioning, langsung neutral
      _lerpSpeed = LERP_SPEED_RESUME; // Use slower lerp speed for next transition
      _resumeTransitionCount = 0; // Reset counter - next 2-3 transitions will be slower
      if (import.meta.env.DEV) console.log('[Idle Expression] Resumed - holding neutral');
    }
  }
}

/**
 * Smoothly fade out idle expressions to neutral before TTS starts.
 * This creates a more natural transition compared to instant reset.
 * Returns true when fade is complete.
 * 
 * IMPORTANT: Does NOT fade mouth expressions (aa, ih, ou, ee, oh) to allow
 * lip sync to work immediately during fade out.
 */
export function fadeOutIdleExpressions(delta: number, vrm: VRM): boolean {
  if (!vrm.expressionManager) return true;
  
  // Jika sedang dalam mood override, jangan di-fade out! Langsung return true agar lip sync jalan bersamanya.
  if (_inMoodOverride) {
    return true;
  }
  
  const em = vrm.expressionManager;
  // Fade out in ~300ms: t = delta / 0.3 gives full transition in 300ms
  // Clamped to [0, 1] so it never overshoots
  const FADE_DURATION = 0.3; // 300ms fade out (Requirement 19.1)
  const t = Math.min(delta / FADE_DURATION, 1);
  
  // Mouth expressions that should NOT be faded (reserved for lip sync)
  const mouthExpressions = new Set(['aa', 'ih', 'ou', 'ee', 'oh']);
  
  // Lerp all current weights toward 0 (except mouth expressions)
  let maxValue = 0;
  const mouthVal = getLipSyncMouthValue();
  const standardMouthSuppression = Math.max(0, 1 - mouthVal * 1.5);
  const mouthAffectingKeys = new Set(['happy', 'sad', 'angry', 'surprised', 'relaxed', 'joy', 'sorrow', 'fun']);

  for (const [key, value] of Object.entries(_currentWeights)) {
    // Skip mouth expressions - let lip sync handle them
    if (mouthExpressions.has(key)) {
      continue;
    }
    
    const newValue = lerp(value, 0, t);
    _currentWeights[key] = newValue;
    maxValue = Math.max(maxValue, Math.abs(newValue));
    
    let appliedValue = Math.max(0, newValue);
    if (mouthAffectingKeys.has(key)) {
      appliedValue *= standardMouthSuppression;
    }
    
    // Apply to VRM
    try { em.setValue(key, appliedValue); } catch (_) { /* ok */ }
  }
  
  // Fade complete when all values are near 0
  if (maxValue < 0.01) {
    // Clear all weights except mouth expressions
    const mouthWeights: Record<string, number> = {};
    for (const [key, value] of Object.entries(_currentWeights)) {
      if (mouthExpressions.has(key)) {
        mouthWeights[key] = value;
      }
    }
    _currentWeights = mouthWeights;
    _targetWeights = {};
    return true;
  }
  
  return false;
}

/**
 * Force clear all idle expression values from VRM immediately.
 * Call this right before TTS starts to ensure clean slate for lip sync.
 * NOTE: This is instant - use fadeOutIdleExpressions() for smooth transition.
 */
export function forceResetIdleExpressions(vrm: VRM): void {
  if (!vrm.expressionManager) return;
  
  const em = vrm.expressionManager;
  const managedKeys = ['happy', 'sad', 'angry', 'surprised', 'relaxed', 'neutral', 'joy', 'sorrow', 'fun', 'extra'];
  
  for (const k of managedKeys) {
    try { em.setValue(k, 0); } catch (_) { /* ok */ }
  }
  
  // Also clear internal state
  _currentWeights = {};
  _targetWeights = {};
  
  if (import.meta.env.DEV) console.log('[Idle Expression] Force reset - all expressions cleared from VRM');
}

export function applyMoodOverride(
  moodName: string,
  duration: number,
  vrm: VRM,
): void {
  if (!_enabled || manualMode) return;
  
  const normalizedMood = moodName.toLowerCase();
  const weights: Record<string, number> = {};
  let expressionName = 'neutral';
  let intensity = 0.50; // Cukup kuat agar terlihat

  if (normalizedMood === 'happy' || normalizedMood === 'excited') {
    expressionName = 'happy';
    intensity = normalizedMood === 'excited' ? 0.75 : 0.55;
    weights['happy'] = intensity;
  } else if (normalizedMood === 'laughing') {
    expressionName = 'happy';
    intensity = 0.80;
    weights['happy'] = intensity;
  } else if (normalizedMood === 'sad') {
    expressionName = 'sad';
    intensity = 0.60;
    weights['sad'] = intensity;
  } else if (normalizedMood === 'sympathetic') {
    expressionName = 'sad';
    intensity = 0.45;
    weights['sad'] = intensity;
  } else if (normalizedMood === 'angry' || normalizedMood === 'disgusted') {
    expressionName = 'angry';
    intensity = 0.65;
    weights['angry'] = intensity;
  } else if (normalizedMood === 'surprised') {
    expressionName = 'surprised';
    intensity = 0.70;
    weights['surprised'] = intensity;
  } else if (normalizedMood === 'relaxed' || normalizedMood === 'thinking') {
    expressionName = 'relaxed';
    intensity = 0.45;
    weights['relaxed'] = intensity;
  } else if (normalizedMood === 'embarrassed') {
    expressionName = 'relaxed';
    intensity = 0.50;
    weights['relaxed'] = intensity * 0.7;
    weights['happy'] = intensity * 0.3;
  } else if (normalizedMood === 'bored') {
    expressionName = 'sad';
    intensity = 0.35;
    weights['sad'] = intensity;
  } else if (normalizedMood === 'curious') {
    expressionName = 'surprised';
    intensity = 0.35;
    weights['surprised'] = intensity;
  } else if (normalizedMood === 'fearful') {
    // Takut → mata melebar (surprised) + sedikit tegang
    expressionName = 'surprised';
    intensity = 0.75;
    weights['surprised'] = intensity;
  } else if (normalizedMood === 'tense') {
    // Tegang/nervous → campuran surprised dan angry yang subtle
    expressionName = 'surprised';
    intensity = 0.50;
    weights['surprised'] = intensity * 0.6;
    weights['angry'] = intensity * 0.3;
  } else if (normalizedMood === 'romantic') {
    // Romantis → happy yang hangat dan lembut
    expressionName = 'happy';
    intensity = 0.60;
    weights['happy'] = intensity;
    weights['relaxed'] = intensity * 0.3;
  } else if (normalizedMood === 'proud') {
    // Bangga → happy yang percaya diri
    expressionName = 'happy';
    intensity = 0.65;
    weights['happy'] = intensity;
    weights['relaxed'] = intensity * 0.25;
  } else if (normalizedMood === 'confused') {
    // Bingung → surprised ringan + relaxed
    expressionName = 'surprised';
    intensity = 0.40;
    weights['surprised'] = intensity * 0.5;
    weights['relaxed'] = intensity * 0.3;
  }

  _targetWeights = weights;
  _baseTargetIntensity = intensity;
  _transitioning = true;
  _inMoodOverride = true;
  _overrideMoodName = normalizedMood;
  _moodOverrideTimer = 0;
  _moodOverrideDuration = duration;
  _activeName = expressionName;
  
  // Use a slightly faster lerp for overrides so they feel responsive
  _lerpSpeed = 1.2;
  _useEaseOut = true; // mood overrides always use ease-out for smooth feel
  
  if (import.meta.env.DEV) console.log(`[Idle Expression] Mood override: ${normalizedMood} (${expressionName}) for ${duration}s @ ${intensity.toFixed(2)}`);
}

export function setIdleExpressionManual(manual: boolean): void {
  manualMode = manual;
}

export interface IdleExpressionState {
  name: string;
  mood: 'positive' | 'negative' | 'neutral';
}

export function updateIdleExpression(delta: number, vrm: VRM): IdleExpressionState | null {
  if (!_enabled || manualMode || !vrm.expressionManager) return null;
  
  // Jika sedang di-pause dan TIDAK dalam mood override, abaikan update
  if (_paused && !_inMoodOverride) {
    return null;
  }
  
  // ── Mood override countdown ───────────────────────────────────────────────
  if (_inMoodOverride) {
    _moodOverrideTimer += delta;
    
    // Playful reaction transition:
    // If the mood is happy/excited/laughing/romantic/proud, initially we use standard 'happy' (wink+melet)
    // but after 1.2 seconds, we smoothly transition to standard 'relaxed' (normal smile)!
    if (
      (_overrideMoodName === 'happy' || _overrideMoodName === 'excited' || _overrideMoodName === 'laughing' || _overrideMoodName === 'romantic' || _overrideMoodName === 'proud') &&
      _moodOverrideTimer >= 1.2
    ) {
      if (_targetWeights['happy'] !== undefined && _targetWeights['happy'] > 0) {
        const happyVal = _targetWeights['happy'];
        delete _targetWeights['happy'];
        
        // Use 'relaxed' (normal pleasant smile)
        _targetWeights['relaxed'] = happyVal;
        _activeName = 'relaxed';
        
        if (import.meta.env.DEV) {
          console.log('[Idle Expression] Playful reaction complete, transitioning standard happy/melet to normal smile (relaxed)');
        }
      }
    }
    
    if (_moodOverrideTimer >= _moodOverrideDuration) {
      _inMoodOverride = false;
      _overrideMoodName = '';
      const next = _pickNext();
      _targetWeights = next.weights;
      _baseTargetIntensity = next.intensity;
      _holdTarget = next.duration;
      _holdTimer = 0;
      _activeName = next.name;
      _useEaseOut = Math.random() < 0.7;
      _transitioning = true;
    }
  }
  
  // ── Hold timer (Hanya berjalan jika TIDAK di-pause dan TIDAK sedang mood override) ──
  if (!_paused && !_inMoodOverride) {
    _holdTimer += delta;
    
    // Intensity fluctuation during hold (subtle breathing effect)
    if (!_transitioning && _activeName !== 'neutral') {
      _fluctuationPhase += delta * INTENSITY_FLUCTUATION_SPEED * Math.PI * 2;
      const fluctuation = Math.sin(_fluctuationPhase) * INTENSITY_FLUCTUATION_AMOUNT;
      
      for (const [key, baseValue] of Object.entries(_targetWeights)) {
        const fluctuatedValue = baseValue * (1 + fluctuation);
        _currentWeights[key] = Math.max(0, Math.min(1, fluctuatedValue));
      }
    }
    
    if (_holdTimer >= _holdTarget) {
      const next = _pickNext();
      _targetWeights = next.weights;
      _baseTargetIntensity = next.intensity;
      _holdTarget = next.duration;
      _holdTimer = 0;
      _activeName = next.name;
      _useEaseOut = Math.random() < 0.7; // decide easing once per transition
      _transitioning = true;
      _fluctuationPhase = 0;
    }
  }
  
  // ── Lerp transition ───────────────────────────────────────────────────────
  if (_transitioning) {
    const t = Math.min(_lerpSpeed * delta, 1);
    
    // Easing computed ONCE per frame (outside key loop) so all keys use the same curve
    const eased = _useEaseOut
      ? (1 - Math.pow(1 - t, 2))                                          // ease-out quadratic
      : (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);    // ease-in-out cubic
    
    const allKeys = new Set([...Object.keys(_currentWeights), ...Object.keys(_targetWeights)]);
    let maxDiff = 0;
    const next: Record<string, number> = {};
    
    for (const k of allKeys) {
      const cur = _currentWeights[k] ?? 0;
      const tgt = _targetWeights[k] ?? 0;
      next[k] = _lerp(cur, tgt, eased);
      maxDiff = Math.max(maxDiff, Math.abs(next[k] - tgt));
    }
    
    _currentWeights = next;
    
    if (maxDiff < 0.01 || t >= 1) {
      _currentWeights = { ..._targetWeights };
      _transitioning = false;
      if (import.meta.env.DEV) console.log('[Idle Expression] ✓', _activeName);
    }
  }
  
  // ── Apply to VRM ──────────────────────────────────────────────────────────
  const em = vrm.expressionManager;
  
  // Reset managed keys - EXCLUDE blink keys to avoid interfering with blink system
  const managedKeys = ['happy', 'sad', 'angry', 'surprised', 'relaxed', 'neutral', 'joy', 'sorrow', 'fun', 'extra'];
  for (const k of managedKeys) {
    try { em.setValue(k, 0); } catch (_) { /* ok */ }
  }
  
  // Apply current weights
  const mouthVal = getLipSyncMouthValue();
  const standardMouthSuppression = Math.max(0, 1 - mouthVal * 1.5);
  const mouthAffectingKeys = new Set(['happy', 'sad', 'angry', 'surprised', 'relaxed', 'joy', 'sorrow', 'fun']);

  for (const [k, v] of Object.entries(_currentWeights)) {
    if (v <= 0.005) continue;
    let clamped = Math.max(0, Math.min(1, v));
    
    if (mouthAffectingKeys.has(k)) {
      clamped *= standardMouthSuppression;
    }
    
    try {
      em.setValue(k, clamped);
    } catch (_) { /* ok */ }
    
    // camelCase fallback
    const camel = k.charAt(0).toLowerCase() + k.slice(1);
    if (camel !== k) {
      try {
        let camelClamped = clamped;
        if (mouthAffectingKeys.has(camel)) {
          camelClamped = (Math.max(0, Math.min(1, v))) * standardMouthSuppression;
        }
        em.setValue(camel, camelClamped);
      } catch (_) { /* ok */ }
    }
  }
  // Return current state for HUD/Feedback
  return {
    name: _activeName,
    mood: _currentMood,
  };
}
