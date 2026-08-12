# VRM Advanced Features Implementation Plan

## 🎯 Tujuan
Mengintegrasikan fitur-fitur advanced dari AIVRM ke Niutron:
1. **Lip Sync dengan Audio Analysis** - Gerakan mulut sinkron dengan TTS
2. **VRMA Animations** - Gesture animations (talking, idle, etc)
3. **Mood Detection** - Expression otomatis berdasarkan sentiment
4. **Auto Blink** - Natural blinking dengan timing biomechanical
5. **Idle Expressions** - Micro-expressions saat idle

## 📊 Fitur Yang Sudah Ada di AIVRM

### 1. Lip Sync System (`vrm-animations.ts`)

**Features:**
- **Dual Mode Support**: Perfect Sync (52 ARKit blendshapes) + Standard VRM
- **Audio Analysis**: Frequency data untuk gerakan mulut yang natural
- **Viseme Cycling**: Rotasi antar bentuk mulut (aa, ih, ou, ee, oh)
- **Asymmetric Smoothing**: Buka cepat (fast), tutup lambat (slow) - natural!
- **Jaw Open Integration**: Independent JawOpen driver
- **Cross-blending**: Smooth transition antar visemes

**Key Functions:**
```typescript
updateLipSync(
  audioLevel: number,
  vrm: VRM,
  delta: number,
  freqData?: Uint8Array
): void
```

**Algorithm:**
1. Analyze audio frequency (mid & high bands)
2. Smooth audio level (asymmetric - fast open, slow close)
3. Power curve compression (low sounds barely move mouth)
4. Cycle through visemes dengan random duration
5. Cross-blend current & next viseme
6. Apply to VRM blendshapes

### 2. Auto Blink System

**Features:**
- **Biomechanical Timing**: 
  - Close: 100-160ms
  - Hold: 60-140ms
  - Open: 200-280ms
- **Gamma Distribution**: Natural interval timing (tidak uniform)
- **Blink Bursts**: 72% single, 20% double, 8% triple blinks
- **Partial Blinks**: 15% hanya 50-80% tutup
- **Speaking Mode**: Interval lebih panjang saat TTS

**Key Functions:**
```typescript
updateBlink(delta: number, vrm: VRM): void
setBlinkSpeakingMode(speaking: boolean): void
```

**States:**
- `idle` → Waiting for next blink
- `closing` → Ease-in quadratic curve
- `closed` → Hold duration
- `opening` → Ease-out cubic curve + slight overshoot
- `inter` → Gap between burst blinks (180ms)

### 3. Mood System

**17 Mood Presets:**
```typescript
'neutral' | 'happy' | 'sad' | 'excited' | 'sympathetic' | 
'bored' | 'curious' | 'thinking' | 'angry' | 'laughing' | 
'surprised' | 'embarrassed' | 'disgusted' | 'fearful' | 
'tense' | 'romantic' | 'proud' | 'confused'
```

**Features:**
- **Dual Mode**: Perfect Sync (detailed) + Standard VRM (simple)
- **Smooth Lerp**: Transition speed 1.2
- **Idle Rotation**: Auto-change mood setiap 4-8 detik
- **Sentiment Detection**: Detect mood from text

**Key Functions:**
```typescript
setTargetMood(mood: MoodName): void
updateMicroExpressions(elapsed: number, vrm: VRM, delta: number): void
```

### 4. VRMA Animation System (`vrma-player.ts`)

**Features:**
- Load VRMA files (VRM Animation format)
- Play gestures: talking, idle, hand waves, etc
- Loop management
- Fade in/out transitions
- Multiple animation clips

**Key Functions:**
```typescript
playVRMA(
  mixer: THREE.AnimationMixer,
  clip: THREE.AnimationClip,
  opts?: PlayVrmaOptions
): THREE.AnimationAction | null
```

## 🔧 Implementasi ke Niutron

### Step 1: Copy Library Files dari AIVRM

**Files to Copy:**
```
aivrm/src/lib/vrm-animations.ts       → Brahma-Echo/core/vrm/vrm-animations.ts
aivrm/src/lib/vrma-player.ts           → Brahma-Echo/core/vrm/vrma-player.ts
aivrm/src/lib/sentiment.ts             → Brahma-Echo/core/vrm/sentiment.ts
aivrm/src/lib/idle-expression-advanced.ts → Brahma-Echo/core/vrm/idle-expressions.ts
```

### Step 2: Convert TypeScript ke Python

**Option A: Keep TypeScript (Recommended)**
- Files tetap dalam format `.ts`
- Load via JavaScript di HTML VRM viewer
- Python hanya trigger via JavaScript calls

