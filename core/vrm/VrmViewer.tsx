import { useEffect, useRef, useCallback, useState, forwardRef, useImperativeHandle, useMemo, memo } from 'react';
import * as THREE from 'three';
import { supabase } from '@/integrations/supabase/client';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRMLoaderPlugin, VRM, VRMUtils } from '@pixiv/three-vrm';
import {
  updateBlink,
  setBlinkSpeakingMode,
  updateLipSync,
  resetMouthExpressions,
  updateIdleMicroGestures,
  setGestureIntensity,
} from '@/lib/vrm-animations';
import { fetchVrmWithCache } from '@/lib/vrm-cache';

import { detectMood, detectMoodAsync } from '@/lib/sentiment';
import {
  initIdleExpression,
  updateIdleExpression,
  setIdleExpressionPaused,
  setIdleExpressionManual,
  applyMoodOverride,
  debugExpressionKeys,
  forceResetIdleExpressions,
  fadeOutIdleExpressions,
} from '@/lib/idle-expression-advanced';
import { createMixer, playVRMA } from '@/lib/vrma-player';
import { initLookAt, updateLookAt, setLookAtEnabled, forceNeutral } from '@/lib/vrm-lookat';
import { initSpringBones, updateSpringBones } from '@/lib/vrm-spring';
import { getWebSpeechLipLevel } from '@/lib/web-speech-tts';
import { createEnvironmentManager, type EnvironmentManager } from '@/lib/vrm-environment';
import { createLightingManager, type LightingManager, type LightingConfig, LIGHTING_PRESETS } from '@/lib/vrm-lighting';
import type { PlayVrmaOptions } from '@/lib/vrma-player';
import {
  computeAdaptivePresets,
  CAMERA_PRESETS_STATIC,
  type CameraPreset,
  type CameraPresetData,
} from '@/lib/camera-presets';
import { useVrmaAnimations } from '@/hooks/useVrmaAnimations';
import { playHeadpatSfx, playShoulderTapSfx, preloadHeadpatSfx, preloadTapSfx, getHeadpatPool, getTapPool } from '@/lib/interaction-sfx';
import { HolographicHud } from './HolographicHud';
import { PerformanceOverlay } from './PerformanceOverlay';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { GripHorizontal, Plus, Minus, RotateCcw } from 'lucide-react';

export type { CameraPreset };

// ── Camera & render constants ─────────────────────────────────────────────────
const CAMERA = {
  jitterIdle:     0.004,
  jitterSpeaking: 0.008,
  zoomSpeaking:   0.7,
  zoomIdleDesktop: 1.2,
  zoomIdleMobile:  1.4,
  floatAmount:    0.005,
  floatFreq:      0.5,
  lerpSpeed:      0.5,
} as const;

const RENDER = {
  pulseLightIntensity: 0.05,
  pulseFreq:           0.8,
} as const;

const INTERACTION = {
  headpatCooldown:    2500,
  shoulderTapCooldown: 3000,
  affectionThrottle:  1000,
} as const;

// ── Pure frame throttle helper ────────────────────────────────────────────────
/**
 * Returns the target frame interval in milliseconds based on tab visibility
 * and device type.
 *
 * - Hidden tab  → 100 ms  (10 fps)  — saves battery when tab is not visible
 * - Mobile      →  33.33 ms (30 fps) — conservative for mobile GPUs
 * - Desktop     →  16.67 ms (60 fps) — full frame rate
 */
export function computeTargetInterval(isVisible: boolean, isMobile: boolean): number {
  if (!isVisible) return 1000 / 10;   // 100ms — hidden tab
  if (isMobile)   return 1000 / 30;   // 33.33ms — mobile
  return 1000 / 60;                   // 16.67ms — desktop
}

/**
 * Computes spring bones skip frequency based on camera distance and device type.
 * 
 * - distance > 4  → skip 4 frames (update every 4th frame)
 * - distance ≤ 4 AND mobile → skip 2 frames (update every 2nd frame)
 * - distance ≤ 4 AND desktop → skip 1 frame (update every frame)
 * 
 * @param cameraDistance - Distance from camera to origin
 * @param isMobile - Whether device is mobile
 * @returns Skip frequency (1, 2, or 4)
 */
export function computeSpringSkipFrequency(cameraDistance: number, isMobile: boolean): 1 | 2 | 4 {
  if (cameraDistance > 4) return 4;
  if (isMobile) return 2;
  return 1;
}

/**
 * Determines whether a raycasting operation should be throttled based on elapsed time.
 * Throttles to maximum 30 raycasts per second (33.33ms interval).
 * 
 * @param lastRaycastTime - Timestamp of last raycast (performance.now())
 * @param currentTime - Current timestamp (performance.now())
 * @returns true if raycast should be skipped (throttled), false if allowed
 */
export function shouldThrottleRaycast(lastRaycastTime: number, currentTime: number): boolean {
  const RAYCAST_INTERVAL = 1000 / 30; // 33.33ms — max 30 raycasts/sec
  const elapsed = currentTime - lastRaycastTime;
  return elapsed < RAYCAST_INTERVAL;
}

/**
 * Computes max device pixel ratio based on device class.
 * Low-end devices (≤4 cores or ≤4GB RAM) get further reduced DPR to save GPU.
 */
export function computeMaxDpr(isMobile: boolean): number {
  const cores = typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency || 8) : 8;
  const memory = typeof navigator !== 'undefined' ? ((navigator as unknown as { deviceMemory?: number }).deviceMemory || 8) : 8;
  const isLowEnd = cores <= 4 || memory <= 4;
  if (isLowEnd) return isMobile ? 1 : 1.25;
  return isMobile ? 1.5 : 2;
}

// ── Three.js resource disposal helpers ───────────────────────────────────────

/**
 * Dispose all texture properties on a material, then dispose the material itself.
 * Iterates over all keys of the material and disposes any THREE.Texture values.
 */
export function disposeMaterial(mat: THREE.Material): void {
  for (const key of Object.keys(mat)) {
    const val = (mat as unknown as Record<string, unknown>)[key];
    if (val instanceof THREE.Texture) (val as THREE.Texture).dispose();
  }
  mat.dispose();
}

/**
 * Traverse a THREE.Scene and dispose geometry, materials, and textures
 * for every Mesh found.
 */
export function disposeSceneObjects(scene: THREE.Scene): void {
  scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry?.dispose();
      if (Array.isArray(obj.material)) {
        obj.material.forEach((m) => disposeMaterial(m));
      } else if (obj.material) {
        disposeMaterial(obj.material);
      }
    }
  });
}

/**
 * Dispose all Three.js resources owned by a VRM model using VRMUtils.deepDispose.
 * This releases GPU memory for all geometries, materials, and textures in the VRM scene.
 */
export function disposeVrmResources(vrm: VRM): void {
  VRMUtils.deepDispose(vrm.scene);
}

export interface VrmViewerHandle {
  playVrmaUrl: (url: string, opts?: PlayVrmaOptions) => Promise<void>;
  stopVrma: (fadeOut?: number) => void;
  isVrmLoaded: () => boolean;
  /** Returns true if a non-idle VRMA animation is currently playing */
  isVrmaPlaying: () => boolean;
  setCameraPreset: (preset: CameraPreset) => void;
  setCameraFree: (enabled: boolean) => void;
  isCameraFree: () => boolean;
  /** Apply a map of blendshape key → weight (0–1) directly to the loaded VRM. */
  applyBlendshape: (weights: Record<string, number>) => void;
  /** Reset all expression weights to 0. */
  clearBlendshape: () => void;
  /** Enable/disable automatic mood expressions (for manual blendshape preview). */
  setManualBlendshapeMode: (enabled: boolean) => void;
  /** Set environment background */
  setEnvironment: (preset: string) => void;
  /** Set image background */
  setImageBackground: (imageUrl: string) => void;
  /** Get current environment preset */
  getCurrentEnvironment: () => string | null;
  /** Update lighting configuration */
  setLighting: (config: LightingConfig) => void;
  /** Get current lighting configuration */
  getCurrentLighting: () => LightingConfig | null;
  /** Set renderer exposure */
  setExposure: (value: number) => void;
  /** Apply mood override directly from user message text */
  applyUserMood?: (mood: string) => void;
}

interface VrmViewerProps {
  modelUrl: string;
  isSpeaking?: boolean;
  isWebSpeechActive?: boolean;
  audioElement?: HTMLAudioElement | null;
  currentMessage?: string;
  className?: string;
  getAudioLevel?: () => number;
  getFrequencyData?: () => Uint8Array;
  onLevelUp?: (newLevel: number) => void;
  ambientEffect?: 'none' | 'sakura' | 'rain' | 'snow' | 'leaves';
  showSubtitles?: boolean;
  clips?: any[];
  userId?: string;
  affectionLevel?: number;
}

const VrmViewer = forwardRef<VrmViewerHandle, VrmViewerProps>(function VrmViewer(
  { modelUrl, isSpeaking = false, isWebSpeechActive = false, audioElement, currentMessage, className, getAudioLevel, getFrequencyData, onLevelUp, ambientEffect = 'none', showSubtitles = true, clips = [], userId, affectionLevel = 0 },
  ref
) {
  const [subtitleSize, setSubtitleSize] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('vrm.subtitle_fontsize');
      return saved ? parseInt(saved, 10) : 16;
    } catch {
      return 16;
    }
  });

  const handleIncreaseSize = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSubtitleSize(prev => {
      const next = Math.min(prev + 2, 28);
      localStorage.setItem('vrm.subtitle_fontsize', String(next));
      return next;
    });
  };

  const handleDecreaseSize = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSubtitleSize(prev => {
      const next = Math.max(prev - 2, 12);
      localStorage.setItem('vrm.subtitle_fontsize', String(next));
      return next;
    });
  };

  // Draggable constraint container ref
  const constraintsRef = useRef<HTMLDivElement>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const vrmRef = useRef<VRM | null>(null);
  const clockRef = useRef(new THREE.Clock());
  const rafRef = useRef<number>(0);
  const isSpeakingRef = useRef(isSpeaking);
  const lastFrameTimeRef = useRef(0);
  const frameCountRef = useRef(0);
  const isVisibleRef = useRef(true);
  const isMobileRef = useRef(false);
  const manualBlendshapeRef = useRef(false); // true = skip auto mood expressions
  
  // Interaction audio - simple speaking flag (no audio analysis needed)
  const interactionAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isInteractionSpeaking, setIsInteractionSpeaking] = useState(false);
  const isInteractionSpeakingRef = useRef(false); // Ref for immediate access in render loop

  // Camera
  const orbitControlsRef = useRef<OrbitControls | null>(null);
  const cameraFreeRef = useRef(false);
  const cameraAnimationRef = useRef<number>(0);
  const adaptivePresetsRef = useRef<Record<CameraPreset, CameraPresetData> | null>(null);
  // Track the Z distance of the active preset so zoom/float stay relative to it
  const presetBaseZRef = useRef<number>(CAMERA.zoomIdleDesktop);

  const [loading, setLoading] = useState(true);
  const isCurrentlyPiP = typeof document !== 'undefined' && containerRef.current?.ownerDocument !== document;
  const [error, setError] = useState<string | null>(null);
  const [webglContextLost, setWebglContextLost] = useState(false);
  const [bgImageUrl, setBgImageUrl] = useState<string | null>(null);
  const [prevBgImageUrl, setPrevBgImageUrl] = useState<string | null>(null);
  const [speechProgressTime, setSpeechProgressTime] = useState(0);
  const [speechTotalDuration, setSpeechTotalDuration] = useState(0);

  // Sync with audio element if available
  useEffect(() => {
    if (!audioElement || isWebSpeechActive) return;
    const onTimeUpdate = () => setSpeechProgressTime(audioElement.currentTime);
    const onDurationChange = () => setSpeechTotalDuration(audioElement.duration || 0);
    audioElement.addEventListener('timeupdate', onTimeUpdate);
    audioElement.addEventListener('durationchange', onDurationChange);
    return () => {
      audioElement.removeEventListener('timeupdate', onTimeUpdate);
      audioElement.removeEventListener('durationchange', onDurationChange);
    };
  }, [audioElement, isWebSpeechActive]);

  // Simulate progress when using Web Speech
  useEffect(() => {
    if (!isWebSpeechActive || !isSpeaking || !currentMessage) {
      if (!isSpeaking) {
        setSpeechProgressTime(0);
        setSpeechTotalDuration(0);
      }
      return;
    }

    // Estimate duration: ~150 words per minute -> 2.5 words per second
    const wordCount = currentMessage.split(/\s+/).length;
    const estimatedDuration = Math.max(wordCount / 2.5, 1.5); // Minimum 1.5 seconds
    setSpeechTotalDuration(estimatedDuration);
    setSpeechProgressTime(0);

    const startTime = performance.now();
    let animId: number;

    const tick = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      setSpeechProgressTime(Math.min(elapsed, estimatedDuration));
      if (elapsed < estimatedDuration) {
        animId = requestAnimationFrame(tick);
      }
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isWebSpeechActive, isSpeaking, currentMessage]);

  const isFadingOutRef = useRef(false); // Track if we're fading out idle expression
  const vrmSceneHiddenRef = useRef<THREE.Group | null>(null); // Store VRM scene before adding to main scene
  const mixerUpdateCountRef = useRef(0); // Count mixer updates before showing model
  const environmentManagerRef = useRef<EnvironmentManager | null>(null);
  const lightingManagerRef = useRef<LightingManager | null>(null);
  // Cached rim intensity - reads localStorage once on mount, updated when lighting changes
  const rimIntensityRef = useRef(parseFloat(localStorage.getItem('vrm.rimLightIntensity') || '0.3'));

  // ── Performance monitoring refs (Req 30.1, 30.2) ─────────────────────────
  const qualityDowngradedRef = useRef(false);
  // Frame rate logging every 10 seconds
  const fpsFrameCountRef = useRef(0);
  const fpsWindowStartRef = useRef(performance.now());
  // Memory logging every 30 seconds
  const memLastLogTimeRef = useRef(performance.now());

  isSpeakingRef.current = isSpeaking || isInteractionSpeaking; // Include interaction speaking

  // Preload interaction SFX banks on mount
  useEffect(() => {
    preloadHeadpatSfx();
    preloadTapSfx();
  }, []);

  // Ref menyimpan mood terakhir yang terdeteksi dari AI reply
  const lastDetectedMoodRef = useRef<string>('neutral');

  // Pause/resume idle expression saat speaking berubah
  useEffect(() => {
    const speaking = isSpeaking || isInteractionSpeaking;
    if (speaking) {
      // Saat TTS mulai — pertahankan mood yang sedang aktif, jangan paksa neutral
      isFadingOutRef.current = true;
      setGestureIntensity(0.0);
      
      // Hanya apply mood jika ada mood yang terdeteksi dari AI reply
      if (vrmRef.current) {
        const activeMood = lastDetectedMoodRef.current;
        if (
          activeMood === 'happy' || 
          activeMood === 'excited' || 
          activeMood === 'laughing' || 
          activeMood === 'romantic' || 
          activeMood === 'proud'
        ) {
          // Reset mood happy (melet/wink) ke neutral saat TTS mulai agar bersih dan tidak kedutan/melet saat bersuara
          lastDetectedMoodRef.current = 'neutral';
          forceResetIdleExpressions(vrmRef.current);
          if (import.meta.env.DEV) {
            console.log('[VrmViewer] Happy mood reset to neutral on TTS start to prevent mouth twitching');
          }
        } else if (activeMood !== 'neutral') {
          // Perpanjang durasi mood non-happy (seperti sad/angry/surprised) selama TTS berbicara
          applyMoodOverride(activeMood, 12, vrmRef.current);
        }
      }
    } else {
      // Resume ketika TTS selesai
      isFadingOutRef.current = false;
      setIdleExpressionPaused(false);
      setGestureIntensity(1.0);
      
      // Setelah bicara, lanjutkan dengan mood yang sama atau fade ke neutral
      if (vrmRef.current) {
        const activeMood = lastDetectedMoodRef.current;
        if (activeMood !== 'neutral') {
          // Tahan mood 3 detik lagi sebelum kembali ke idle
          applyMoodOverride(activeMood, 3, vrmRef.current);
        } else {
          applyMoodOverride('relaxed', 2, vrmRef.current);
        }
      }
    }
    setBlinkSpeakingMode(speaking);
  }, [isSpeaking, isInteractionSpeaking]);
  
  // Sync ref with state
  useEffect(() => {
    isInteractionSpeakingRef.current = isInteractionSpeaking;
  }, [isInteractionSpeaking]);

  // Mood override dari AI reply (response text)
  useEffect(() => {
    if (!currentMessage) return;
    detectMoodAsync(currentMessage).then((mood) => {
      // Selalu simpan mood yang terdeteksi, meskipun neutral
      lastDetectedMoodRef.current = mood;
      if (mood !== 'neutral' && vrmRef.current) {
        // Duration 10 detik agar cukup panjang melewati durasi TTS berbicara
        applyMoodOverride(mood, 10, vrmRef.current);
      }
    });
  }, [currentMessage]);

  // ── Animation system ──────────────────────────────────────────────────────
  const {
    mixerRef,
    vrmaPlayingRef,
    vrmaActionRef,
    talkingClipsRef,
    isTalkingPlayingRef,
    isReturnToRestRef,
    idleClipsRef,
    idleClipRef,
    idleActionRef,
    idlePausedForActivityRef,
    idleCurrentIndexRef,
    activeDrivenBonesRef,
    restartIdleLoop,
    playNextTalking,
    playVrmaUrl,
    stopVrmaImperative,
  } = useVrmaAnimations(vrmRef, isSpeakingRef, modelUrl, loading);

  // ── Sync mixer ref to VRM after load ─────────────────────────────────────
  // The mixer is created inside the main useEffect after VRM loads.
  // useVrmaAnimations reads mixerRef directly so no extra wiring needed.

  // ── Talking / idle transitions driven by isSpeaking ──────────────────────
  useEffect(() => {
    const vrm = vrmRef.current;
    const mixer = mixerRef.current;

    if (isSpeaking) {
      if (vrmaActionRef.current) return; // gesture active — wait for it to finish

      const clips = talkingClipsRef.current;
      if (!vrm || !mixer) return;

      if (clips.length === 0) {
        // Retry until clips arrive (max 3s)
        const retryId = setInterval(() => {
          if (talkingClipsRef.current.length > 0 && isSpeakingRef.current && !isTalkingPlayingRef.current) {
            clearInterval(retryId);
            isTalkingPlayingRef.current = true;
            idlePausedForActivityRef.current = true;
            playNextTalking();
          }
        }, 200);
        setTimeout(() => clearInterval(retryId), 3000);
        return;
      }

      isReturnToRestRef.current = false;
      isTalkingPlayingRef.current = true;
      idlePausedForActivityRef.current = true;
      playNextTalking();
    } else {
      if (isTalkingPlayingRef.current) {
        isTalkingPlayingRef.current = false;
        idlePausedForActivityRef.current = false;

        const clips = idleClipsRef.current;
        if (mixer && clips.length > 0) {
          const idleClip = clips[idleCurrentIndexRef.current % clips.length];
          idleClipRef.current = idleClip;
          const fadeIn = idleActionRef.current?.isRunning() ? 1.0 : 2.0;
          const idleAction = playVRMA(mixer, idleClip, { loop: true, fadeIn });
          if (idleAction) {
            idleActionRef.current = idleAction;
            vrmaPlayingRef.current = true;
          } else {
            vrmaPlayingRef.current = false;
            setTimeout(() => {
              if (!isSpeakingRef.current && !isTalkingPlayingRef.current) restartIdleLoop();
            }, 300);
          }
        } else if (mixer && vrmaPlayingRef.current) {
          isReturnToRestRef.current = true;
          const actions = (mixer as unknown as { _actions: THREE.AnimationAction[] })._actions ?? [];
          actions.forEach((a) => { try { a.fadeOut(1.2); } catch (_) { /* ok */ } });
          setTimeout(() => {
            isReturnToRestRef.current = false;
            vrmaPlayingRef.current = false;
            restartIdleLoop();
          }, 1300);
        }
      }

      if (vrm) {
        resetMouthExpressions(vrm);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpeaking, restartIdleLoop, playNextTalking]);

  useEffect(() => {
    if (!isSpeaking && vrmRef.current) {
      resetMouthExpressions(vrmRef.current);
    }
   
  }, [isSpeaking]);

  // ── Camera animation ──────────────────────────────────────────────────────
  const animateCameraToPreset = useCallback((preset: CameraPreset) => {
    const camera = cameraRef.current;
    const controls = orbitControlsRef.current;
    if (!camera) return;

    const presets = adaptivePresetsRef.current ?? CAMERA_PRESETS_STATIC;
    const presetData = presets[preset];
    // Save the preset's Z so the render loop uses it as base instead of hardcoded values
    presetBaseZRef.current = presetData.position[2];
    const startPos = camera.position.clone();
    const startTarget = controls ? controls.target.clone() : new THREE.Vector3(0, 0.95, 0);
    const endPos = new THREE.Vector3(...presetData.position);
    const endTarget = new THREE.Vector3(...presetData.target);
    const duration = 0.6;
    const startTime = performance.now();
    const activeWin = containerRef.current?.ownerDocument?.defaultView || window;

    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / (duration * 1000), 1);
      const t = 1 - Math.pow(1 - progress, 3); // ease-out cubic

      camera.position.lerpVectors(startPos, endPos, t);
      if (controls) {
        controls.target.lerpVectors(startTarget, endTarget, t);
      } else {
        camera.lookAt(
          THREE.MathUtils.lerp(startTarget.x, endTarget.x, t),
          THREE.MathUtils.lerp(startTarget.y, endTarget.y, t),
          THREE.MathUtils.lerp(startTarget.z, endTarget.z, t),
        );
      }
      camera.fov = THREE.MathUtils.lerp(camera.fov, presetData.fov, t);
      camera.updateProjectionMatrix();

      if (progress < 1) {
        cameraAnimationRef.current = activeWin.requestAnimationFrame(animate);
      } else {
        cameraAnimationRef.current = 0;
        controls?.update();
      }
    };

    if (cameraAnimationRef.current) activeWin.cancelAnimationFrame(cameraAnimationRef.current);
    cameraAnimationRef.current = activeWin.requestAnimationFrame(animate);
  }, []);

  // ── Imperative handle ─────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    isVrmLoaded: () => !!vrmRef.current,
    isVrmaPlaying: () => !!vrmaActionRef.current || isTalkingPlayingRef.current,
    setCameraPreset: (preset) => {
      cameraFreeRef.current = false;
      animateCameraToPreset(preset);
      if (orbitControlsRef.current) orbitControlsRef.current.enabled = false;
    },
    setCameraFree: (enabled) => {
      cameraFreeRef.current = enabled;
      if (orbitControlsRef.current) orbitControlsRef.current.enabled = enabled;
      setLookAtEnabled(!enabled); // disable look-at in free camera mode
    },
    isCameraFree: () => cameraFreeRef.current,
    playVrmaUrl,
    stopVrma: stopVrmaImperative,
    applyBlendshape: (weights: Record<string, number>) => {
      const vrm = vrmRef.current;
      if (!vrm?.expressionManager) return;
      manualBlendshapeRef.current = true; // pause auto mood
      for (const [key, value] of Object.entries(weights)) {
        const v = Math.max(0, Math.min(1, value));
        try { vrm.expressionManager.setValue(key, v); } catch (_) { /* ok */ }
        const camel = key.charAt(0).toLowerCase() + key.slice(1);
        if (camel !== key) { try { vrm.expressionManager.setValue(camel, v); } catch (_) { /* ok */ } }
      }
    },
    clearBlendshape: () => {
      const vrm = vrmRef.current;
      if (!vrm?.expressionManager) return;
      manualBlendshapeRef.current = false; // resume auto mood
      const allKeys = [
        'EyeBlinkLeft','EyeBlinkRight','EyeWideLeft','EyeWideRight','EyeSquintLeft','EyeSquintRight',
        'BrowDownLeft','BrowDownRight','BrowInnerUp','BrowOuterUpLeft','BrowOuterUpRight',
        'CheekPuff','CheekSquintLeft','CheekSquintRight','NoseSneerLeft','NoseSneerRight',
        'JawOpen','JawLeft','JawRight','MouthSmileLeft','MouthSmileRight','MouthFrownLeft','MouthFrownRight',
        'MouthDimpleLeft','MouthDimpleRight','MouthStretchLeft','MouthStretchRight',
        'MouthRollLower','MouthRollUpper','MouthShrugLower','MouthShrugUpper',
        'MouthPressLeft','MouthPressRight','MouthLowerDownLeft','MouthLowerDownRight',
        'MouthUpperUpLeft','MouthUpperUpRight','MouthClose','MouthFunnel','MouthPucker','MouthLeft','MouthRight',
        'happy','sad','relaxed','surprised','angry','blinkLeft','blinkRight','aa','ih','ou','ee','oh',
      ];
      for (const k of allKeys) { try { vrm.expressionManager.setValue(k, 0); } catch (_) { /* ok */ } }
    },
    setManualBlendshapeMode: (enabled: boolean) => {
      manualBlendshapeRef.current = enabled;
      setIdleExpressionManual(enabled);
    },
    setEnvironment: (preset: string) => {
      setBgImageUrl(null); // clear HTML image background when switching to env preset
      environmentManagerRef.current?.setEnvironment(preset);
      
      // Auto-update lighting based on environment preset name
      if (lightingManagerRef.current) {
        const presetLower = preset.toLowerCase();
        let lightPreset = 'studio';
        
        if (presetLower.includes('cyberpunk')) lightPreset = 'cyberpunk';
        else if (presetLower.includes('sunset') || presetLower.includes('morning')) lightPreset = 'sunset';
        else if (presetLower.includes('void') || presetLower.includes('space')) lightPreset = 'night-outdoor';
        else if (presetLower.includes('hologram') || presetLower.includes('neon')) lightPreset = 'neon';
        else if (presetLower.includes('soft') || presetLower.includes('warm')) lightPreset = 'soft';
        
        const config = LIGHTING_PRESETS[lightPreset];
        if (config) {
          lightingManagerRef.current.updateLighting(config);
          // Save for persistence
          localStorage.setItem('vrm.lightingPreset', lightPreset);
          localStorage.setItem('vrm.rimLightIntensity', config.rimLightIntensity.toString());
        }
      }
    },
    setImageBackground: (imageUrl: string) => {
      setBgImageUrl(prev => { setPrevBgImageUrl(prev); return imageUrl; });
      
      // Auto-update lighting based on background name
      if (lightingManagerRef.current) {
        const urlLower = imageUrl.toLowerCase();
        let preset = 'studio';
        
        if (urlLower.includes('cyberpunk') || urlLower.includes('neon')) preset = 'cyberpunk';
        else if (urlLower.includes('nightmarket') || urlLower.includes('sunset')) preset = 'sunset';
        else if (urlLower.includes('space') || urlLower.includes('void')) preset = 'night-outdoor';
        else if (urlLower.includes('lab') || urlLower.includes('hologram')) preset = 'neon';
        
        const config = LIGHTING_PRESETS[preset];
        if (config) {
          lightingManagerRef.current.updateLighting(config);
          // Save for persistence
          localStorage.setItem('vrm.lightingPreset', preset);
          localStorage.setItem('vrm.rimLightIntensity', config.rimLightIntensity.toString());
        }
      }

      // Clear any Three.js scene background so the HTML img layer shows through
      if (sceneRef.current) {
        sceneRef.current.background = null;
        // Remove any existing environment sphere
        const existing = sceneRef.current.getObjectByName('EnvironmentSphere');
        if (existing) sceneRef.current.remove(existing);
      }
    },
    getCurrentEnvironment: () => {
      return environmentManagerRef.current?.getCurrentPreset() ?? null;
    },
    setLighting: (config: LightingConfig) => {
      lightingManagerRef.current?.updateLighting(config);
      // Keep rim intensity cache in sync so render loop uses the new value
      if (config.rimLightIntensity !== undefined) {
        rimIntensityRef.current = config.rimLightIntensity;
        localStorage.setItem('vrm.rimLightIntensity', config.rimLightIntensity.toString());
      }
    },
    getCurrentLighting: () => {
      return lightingManagerRef.current?.getCurrentConfig() ?? null;
    },
    setExposure: (value: number) => {
      if (rendererRef.current) {
        rendererRef.current.toneMappingExposure = value;
      }
    },
    applyUserMood: (mood: string) => {
      if (vrmRef.current) {
        applyMoodOverride(mood, 7, vrmRef.current);
        if (import.meta.env.DEV) console.log('[VrmViewer] User mood detected:', mood);
      }
    },
  }), [animateCameraToPreset, playVrmaUrl, stopVrmaImperative]);

  // When bgImageUrl changes, ensure Three.js scene background is cleared
  useEffect(() => {
    if (bgImageUrl && sceneRef.current) {
      sceneRef.current.background = null;
      // Remove any existing environment sphere
      const existing = sceneRef.current.getObjectByName('EnvironmentSphere');
      if (existing) sceneRef.current.remove(existing);
    }
  }, [bgImageUrl]);

  // Keep getAudioLevel stable across renders
  const getAudioLevelRef = useRef<(() => number) | undefined>(getAudioLevel);
  getAudioLevelRef.current = isWebSpeechActive 
    ? () => getWebSpeechLipLevel(0)
    : getAudioLevel;
  const getFrequencyDataRef = useRef<(() => Uint8Array) | undefined>(getFrequencyData);
  getFrequencyDataRef.current = getFrequencyData;
  const isWebSpeechActiveRef = useRef(isWebSpeechActive);
  isWebSpeechActiveRef.current = isWebSpeechActive;

  // ── Render loop ───────────────────────────────────────────────────────────
  const animate = useCallback(() => {
    const activeWin = containerRef.current?.ownerDocument?.defaultView || window;
    rafRef.current = activeWin.requestAnimationFrame(animate);

    const now = performance.now();
    // Target: 60fps desktop, 30fps mobile. Drops strictly to 10fps if hidden tab to save battery.
    const targetInterval = computeTargetInterval(isVisibleRef.current, isMobileRef.current);
    const elapsed = now - lastFrameTimeRef.current;
    if (elapsed < targetInterval) return;
    lastFrameTimeRef.current = now - (elapsed % targetInterval);

    // Frame budget monitor — track start time for budget check at end of frame
    const frameStart = now;

    const delta = Math.min(clockRef.current.getDelta(), 0.1);
    const elapsedTime = clockRef.current.getElapsedTime();
    const vrm = vrmRef.current;
    frameCountRef.current++;

    // --- Atmospheric Camera Handheld Jitter ---
    if (cameraRef.current && !cameraFreeRef.current && !isPattingRef.current) {
      // Use noise-like random movement for handheld feel
      const noise = (Math.sin(elapsedTime * 0.4) + Math.sin(elapsedTime * 0.72) + Math.cos(elapsedTime * 0.28)) / 3;
      const noiseY = (Math.cos(elapsedTime * 0.5) + Math.sin(elapsedTime * 0.91) + Math.sin(elapsedTime * 0.47)) / 3;
      
      const jitterIntensity = isSpeaking ? CAMERA.jitterSpeaking : CAMERA.jitterIdle;
      cameraRef.current.position.y += noiseY * jitterIntensity * delta;
      cameraRef.current.position.x += noise * jitterIntensity * 0.5 * delta;
    }

    // --- Cinematic Camera Zoom (Action Cut) & Affection proximity ---
    // Only applies a subtle zoom relative to the active preset's base Z.
    // Does NOT override the preset position — just nudges ±10% from it.
    if (cameraRef.current && !cameraFreeRef.current) {
      const affectionOffset = Math.min(affectionLevel * 0.05, 0.25);
      const baseZ = presetBaseZRef.current - affectionOffset;
      const targetZ = (isSpeaking && (currentMessage ?? '').length > 50)
        ? baseZ * 0.88   // zoom in ~12% when speaking long message
        : baseZ;         // return to exact preset Z otherwise
      cameraRef.current.position.z = THREE.MathUtils.lerp(
        cameraRef.current.position.z, targetZ, delta * CAMERA.lerpSpeed
      );
    }

    // --- Cinematic Camera Float ---
    if (cameraRef.current && !cameraFreeRef.current && !isPattingRef.current) {
      const floatAmount = CAMERA.floatAmount;
      const freq = CAMERA.floatFreq;
      cameraRef.current.position.y += Math.sin(elapsedTime * freq) * floatAmount * delta;
      cameraRef.current.position.x += Math.cos(elapsedTime * freq * 0.7) * floatAmount * 0.5 * delta;
    }

    // --- Dynamic Light Pulsing (uses cached rim intensity — no localStorage read per frame) ---
    if (lightingManagerRef.current && !isMobileRef.current) {
      const pulseIntensity = RENDER.pulseLightIntensity;
      const pulse = Math.sin(elapsedTime * RENDER.pulseFreq) * pulseIntensity;
      const config = lightingManagerRef.current.getCurrentConfig();
      config.rimLightIntensity = rimIntensityRef.current + pulse;
      lightingManagerRef.current.updateLighting(config);
    }

    if (vrm) {
      // 1. Update mixer first — VRMA clips drive bones
      if (mixerRef.current) {
        mixerRef.current.update(delta);
        
        // Count mixer updates - need several frames for animation to fully apply
        if (vrmSceneHiddenRef.current && (idleActionRef.current || vrmaActionRef.current)) {
          mixerUpdateCountRef.current++;
        }
      }
      
      // 0. Add model to scene AFTER mixer has updated multiple times
      // This ensures bones are fully transformed by VRMA before model becomes visible
      // Wait for 10 frames (~166ms at 60fps) to ensure animation is fully applied
      if (vrmSceneHiddenRef.current && mixerUpdateCountRef.current >= 10) {
        const scene = sceneRef.current;
        if (scene) {
          scene.add(vrmSceneHiddenRef.current);
          vrmSceneHiddenRef.current = null; // Clear reference
        }
      }

      // 2. Look-at — desktop only (no mouse on mobile)
      if (cameraRef.current && !cameraFreeRef.current && !isMobileRef.current) {
        updateLookAt(delta, vrm, cameraRef.current, new Set());
      }

      // 3. Fade out idle expression when TTS is about to start
      // Fade happens in parallel with lip sync starting
      if (isFadingOutRef.current) {
        const fadeComplete = fadeOutIdleExpressions(delta, vrm);
        if (fadeComplete) {
          isFadingOutRef.current = false;
          setIdleExpressionPaused(true);
        }
      }

      // 4. Lip sync - set expression values (starts immediately when speaking)
      // Lip sync can run in parallel with fade out - mouth movements override fading expressions
      if (isSpeakingRef.current) {
        vrm.expressionManager?.setValue('aa', 0);
        
        // For interaction audio: use higher constant level for more visible mouth animation
        // For main TTS audio: use actual audio level for precise lip sync
        const level = isInteractionSpeakingRef.current
          ? 0.75 // Higher constant level for more visible talking animation (was 0.35)
          : (isWebSpeechActiveRef.current
            ? getWebSpeechLipLevel(delta)
            : (getAudioLevelRef.current?.() ?? 0));
        
        const freqData = !isInteractionSpeakingRef.current ? getFrequencyDataRef.current?.() : undefined;
        updateLipSync(level, vrm, delta, freqData);
      }

      // 5. Idle expression rotation (auto mood system) - set expression values
      // CRITICAL: Automatically paused when speaking to prevent interference with lip sync
      // When paused, all idle expression weights are cleared to 0
      if (!manualBlendshapeRef.current && !isFadingOutRef.current) {
        const result = updateIdleExpression(delta, vrm);
        // Update mood name for HUD
        if (result && result.name !== lastMoodRef.current) {
          lastMoodRef.current = result.name;
          setCurrentMoodName(result.name);
        }
      }

      // Affection-based subtle blush / smile
      // Apply a subtle baseline 'happy' expression based on affection level
      if (affectionLevel > 0 && vrm.expressionManager && !isSpeakingRef.current) {
        const baseHappy = Math.min(affectionLevel * 0.04, 0.2); // Max 0.2 happy at level 5
        const currentHappy = vrm.expressionManager.getValue('happy') || 0;
        // Only apply if it's not overriding a stronger explicit expression
        if (currentHappy < baseHappy && lastDetectedMoodRef.current === 'neutral') {
          vrm.expressionManager.setValue('happy', baseHappy);
        }
      }

      // 6. Apply all expression weights to morph targets - MUST be called after setting values
      vrm.update(delta);

      // 7. Blink - apply AFTER vrm.update() so blink has final say on morph targets
      // This prevents vrm.update() from overriding the direct morph target manipulation
      updateBlink(delta, vrm);

      // 8. Procedural micro-gestures — body breathing only (no expression override)
      // Now with smooth fade in/out based on gesture intensity
      const isManualOrTalking = !!vrmaActionRef.current || isTalkingPlayingRef.current;
      if (!isManualOrTalking) {
        updateIdleMicroGestures(elapsedTime, vrm, activeDrivenBonesRef.current, delta);
      }

      // Check mid-frame budget before non-critical operations
      // Skip spring bones if we're already over budget (Req 22.3)
      const midFrameTime = performance.now() - frameStart;
      const frameBudget = isMobileRef.current ? 33 : 16;
      const isOverBudget = midFrameTime >= frameBudget;

      // 8. Spring bones — secondary motion (hair, accessories, etc.)
      // Skipped if frame budget already exceeded to prioritize critical operations
      const dist = cameraRef.current ? cameraRef.current.position.length() : 0;
      const skipFrequency = computeSpringSkipFrequency(dist, isMobileRef.current);
      if (!isOverBudget && frameCountRef.current % skipFrequency === 0) {
        updateSpringBones(delta * skipFrequency, vrm); // compensate delta for skipped frames
      }
    }

    if (orbitControlsRef.current?.enabled) {
      orbitControlsRef.current.update();
    }

    // Hanya draw scene jika tab peramban benar-benar sedang dibuka (visibilitas tak tersembunyi), menghemat drastis beban GPU.
    if (rendererRef.current && sceneRef.current && cameraRef.current && isVisibleRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }

    // Frame budget monitor (dev-only) — log warning if frame time exceeds budget
    if (import.meta.env.DEV) {
      const frameTime = performance.now() - frameStart;
      const budget = isMobileRef.current ? 33 : 16;
      if (frameTime > budget) {
        console.warn(`[RenderLoop] Frame budget exceeded: ${frameTime.toFixed(1)}ms (budget: ${budget}ms)`);
      }
    }

    // ── Performance monitoring (Req 30.1, 30.2) ──────────────────────────────
    const perfNow = performance.now();

    // Frame rate logging every 10 seconds (Req 30.1)
    fpsFrameCountRef.current++;
    if (perfNow - fpsWindowStartRef.current >= 10_000) {
      const elapsed10s = perfNow - fpsWindowStartRef.current;
      const avgFps = Math.round((fpsFrameCountRef.current * 1000) / elapsed10s);
      console.info(`[Perf] FPS avg (10s): ${avgFps}`);
      
      // Dynamic Quality Scaling (DQS) - Adaptif FPS
      const isCurrentlyPiP = containerRef.current?.ownerDocument !== document;
      if (avgFps < 28 && !qualityDowngradedRef.current && rendererRef.current && !isCurrentlyPiP) {
        console.warn(`[Perf] Low performance detected (${avgFps} FPS). Downscaling quality to ensure smooth rendering...`);
        qualityDowngradedRef.current = true;
        
        // 1. Lower device pixel ratio dynamically to decrease fragment shading workload
        rendererRef.current.setPixelRatio(0.85);
        
        // 2. Disable shadow maps completely to eliminate shadow rendering passes
        rendererRef.current.shadowMap.enabled = false;
        
        // 3. Force scene to redraw with new parameters
        rendererRef.current.shadowMap.needsUpdate = true;
      }
      
      fpsFrameCountRef.current = 0;
      fpsWindowStartRef.current = perfNow;
    }

    // Memory usage logging every 30 seconds (Req 30.2)
    if (perfNow - memLastLogTimeRef.current >= 30_000) {
      const mem = (performance as any).memory;
      if (mem) {
        const usedMB = Math.round(mem.usedJSHeapSize / 1024 / 1024);
        const totalMB = Math.round(mem.totalJSHeapSize / 1024 / 1024);
        console.info(`[Perf] Memory: ${usedMB} MB used / ${totalMB} MB total`);
      }
      memLastLogTimeRef.current = perfNow;
    }
  }, []);

  // ── Three.js setup & VRM load ─────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Dispose previous renderer
    if (rendererRef.current) {
      cancelAnimationFrame(rafRef.current);
      rendererRef.current.dispose();
      rendererRef.current.domElement.parentNode?.removeChild(rendererRef.current.domElement);
    }

    // Dispose previous VRM resources before loading a new model (Req 2.1, 2.3)
    if (vrmRef.current) {
      try { disposeVrmResources(vrmRef.current); } catch (_) { /* ok */ }
      vrmRef.current = null;
    }

    sceneRef.current?.clear();
    adaptivePresetsRef.current = null;
    vrmSceneHiddenRef.current = null; // Reset hidden scene reference
    mixerUpdateCountRef.current = 0; // Reset mixer update counter

    if (!modelUrl) {
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Add transparent floor shadow receiver
    const floorGeom = new THREE.PlaneGeometry(10, 10);
    const floorMat = new THREE.ShadowMaterial({ opacity: 0.35 });
    const floorMesh = new THREE.Mesh(floorGeom, floorMat);
    floorMesh.rotation.x = -Math.PI / 2; // Flat on the ground
    floorMesh.position.y = 0; // Exactly at model's feet
    floorMesh.receiveShadow = true;
    floorMesh.name = 'floor_shadow_receiver';
    scene.add(floorMesh);

    const isMobile = container.clientWidth < 768 || ('ontouchstart' in window);
    isMobileRef.current = isMobile;

    // Initialize environment manager
    environmentManagerRef.current = createEnvironmentManager(scene);
    // Set default cyberpunk environment
    environmentManagerRef.current.setEnvironment('cyberpunk-void');

    // Initialize lighting manager
    lightingManagerRef.current = createLightingManager(scene, isMobile);
    // Set default cyberpunk lighting
    lightingManagerRef.current.updateLighting({
      preset: 'cyberpunk',
      ambientIntensity: 0.8,
      keyLightIntensity: 1.2,
      fillLightIntensity: 0.4,
      rimLightIntensity: 0.3,
      ambientColor: '#88cccc',
      keyLightColor: '#ffffff',
    });

    const camera = new THREE.PerspectiveCamera(
      isMobile ? 38 : 34,
      container.clientWidth / container.clientHeight,
      0.1,
      20,
    );
    camera.position.set(0, isMobile ? 1.0 : 1.05, isMobile ? 1.8 : 1.6);
    camera.lookAt(0, 0.95, 0);
    cameraRef.current = camera;

    // Check WebGL support before attempting to create renderer
    const canvas = document.createElement('canvas');
    const webgl2 = canvas.getContext('webgl2');
    const webgl1 = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!webgl2 && !webgl1) {
      setError('WebGL tidak didukung di browser ini. Coba aktifkan hardware acceleration di pengaturan browser.');
      setLoading(false);
      return;
    }

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isMobile,
        alpha: true,
        powerPreference: 'high-performance',
        // Fallback to WebGL1 if WebGL2 not available
        ...(webgl2 ? {} : { context: webgl1 as WebGLRenderingContext }),
      });
    } catch (e) {
      // Second attempt: minimal settings
      try {
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
      } catch (e2) {
        setError('WebGL tidak dapat diinisialisasi. Pastikan hardware acceleration diaktifkan di browser Anda.');
        setLoading(false);
        return;
      }
    }

    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, computeMaxDpr(isMobile)));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    // Configure tone mapping - but exclude background materials
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    // Configure soft shadows
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Ensure background is always rendered properly
    renderer.autoClear = true;
    renderer.autoClearColor = true;
    renderer.autoClearDepth = true;
    renderer.autoClearStencil = true;
    
    // Set clear color transparent so HTML background layer shows through
    renderer.setClearColor(0x000000, 0);
    
    container.appendChild(renderer.domElement);
    renderer.domElement.style.position = 'relative';
    renderer.domElement.style.zIndex = '1';
    renderer.domElement.style.cursor = 'inherit'; // Ensure it inherits from container
    rendererRef.current = renderer;

    // ── WebGL context loss recovery (Req 29.1, 29.2, 29.3, 29.4) ─────────────
    const handleContextLost = (e: Event) => {
      e.preventDefault(); // Required to allow context restoration
      const activeWin = containerRef.current?.ownerDocument?.defaultView || window;
      activeWin.cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      setWebglContextLost(true);
    };

    const handleContextRestored = () => {
      setWebglContextLost(false);
      // Resume render loop
      clockRef.current = new THREE.Clock();
      clockRef.current.start();
      lastFrameTimeRef.current = performance.now();
      const activeWin = containerRef.current?.ownerDocument?.defaultView || window;
      rafRef.current = activeWin.requestAnimationFrame(animate);
      // Trigger VRM reload by re-loading the current model URL
      // Application state (chat history, settings) lives in Index.tsx parent — naturally preserved (Req 29.5)
      if (modelUrl && vrmRef.current === null) {
        // Model was cleared on context loss; reload by re-triggering the effect
        // The effect re-runs when modelUrl changes, but since it hasn't changed we
        // manually reload the VRM here
        const loader = new GLTFLoader();
        loader.register((parser) => new VRMLoaderPlugin(parser));
        setLoading(true);
        fetchVrmWithCache(modelUrl).then(buffer => {
          loader.parse(
            buffer,
            modelUrl,
            (gltf) => {
              const vrm = gltf.userData.vrm as VRM;
              if (!vrm) { setLoading(false); return; }
              try { VRMUtils.rotateVRM0(vrm); } catch (_) { /* VRM1 */ }
              
              // Traverse mesh children to enable real-time shadows
              vrm.scene.traverse((obj) => {
                if ((obj as THREE.Mesh).isMesh) {
                  obj.castShadow = true;
                  obj.receiveShadow = true;
                  if ((obj as THREE.Mesh).material) {
                    const mats = Array.isArray((obj as THREE.Mesh).material)
                      ? ((obj as THREE.Mesh).material as THREE.Material[])
                      : [(obj as THREE.Mesh).material as THREE.Material];
                    mats.forEach(mat => {
                      mat.shadowSide = THREE.DoubleSide; // Avoid shadow gaps on thin mesh boundaries
                    });
                  }
                }
              });

              vrmSceneHiddenRef.current = vrm.scene;
              vrmRef.current = vrm;
              mixerRef.current = createMixer(vrm);
              initSpringBones(vrm);
              initIdleExpression();
              mixerUpdateCountRef.current = 0;
              setLoading(false);
            },
            (err) => {
              console.error('WebGL Restore Parse error:', err);
              setLoading(false);
            }
          );
        }).catch(err => {
          console.error('WebGL Restore Fetch error:', err);
          setLoading(false);
        });
      }
    };

    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    // OrbitControls (disabled by default)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.95, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = false;
    controls.enabled = false;
    controls.update();
    orbitControlsRef.current = controls;

    // Load VRM
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    setLoading(true);
    fetchVrmWithCache(modelUrl).then(buffer => {
      loader.parse(
        buffer,
        modelUrl,
        (gltf) => {
          const vrm = gltf.userData.vrm as VRM;
          if (!vrm) { setError('File bukan VRM yang valid'); setLoading(false); return; }
          try { VRMUtils.rotateVRM0(vrm); } catch (_) { /* VRM1 */ }
          
          // Traverse mesh children to enable real-time shadows
          vrm.scene.traverse((obj) => {
            if ((obj as THREE.Mesh).isMesh) {
              obj.castShadow = true;
              obj.receiveShadow = true;
              if ((obj as THREE.Mesh).material) {
                const mats = Array.isArray((obj as THREE.Mesh).material)
                  ? ((obj as THREE.Mesh).material as THREE.Material[])
                  : [(obj as THREE.Mesh).material as THREE.Material];
                mats.forEach(mat => {
                  mat.shadowSide = THREE.DoubleSide; // Avoid shadow gaps on thin mesh boundaries
                });
              }
            }
          });

          // DON'T add to scene yet - store it and wait for first VRMA animation
          // This prevents T-pose flash
          vrmSceneHiddenRef.current = vrm.scene;
          vrmRef.current = vrm;
          mixerRef.current = createMixer(vrm);

          // Init spring bones for secondary motion
          initSpringBones(vrm);

          // Setup Headpat hitbox (invisible sphere around head bone)
          const headNode = vrm.humanoid?.getNormalizedBoneNode('head');
          if (headNode) {
            const hitboxGeom = new THREE.SphereGeometry(0.22, 12, 12);
            const hitboxMat = new THREE.MeshBasicMaterial({ visible: false }); 
            const hitboxMesh = new THREE.Mesh(hitboxGeom, hitboxMat);
            hitboxMesh.name = 'headpat_hitbox';
            // Offset sedikit ke atas ubun-ubun kepala (0.1m)
            hitboxMesh.position.set(0, 0.1, 0.02); 
            headNode.add(hitboxMesh);
          }

          // Setup Shoulder Hitboxes
          ['leftUpperArm', 'rightUpperArm'].forEach(bone => {
            const boneNode = vrm.humanoid?.getNormalizedBoneNode(bone as any) || vrm.humanoid?.getBoneNode(bone as any);
            if (boneNode) {
              const hitboxGeom = new THREE.SphereGeometry(0.2, 16, 16);
              // DEBUG: Show red wireframe spheres to verify placement
              const hitboxMat = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true, visible: false, depthTest: false, transparent: true, opacity: 0.1 }); 
              const hitboxMesh = new THREE.Mesh(hitboxGeom, hitboxMat);
              hitboxMesh.name = `shouldertap_hitbox_${bone}`;
              hitboxMesh.position.set(bone === 'leftUpperArm' ? 0.08 : -0.08, 0, 0);
              hitboxMesh.renderOrder = 999;
              boneNode.add(hitboxMesh);
            }
          });

          // Cache hitbox meshes for raycasting — avoids scene traversal on every pointer move
          // Populated once after VRM load; cleared on cleanup/model change
          hitboxMeshesRef.current = [];
          vrm.scene.traverse((child) => {
            if (
              child instanceof THREE.Mesh &&
              (child.name === 'headpat_hitbox' || child.name.startsWith('shouldertap_hitbox'))
            ) {
              hitboxMeshesRef.current.push(child);
            }
          });

          // Init idle expression rotation
          initIdleExpression();
          
          // Debug: log available expressions
          debugExpressionKeys(vrm);

          requestAnimationFrame(() => {
            const presets = computeAdaptivePresets(vrm);
            adaptivePresetsRef.current = presets;
            if (cameraRef.current && !cameraFreeRef.current) {
              const ms = presets['medium-shot'];
              cameraRef.current.position.set(...ms.position);
              cameraRef.current.fov = ms.fov;
              cameraRef.current.updateProjectionMatrix();
              // Initialize base Z from the default preset
              presetBaseZRef.current = ms.position[2];
              if (orbitControlsRef.current) {
                orbitControlsRef.current.target.set(...ms.target);
                orbitControlsRef.current.update();
              } else {
                cameraRef.current.lookAt(...ms.target);
              }
            }
          });

          setLoading(false);
        },
        (err) => {
          setError(`Gagal memuat model VRM: ${(err as Error).message ?? err}`);
          setLoading(false);
        }
      );
    }).catch(err => {
      setError(`Gagal mengunduh model VRM: ${(err as Error).message ?? err}`);
      setLoading(false);
    });
    clockRef.current = new THREE.Clock();
    clockRef.current.start();
    lastFrameTimeRef.current = performance.now();
    frameCountRef.current = 0;
    const loaderWin = containerRef.current?.ownerDocument?.defaultView || window;
    rafRef.current = loaderWin.requestAnimationFrame(animate);

    // Init look-at mouse tracking — desktop only (no mouse on mobile)
    const cleanupLookAt = isMobile ? () => {} : initLookAt(container);

    const onResize = () => {
      if (!container || !renderer || !camera) return;
      
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width <= 0 || height <= 0) return; // Avoid WebGL crashes when collapsed/zero-sized

      const wasMobile = isMobileRef.current;
      const isCurrentlyPiP = container.ownerDocument !== document;
      const nowMobile = !isCurrentlyPiP && (width < 768 || ('ontouchstart' in window));
      isMobileRef.current = nowMobile;

      if (vrmRef.current && wasMobile !== nowMobile && adaptivePresetsRef.current) {
        adaptivePresetsRef.current = computeAdaptivePresets(vrmRef.current);
      }
      
      // Update lighting manager for mobile/desktop changes
      if (wasMobile !== nowMobile && lightingManagerRef.current) {
        lightingManagerRef.current.setMobileMode(nowMobile);
      }
      
      // Update camera settings
      if (!cameraFreeRef.current && adaptivePresetsRef.current) {
        const p = adaptivePresetsRef.current['medium-shot'];
        camera.position.set(...p.position);
        camera.fov = p.fov;
        camera.lookAt(...p.target);
        orbitControlsRef.current?.target.set(...p.target);
      }
      
      // Update camera aspect ratio and renderer size
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      
      // Ensure background is still visible after resize
      if (environmentManagerRef.current && sceneRef.current) {
        // Force background refresh to ensure it's still visible
        const currentBg = sceneRef.current.background;
        if (currentBg) {
          // Trigger a re-render to ensure background is visible
          renderer.render(sceneRef.current, camera);
        }
      }
      
      const targetWin = container.ownerDocument.defaultView || window;
      if (wasMobile !== nowMobile) {
        renderer.setPixelRatio(Math.min(targetWin.devicePixelRatio || 1, computeMaxDpr(nowMobile)));
        // Disable look-at on mobile, re-enable on desktop
        setLookAtEnabled(!nowMobile);
      }
      orbitControlsRef.current?.handleResize?.();
    };

    const activeDoc = container.ownerDocument;
    const observerWin = activeDoc.defaultView || window;
    const onVisibility = () => { isVisibleRef.current = activeDoc.visibilityState === 'visible'; };

    // Use ResizeObserver to monitor the container size changes (works in any window/PiP document)
    const resizeObserver = new ResizeObserver(() => {
      onResize();
    });
    resizeObserver.observe(container);

    activeDoc.addEventListener('visibilitychange', onVisibility);

    return () => {
      resizeObserver.disconnect();
      activeDoc.removeEventListener('visibilitychange', onVisibility);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
      cleanupLookAt();
      observerWin.cancelAnimationFrame(rafRef.current);
      if (cameraAnimationRef.current) observerWin.cancelAnimationFrame(cameraAnimationRef.current);

      // Clear hitbox mesh cache (Req 26.2)
      hitboxMeshesRef.current = [];

      // Dispose VRM model — geometry, materials, textures (Req 2.2, 2.3, 13.1)
      const vrm = vrmRef.current;
      if (vrm) {        try { disposeVrmResources(vrm); } catch (_) { /* ok */ }
        vrmRef.current = null;
      }

      // Dispose hidden scene if model never became visible
      if (vrmSceneHiddenRef.current) {
        vrmSceneHiddenRef.current.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry?.dispose();
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            mats.forEach((m) => { if (m) disposeMaterial(m); });
          }
        });
        vrmSceneHiddenRef.current = null;
      }

      // Clear mixer
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
        mixerRef.current.uncacheRoot(mixerRef.current.getRoot());
        mixerRef.current = null;
      }

      // Dispose all scene objects — geometry, materials, textures (Req 2.2, 2.4, 13.1)
      if (sceneRef.current) {
        disposeSceneObjects(sceneRef.current);
        sceneRef.current.clear();
      }

      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.parentNode?.removeChild(renderer.domElement);
      orbitControlsRef.current?.dispose();
      orbitControlsRef.current = null;
      environmentManagerRef.current?.dispose();
      environmentManagerRef.current = null;
      lightingManagerRef.current?.dispose();
      lightingManagerRef.current = null;

      // Clear window debug refs
      if (typeof window !== 'undefined') {
        delete (window as any).scene;
        delete (window as any).camera;
        delete (window as any).renderer;
        delete (window as any).environmentManager;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelUrl]);

  const [affection, setAffection] = useState(() => parseInt(localStorage.getItem('vrm.affection') || '0', 10));
  const [affectionGainTick, setAffectionGainTick] = useState(0);
  const pointerSpeedY = useRef(0);
  const lastPointerY = useRef(0);
  const isPattingRef = useRef(false);
  const lastHeadpatTriggerTime = useRef(0); // Track last headpat trigger locally
  const lastAffectionGainTime = useRef(0); // Cooldown for persistent interaction gain
  const lastShoulderTapTime = useRef(0); // Track last shoulder tap trigger
  const hasPlayedSoundThisSession = useRef(false); // Track if sound already played in current patting session
  const [isShaking, setIsShaking] = useState(false);
  const isHoveringHitboxRef = useRef(false); // Ref for hitbox hover state (no React re-render)
  const [isPatting, setIsPatting] = useState(false);
  
  // Raycasting throttle and cache
  const lastRaycastTimeRef = useRef(0); // Timestamp of last raycast for throttle
  const hitboxMeshesRef = useRef<THREE.Mesh[]>([]); // Cached hitbox meshes (populated after VRM load)
  
  // HUD & Mood state
  const [currentMoodName, setCurrentMoodName] = useState('neutral');
  const lastMoodRef = useRef('neutral');

  // Affection Sync — persisted on profiles.affection
  useEffect(() => {
    if (!userId) return;
    supabase
      .from('profiles')
      .select('affection')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        const val = typeof data?.affection === 'number' ? data.affection : 0;
        setAffection(val);
        localStorage.setItem('vrm.affection', val.toString());
      });
  }, [userId]);

  const lastSavedAffection = useRef(affection);
  const saveToSupabase = useCallback(async (val: number) => {
    if (!userId) return;
    try {
      await supabase
        .from('profiles')
        .update({ affection: val })
        .eq('user_id', userId);
      lastSavedAffection.current = val;
    } catch (e) {
      // silent fail
    }
  }, [userId]);

  const saveAffection = (addAmount: number) => {
    setAffection(prev => {
      const oldLevel = Math.floor(prev / 100);
      const newVal = prev + addAmount;
      const newLevel = Math.floor(newVal / 100);
      
      if (newLevel > oldLevel && newLevel >= 1) {
        onLevelUp?.(newLevel);
      }
      
      localStorage.setItem('vrm.affection', newVal.toString());
      
      // Throttle DB sync: sync every 5 points or every level-up
      if (Math.abs(newVal - lastSavedAffection.current) >= 5 || newLevel > oldLevel) {
        saveToSupabase(newVal);
      }
      
      return newVal;
    });
    // Trigger floating +1 animation on HUD bar
    setAffectionGainTick(t => t + 1);
  };

  const syncAffectionFromChat = useCallback(() => {
    if (isSpeaking && currentMessage && currentMessage.length > 5) {
      saveAffection(1); // Bertambah 1 tiap bicara
    }
  }, [isSpeaking, currentMessage]);

  useEffect(() => { syncAffectionFromChat(); }, [isSpeaking]);

  const handlePointerMoveHitbox = (e: React.PointerEvent<HTMLDivElement>) => {
    if (cameraFreeRef.current || !cameraRef.current || !sceneRef.current) return;

    const container = containerRef.current;
    if (!container) return;

    // Throttle raycasting to max 30x/sec using timestamp comparison (Req 26.4)
    const now = performance.now();
    if (shouldThrottleRaycast(lastRaycastTimeRef.current, now)) return;
    lastRaycastTimeRef.current = now;

    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const rc = new THREE.Raycaster();
    rc.setFromCamera({ x, y }, cameraRef.current);

    // Use cached hitbox meshes — avoids scene traversal on every pointer move (Req 26.2)
    const allHitMeshes = hitboxMeshesRef.current;

    const intersects = rc.intersectObjects(allHitMeshes);
    const isHit = intersects.length > 0;
    isHoveringHitboxRef.current = isHit;

    // Direct DOM update for cursor — avoids React re-render (Req 26.3)
    container.style.cursor = isHit ? (isPattingRef.current ? 'grabbing' : 'pointer') : 'default';

    if (e.buttons !== 1) {
      // If not dragging, but we WERE patting (unlikely but safe), clean up
      if (isPattingRef.current) {
        isPattingRef.current = false;
        setIsPatting(false);
        setLookAtEnabled(true);
        container.style.cursor = isHit ? 'pointer' : 'default';
      }
      return; 
    }

    const deltaY = e.clientY - lastPointerY.current;
    lastPointerY.current = e.clientY;
    
    // Akumulasi speed patokan y (sapuan atas-bawah)
    pointerSpeedY.current += Math.abs(deltaY);

    if (isHit) {
      const hitObj = intersects[0].object;
      const name = hitObj.name;
      
      if (name === 'headpat_hitbox') {
        if (!isPattingRef.current) {
          isPattingRef.current = true;
          setIsPatting(true);
          hasPlayedSoundThisSession.current = false; // Reset flag when starting new patting session
          forceNeutral(true); // Lerp back to center smoothly
        }
        
        const sensitivity = parseInt(localStorage.getItem('vrm.interactionSensitivity') || '20');
        
        // Check if speed threshold is met for interaction gain
        if (pointerSpeedY.current > sensitivity) {
          pointerSpeedY.current = 0; // RESET SPEED
          const now = Date.now();

          // Increment Affection on sustained interaction (Throttled)
          if (now - lastAffectionGainTime.current > INTERACTION.affectionThrottle) {
            lastAffectionGainTime.current = now;
            saveAffection(1); // Gain 1 affection point per second of patting
          }
          
          // Audio & major effects: only once per session
          const HEADPAT_COOLDOWN = INTERACTION.headpatCooldown;
          if (!hasPlayedSoundThisSession.current && 
              (now - lastHeadpatTriggerTime.current) > HEADPAT_COOLDOWN && 
              vrmRef.current) {
            
            hasPlayedSoundThisSession.current = true; // Mark sound as played for this session
            lastHeadpatTriggerTime.current = now; // Update last trigger time
            
            // Subtle camera shake on headpat
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 150);
            
            // Show smiling face only
            applyMoodOverride('happy', 3, vrmRef.current);
          }
        }
      } else if (name.startsWith('shouldertap_hitbox')) {
        // --- Shoulder Tap Reaction (on move - subtle) ---
      }
    } else {
      isHoveringHitboxRef.current = false;
      if (isPattingRef.current) {
        isPattingRef.current = false;
        setIsPatting(false);
        hasPlayedSoundThisSession.current = false; // Reset flag when patting session ends
        setLookAtEnabled(true);
      }
    }
  };

  // --- Ambient Particles Data (Memoized to prevent jitter on re-render) ---
  const ambientParticles = useMemo(() => {
    return {
      sakura: Array.from({ length: 30 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: Math.random() * 12 + 8,
        duration: Math.random() * 8 + 8,
        delay: Math.random() * 10
      })),
      rain: Array.from({ length: 40 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        duration: Math.random() * 1 + 1.5,
        delay: Math.random() * -5
      })),
      snow: Array.from({ length: 60 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: Math.random() * 5 + 3,
        duration: Math.random() * 10 + 5,
        delay: Math.random() * -15 // Negative delay to scatter
      })),
      leaves: Array.from({ length: 25 }).map((_, i) => ({
        id: i,
        left: Math.random() * 120,
        size: Math.random() * 15 + 10,
        duration: Math.random() * 8 + 6,
        delay: Math.random() * -10 // Negative delay to scatter
      }))
    };
  }, []);

  return (
    <div ref={containerRef} 
         className={`relative w-full h-full overflow-hidden ${isShaking ? 'animate-vibrate-subtle' : ''} ${className ?? ''}`}
         onPointerMove={handlePointerMoveHitbox}
         onPointerUp={() => {
           if (containerRef.current) {
             containerRef.current.style.cursor = isHoveringHitboxRef.current ? 'pointer' : 'default';
           }
           if (isPattingRef.current) {
             isPattingRef.current = false;
             setIsPatting(false);
             hasPlayedSoundThisSession.current = false; // Reset flag when mouse released
             forceNeutral(false); // Resume following mouse
           }
         }}
         onPointerDown={(e) => { 
            lastPointerY.current = e.clientY; 
            // Update cursor immediately on click
            if (isHoveringHitboxRef.current && containerRef.current) {
              containerRef.current.style.cursor = 'grabbing';
            }
            pointerSpeedY.current = 0; 
            if (cameraRef.current && sceneRef.current) {
              const container = containerRef.current;
              if (!container) return;
              const rect = container.getBoundingClientRect();
              const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
              const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
              const rc = new THREE.Raycaster();
              rc.setFromCamera({ x, y }, cameraRef.current);
              const interactableMeshes: THREE.Mesh[] = [];
              sceneRef.current.traverse(child => {
                if (child.name === 'headpat_hitbox' || child.name.startsWith('shouldertap_hitbox')) {
                  interactableMeshes.push(child as THREE.Mesh);
                }
              });
              
              const intersects = rc.intersectObjects(interactableMeshes, true);
              if (intersects.length > 0) {
                const hitObj = intersects[0].object;
                const name = hitObj.name;
                const ex = e.clientX;
                const ey = e.clientY;

                // Priority: If hitting head, ignore everything else (it's a pat start)
                if (name === 'headpat_hitbox') {
                  return; 
                }

                if (name.startsWith('shouldertap_hitbox') && !isPattingRef.current) {
                  const now = Date.now();
                  const SHOULDER_TAP_COOLDOWN = 3000; // 3 seconds cooldown between shoulder taps (prevents spam)
                  
                  if ((now - lastShoulderTapTime.current) <= SHOULDER_TAP_COOLDOWN) {
                    // Still on cooldown — show feedback
                    const remaining = Math.ceil((SHOULDER_TAP_COOLDOWN - (now - lastShoulderTapTime.current)) / 1000);
                    toast(`Tunggu ${remaining}s…`, { duration: 800, position: 'top-center', style: { fontSize: '11px', padding: '4px 10px', minWidth: 'unset' } });
                    return;
                  }
                  
                  if ((now - lastShoulderTapTime.current) > SHOULDER_TAP_COOLDOWN && vrmRef.current) {                    lastShoulderTapTime.current = now; // Update last trigger time
                    
                    saveAffection(1);
                    
                    // Show smiling face only
                    applyMoodOverride('happy', 2, vrmRef.current);
                    
                    // Visual screen shake
                    setIsShaking(true);
                    setTimeout(() => setIsShaking(false), 200);
                    
                      const reactionClips = clips.filter(c => c.category === 'reaction');
                      if (reactionClips.length > 0) {
                        const clip = reactionClips[Math.floor(Math.random() * reactionClips.length)];
                        playVrmaUrl(clip.url, { loop: false, fadeIn: 1.0 }).catch(() => {});
                      }
                  }
                }
              }
            }
          }}>
          
          {!isCurrentlyPiP && (
            <HolographicHud 
              affection={affection} 
              currentMood={currentMoodName} 
              isSpeaking={isSpeaking}
              fps={isMobileRef.current ? 30 : 60}
              isAnimating={!!vrmaActionRef.current || isTalkingPlayingRef.current}
              getAudioLevel={getAudioLevelRef.current ?? undefined}
              affectionGainTick={affectionGainTick}
            />
          )}

          {/* Ambient Aura Rendering */}
      {ambientEffect !== 'none' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-10" aria-hidden="true">
          {ambientEffect === 'sakura' && ambientParticles.sakura.map(p => (
            <div key={p.id} className="sakura-petal" style={{
              left: `${p.left}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animation: `sakura-fall ${p.duration}s linear ${p.delay}s infinite`,
            }} />
          ))}
          {ambientEffect === 'rain' && ambientParticles.rain.map(p => (
            <div key={p.id} className="rain-drop" style={{
              left: `${p.left}%`,
              animation: `rain-fall ${p.duration}s linear ${p.delay}s infinite`,
            }} />
          ))}
          {ambientEffect === 'snow' && ambientParticles.snow.map(p => (
            <div key={p.id} className="snow-flake" style={{
              left: `${p.left}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animation: `snow-fall ${p.duration}s linear ${p.delay}s infinite`,
            }} />
          ))}
          {ambientEffect === 'leaves' && ambientParticles.leaves.map(p => (
            <div key={p.id} className="leaf-particle" style={{
              left: `${p.left}%`,
              width: `${p.size}px`,
              height: `${p.size * 0.7}px`,
              animation: `leaves-fall ${p.duration}s linear ${p.delay}s infinite`,
            }} />
          ))}
        </div>
      )}

      {/* HTML image background — crossfade transition */}
      {prevBgImageUrl && prevBgImageUrl !== bgImageUrl && (
        <img
          key={`prev-${prevBgImageUrl}`}
          src={prevBgImageUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
          style={{ zIndex: 0, animation: 'bgFadeOut 0.4s ease-in forwards' }}
          onAnimationEnd={() => setPrevBgImageUrl(null)}
        />
      )}
      {bgImageUrl && (
        <img
          key={bgImageUrl}
          src={bgImageUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
          style={{ zIndex: 0, animation: 'bgFadeIn 0.4s ease-out forwards' }}
        />
      )}
      {!modelUrl && !loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center px-6">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.25)' }}>
              <span className="text-3xl">🤖</span>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-white/70">Belum ada model VRM</p>
              <p className="text-xs text-white/35">Upload model di menu Pengaturan</p>
            </div>
          </div>
        </div>
      )}
      {loading && modelUrl && (
        <div className="absolute inset-0 flex items-center justify-center z-10"
          style={{ background: 'rgba(6,4,14,0.85)', backdropFilter: 'blur(8px)' }}>
          <div className="flex flex-col items-center gap-5 text-center px-6">

            {/* Animated VRM logo / orb */}
            <div className="relative w-20 h-20">
              {/* Outer ring */}
              <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" style={{ animationDuration: '2s' }} />
              {/* Spinning ring */}
              <div className="absolute inset-1 rounded-full border-2 border-t-primary border-r-primary/40 border-b-transparent border-l-transparent animate-spin" style={{ animationDuration: '1s' }} />
              {/* Inner glow orb */}
              <div className="absolute inset-3 rounded-full flex items-center justify-center"
                style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.3) 0%, rgba(88,28,135,0.15) 100%)', boxShadow: '0 0 20px rgba(168,85,247,0.4)' }}>
                <span className="text-2xl">🤖</span>
              </div>
            </div>

            {/* Text */}
            <div className="space-y-1.5">
              <p className="text-sm font-semibold text-white/90 tracking-wide">Memuat Model VRM</p>
              <p className="text-xs text-white/40">Menyiapkan karakter 3D kamu…</p>
            </div>

            {/* Animated dots progress */}
            <div className="flex items-center gap-1.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-primary/60"
                  style={{
                    animation: 'loading-dot 1.4s ease-in-out infinite',
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
              ))}
            </div>
          </div>

          <style>{`
            @keyframes loading-dot {
              0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
              40% { transform: scale(1); opacity: 1; }
            }
          `}</style>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="flex flex-col items-center gap-3 text-center max-w-xs">
            <span className="text-2xl">⚠️</span>
            <span className="text-sm text-destructive font-mono">{error}</span>
            {error.toLowerCase().includes('webgl') && (
              <a
                href="https://get.webgl.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary underline"
              >
                Cek dukungan WebGL browser Anda
              </a>
            )}
          </div>
        </div>
      )}

      {/* WebGL context loss recovery overlay (Req 29.2) */}
      {webglContextLost && (
        <div className="absolute inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(6,4,14,0.92)', backdropFilter: 'blur(8px)' }}>
          <div className="flex flex-col items-center gap-5 text-center px-6 max-w-xs">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 rounded-full border-2 border-yellow-500/30 animate-ping" style={{ animationDuration: '2s' }} />
              <div className="absolute inset-3 rounded-full flex items-center justify-center"
                style={{ background: 'radial-gradient(circle, rgba(234,179,8,0.2) 0%, rgba(120,90,0,0.1) 100%)', boxShadow: '0 0 20px rgba(234,179,8,0.3)' }}>
                <span className="text-2xl">⚡</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-semibold text-white/90 tracking-wide">Memulihkan WebGL…</p>
              <p className="text-xs text-white/50">Konteks grafis hilang. Sedang memulihkan otomatis…</p>
              <p className="text-xs text-white/30 mt-2">Jika tidak pulih, coba muat ulang halaman.</p>
            </div>
          </div>
        </div>
      )}

      {/* Performance debug overlay — only visible when ?debug=true (Req 30.5) */}
      {!isCurrentlyPiP && <PerformanceOverlay rendererRef={rendererRef} />}

      {/* Companion HUD Overlay (Lovometer & Cinematic Subtitles) */}
      {/* UI Overlay Layer */}
      <div ref={constraintsRef} className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between overflow-hidden">
        
        {/* Top Header Region (Empty, keeping for structure/padding if needed) */}
        <div className="absolute top-0 left-0 right-0 pointer-events-none h-16" />

        {/* Floating Draggable Subtitle */}
        {showSubtitles && isSpeaking && currentMessage && !isCurrentlyPiP && (
          <div className="absolute bottom-32 left-0 right-0 px-4 flex justify-center pointer-events-none z-30 animate-fade-in">
            <motion.div
              drag
              dragMomentum={false}
              dragConstraints={constraintsRef}
              className="group px-5 py-3.5 rounded-2xl cyber-glass border border-primary/20 backdrop-blur-md text-center shadow-2xl relative max-w-[90%] md:max-w-2xl bg-black/55 pointer-events-auto cursor-grab active:cursor-grabbing select-none"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent opacity-30 rounded-2xl pointer-events-none" />
              
              {/* Drag handle & customizing header (visible on hover) */}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1 rounded-full bg-black/80 border border-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs pointer-events-auto">
                <GripHorizontal className="w-3.5 h-3.5 text-primary/60 cursor-grab" />
                <span className="text-[10px] text-muted-foreground mr-1">Subtitle</span>
                <button 
                  onClick={handleDecreaseSize}
                  className="p-0.5 rounded hover:bg-white/10 text-muted-foreground hover:text-white"
                  title="Kecilkan teks"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-[10px] font-mono text-primary/80">{subtitleSize}px</span>
                <button 
                  onClick={handleIncreaseSize}
                  className="p-0.5 rounded hover:bg-white/10 text-muted-foreground hover:text-white"
                  title="Besarkan teks"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              <p 
                style={{ fontSize: `${subtitleSize}px` }}
                className="text-white font-medium tracking-wide drop-shadow-lg relative z-10 leading-relaxed whitespace-pre-wrap break-words text-center min-h-[3rem] flex items-center justify-center pointer-events-none"
              >
                {(() => {
                  const totalLength = currentMessage.length;
                  let duration = speechTotalDuration;
                  
                  // Fallback for streaming audio where duration is Infinity or 0
                  if (!duration || duration === Infinity) {
                    duration = Math.max(totalLength / 15, 1.5); // ~15 chars per sec
                  }
                  
                  const progress = Math.min(1, speechProgressTime / duration);
                  const activeCharIndex = Math.min(totalLength, Math.floor(progress * totalLength));
                  const visibleText = currentMessage.slice(0, activeCharIndex);

                  return (
                    <span>
                      {visibleText}
                      {activeCharIndex < totalLength && (
                        <span className="inline-block w-1.5 h-4 bg-primary ml-1 align-middle animate-pulse neon-glow-purple-strong shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                      )}
                    </span>
                  );
                })()}
              </p>
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent shadow-[0_0_8px_#a855f7] pointer-events-none" />
            </motion.div>
          </div>
        )}
      </div>

    </div>
  );
});

export default memo(VrmViewer);