**Option B: Port ke Python**
- Convert logic ke Python
- Implementasi di `core/vrm_animations.py`
- Lebih terintegrasi tapi butuh effort besar

### Step 3: Update HTML VRM Viewer

**Add to `index_working.html`:**
```html
<script type="module" src="./vrm-animations.js"></script>
<script type="module" src="./vrma-player.js"></script>
<script type="module" src="./sentiment.js"></script>
```

**Or Inline:**
Embed semua logic langsung di HTML (lebih simple untuk Qt WebEngine)

### Step 4: Python Integration

**Update `BackgroundWidget`:**
```python
def start_speaking(self):
    """Start lip sync with audio analysis"""
    js_code = """
    if (window.vrmAPI && window.vrmAPI.startLipSync) {
        // Get audio context
        const audioCtx = new AudioContext();
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        
        // Start lip sync loop
        window.vrmAPI.startLipSync(analyser);
    }
    """
    self._web_view.page().runJavaScript(js_code)

def update_mood(self, text: str):
    """Update VRM mood based on text sentiment"""
    # Simple Python sentiment detection
    mood = detect_mood_simple(text)
    
    js_code = f"""
    if (window.vrmAPI && window.vrmAPI.setMood) {{
        window.vrmAPI.setMood('{mood}');
    }}
    """
    self._web_view.page().runJavaScript(js_code)
```

## 📝 Implementation Plan (Prioritized)

### Phase 1: Basic Lip Sync ✅ (ALREADY DONE)
- [x] Simple lip sync dengan random levels
- [x] Start/stop speaking triggers
- [x] Basic mouth movements

### Phase 2: Advanced Lip Sync (HIGH PRIORITY)
- [ ] Copy `vrm-animations.ts` lip sync functions
- [ ] Integrate audio analysis (frequency data)
- [ ] Implement viseme cycling
- [ ] Test dengan TTS audio

**Estimated Time**: 2-3 hours

### Phase 3: Auto Blink (HIGH PRIORITY)
- [ ] Implement biomechanical blink timing
- [ ] Add blink bursts (single/double/triple)
- [ ] Partial blinks
- [ ] Speaking mode (reduced blink rate)

**Estimated Time**: 1-2 hours

### Phase 4: Mood System (MEDIUM PRIORITY)
- [ ] Implement 17 mood presets
- [ ] Sentiment detection from text
- [ ] Smooth mood transitions
- [ ] Idle mood rotation

**Estimated Time**: 2-3 hours

### Phase 5: VRMA Animations (LOW PRIORITY)
- [ ] VRMA file loader
- [ ] Gesture animations (wave, nod, etc)
- [ ] Talking animations
- [ ] Idle animations

**Estimated Time**: 3-4 hours

## 🚀 Quick Win: Inline Implementation

**Fastest approach** - Inline semua di `index_working.html`:

### 1. Add Lip Sync Function

```javascript
// In index_working.html, add to window.vrmAPI:

startLipSync: function() {
    if (!currentVRM || lipSyncActive) return;
    lipSyncActive = true;
    
    // Simple viseme cycle
    const visemes = ['aa', 'ih', 'ou', 'ee', 'oh'];
    let currentViseme = 0;
    let visemeTimer = 0;
    const visemeDuration = 0.15;
    
    function updateLipSyncFrame(delta) {
        if (!lipSyncActive) return;
        
        // Cycle visemes
        visemeTimer += delta;
        if (visemeTimer >= visemeDuration) {
            visemeTimer = 0;
            currentViseme = (currentViseme + 1) % visemes.length;
        }
        
        // Get audio level (if available)
        const level = getAudioLevel ? getAudioLevel() : 0.5;
        
        // Apply to VRM
        if (currentVRM && currentVRM.expressionManager) {
            // Reset all
            visemes.forEach(v => {
                try {
                    currentVRM.expressionManager.setValue(v, 0);
                } catch(e) {}
            });
            
            // Set current
            const primary = visemes[currentViseme];
            const secondary = visemes[(currentViseme + 1) % visemes.length];
            
            try {
                currentVRM.expressionManager.setValue(primary, level * 0.7);
                currentVRM.expressionManager.setValue(secondary, level * 0.3);
            } catch(e) {}
            
            // JawOpen
            try {
                currentVRM.expressionManager.setValue('JawOpen', level * 0.3);
            } catch(e) {}
        }
    }
    
    // Integrate into animate loop
    // (call updateLipSyncFrame in animate function)
},

stopLipSync: function() {
    lipSyncActive = false;
    
    // Reset mouth
    if (currentVRM && currentVRM.expressionManager) {
        const visemes = ['aa', 'ih', 'ou', 'ee', 'oh', 'JawOpen'];
        visemes.forEach(v => {
            try {
                currentVRM.expressionManager.setValue(v, 0);
            } catch(e) {}
        });
    }
}
```

### 2. Add Auto Blink

```javascript
// Blink state
let blinkPhase = 'idle'; // idle, closing, closed, opening
let blinkTimer = 0;
let nextBlinkIn = 3;
let blinkValue = 0;

function updateAutoBlinkFrame(delta) {
    if (blinkPhase === 'idle') {
        blinkTimer += delta;
        blinkValue = 0;
        
        if (blinkTimer >= nextBlinkIn) {
            blinkTimer = 0;
            blinkPhase = 'closing';
            // Random next blink: 2-8 seconds
            nextBlinkIn = 2 + Math.random() * 6;
        }
    } else if (blinkPhase === 'closing') {
        blinkTimer += delta;
        const t = Math.min(blinkTimer / 0.15, 1); // 150ms close
        blinkValue = t * t; // Ease-in
        
        if (t >= 1) {
            blinkPhase = 'closed';
            blinkTimer = 0;
        }
    } else if (blinkPhase === 'closed') {
        blinkTimer += delta;
        blinkValue = 1.0;
        
        if (blinkTimer >= 0.08) { // 80ms hold
            blinkPhase = 'opening';
            blinkTimer = 0;
        }
    } else if (blinkPhase === 'opening') {
        blinkTimer += delta;
        const t = Math.min(blinkTimer / 0.25, 1); // 250ms open
        const eased = 1 - Math.pow(1 - t, 3); // Ease-out cubic
        blinkValue = 1.0 * (1 - eased);
        
        if (t >= 1) {
            blinkPhase = 'idle';
            blinkTimer = 0;
            blinkValue = 0;
        }
    }
    
    // Apply blink to VRM
    if (currentVRM && currentVRM.expressionManager) {
        try {
            currentVRM.expressionManager.setValue('blinkLeft', blinkValue);
            currentVRM.expressionManager.setValue('blinkRight', blinkValue);
        } catch(e) {
            // Try alternate names
            try {
                currentVRM.expressionManager.setValue('EyeBlinkLeft', blinkValue);
                currentVRM.expressionManager.setValue('EyeBlinkRight', blinkValue);
            } catch(e2) {}
        }
    }
}

// Add to animate loop:
// updateAutoBlinkFrame(delta);
```

### 3. Add to Animate Loop

```javascript
function animate() {
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta();
    
    // Update controls
    if (controls) controls.update();
    
    // Update VRM
    if (currentVRM) {
        currentVRM.update(delta);
        
        // Auto blink
        updateAutoBlinkFrame(delta);
        
        // Lip sync (if active)
        if (lipSyncActive) {
            updateLipSyncFrame(delta);
        }
    }
    
    // Render
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}
```

## ✅ Testing Checklist

### Lip Sync:
- [ ] Mulut bergerak saat TTS berbicara
- [ ] Viseme berubah-ubah (aa, ih, ou, ee, oh)
- [ ] Level mouth sesuai volume suara
- [ ] JawOpen terintegrasi
- [ ] Berhenti smooth saat TTS selesai

### Auto Blink:
- [ ] Blink setiap 2-8 detik
- [ ] Animasi smooth (close → hold → open)
- [ ] Timing natural (tidak terlalu cepat/lambat)
- [ ] Tidak bentrok dengan lip sync
- [ ] Double blink kadang-kadang muncul

### Mood System:
- [ ] Mood berubah based on text sentiment
- [ ] Transition smooth
- [ ] Expression sesuai mood
- [ ] Tidak glitch saat transition

## 📚 Resources

### AIVRM Files untuk Reference:
- `src/lib/vrm-animations.ts` - Complete implementation
- `src/components/VrmViewer.tsx` - Integration example
- `src/lib/sentiment.ts` - Mood detection
- `src/lib/vrma-player.ts` - Animation system

### Documentation:
- VRM Specification: https://github.com/vrm-c/vrm-specification
- Three-VRM: https://github.com/pixiv/three-vrm
- ARKit Blendshapes: https://developer.apple.com/documentation/arkit/arfaceanchor/blendshapelocation

## 🎯 Priority Order

1. **Auto Blink** (Easiest, biggest visual impact) ⭐⭐⭐
2. **Advanced Lip Sync** (Makes avatar feel alive) ⭐⭐⭐
3. **Mood System** (Adds personality) ⭐⭐
4. **VRMA Animations** (Polish, optional) ⭐

---

**Status**: Ready to Implement
**Next Step**: Add Auto Blink + Advanced Lip Sync to `index_working.html`
**Timeline**: 3-4 hours for Phase 2 & 3
