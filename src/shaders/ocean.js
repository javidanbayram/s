// ─────────────────────────────────────────────────────────────
//  Bioluminescent Memory Ocean — Master Shader System
//  Hyper-Realistic Human Iris (Anatomical Crypts, Furrows & Collarette)
// ─────────────────────────────────────────────────────────────

export const MAX_RIPPLES = 32

// Stefan Gustavson / Ian McEwan 3D Simplex Noise + Cellular & fBM Math
const simplex3D = /* glsl */ `
vec3 mod289(vec3 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x){ return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g  = step(x0.yzx, x0.xyz);
  vec3 l  = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j  = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x  = x_ * ns.x + ns.yyyy;
  vec4 y  = y_ * ns.x + ns.yyyy;
  vec4 h  = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

// 3D curl vector field for zero-gravity fluid levitation
vec3 curlNoise(vec3 p) {
  float e = 0.08;
  float n1 = snoise(p + vec3(0.0, e, 0.0));
  float n2 = snoise(p - vec3(0.0, e, 0.0));
  float n3 = snoise(p + vec3(0.0, 0.0, e));
  float n4 = snoise(p - vec3(0.0, 0.0, e));
  float n5 = snoise(p + vec3(e, 0.0, 0.0));
  float n6 = snoise(p - vec3(e, 0.0, 0.0));

  float x = (n4 - n3) * 0.5 / e;
  float y = (n6 - n5) * 0.5 / e;
  float z = (n2 - n1) * 0.5 / e;
  return vec3(x, y, z);
}

// 2D Fast Voronoi / Cellular noise for iris crypts & lacunae
vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453123);
}

float voronoi2D(vec2 uv) {
  vec2 i = floor(uv);
  vec2 f = fract(uv);
  float minDist = 1.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 neighbor = vec2(float(x), float(y));
      vec2 point = hash2(i + neighbor);
      vec2 diff = neighbor + point - f;
      minDist = min(minDist, length(diff));
    }
  }
  return minDist;
}

// 2D Fractional Brownian Motion (fBM) with 4 octaves for radial fibrous furrows
float fbm2D(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; ++i) {
    v += a * (snoise(vec3(p, 0.0)) * 0.5 + 0.5);
    p = p * 2.1 + vec2(12.3, 45.6);
    a *= 0.5;
  }
  return v;
}
`

export const oceanVertexShader = /* glsl */ `
#define MAX_RIPPLES ${MAX_RIPPLES}

uniform float uTime;
uniform float uSize;
uniform float uPixelRatio;
uniform float uIntro;
uniform float uProgress;             // 0.0 = ocean, 1.0 = zero-g floating droplets
uniform float uFormEye;              // 0.0 = floating, 1.0 = Sama's 3D Iris
uniform float uZoomProgress;         // 0.0 = far, 1.0 = deep microscopic zoom
uniform vec4  uRipples[MAX_RIPPLES]; // xy = (x,z), z = birthTime, w = strength
uniform vec3  uMouse;                // xy = ocean plane (x,z), z = wake energy
uniform vec4  uEyeMouse;             // xyz = 3D world pos on eye plane, w = wake energy

attribute float aRandom;
attribute vec3  aIrisLocal;          // Anatomical 3D coordinates on the iris (concave cone)
attribute vec3  aIrisData;           // x = normalized radius [0,1], y = angle theta, z = fiber striation

varying float vGlow;
varying float vHeight;
varying float vFade;
varying float vRandom;
varying float vProgress;
varying float vFormEye;
varying float vZoomProgress;
varying float vIrisRadius;
varying float vStriation;
varying float vCrypts;
varying float vFurrows;
varying float vGelatinous;
varying float vHippus;

${simplex3D}

const float RIPPLE_LIFE  = 4.2;
const float RIPPLE_SPEED = 1.55;

// Center of Sama's Eye in 3D world space
const vec3 EYE_CENTER = vec3(0.0, 2.2, -1.8);
const float TILT = 0.12; // subtle ~7 degree tilt for cinematic depth

void main() {
  vec3 p = position;
  float t = uTime;

  // ── 1. Calm Bioluminescent Ocean Swell ──────────────────
  float swell = sin(p.x * 0.32 + t * 0.55) * 0.075
              + sin(p.z * 0.47 - t * 0.42 + p.x * 0.12) * 0.06;
  float n1 = snoise(vec3(p.xz * 0.22, t * 0.10)) * 0.17;
  float n2 = snoise(vec3(p.xz * 0.85 + 7.3, t * 0.22)) * 0.035;
  float h  = swell + n1 + n2;

  // ── 2. Expanding Bioluminescent Ripples ──────────────────
  float glow = 0.0;
  for (int i = 0; i < MAX_RIPPLES; i++) {
    vec4 r = uRipples[i];
    float age = t - r.z;
    if (r.w <= 0.0 || age < 0.0 || age > RIPPLE_LIFE) continue;

    float d      = distance(p.xz, r.xy);
    float radius = age * RIPPLE_SPEED;
    float diff   = d - radius;

    float envelope = exp(-diff * diff * 2.6);
    float life     = 1.0 - age / RIPPLE_LIFE;
    life *= life;
    float spread   = 1.0 / (1.0 + radius * 0.55);
    float k        = r.w * life * spread;

    h    += sin(diff * 6.5) * envelope * 0.20 * k;
    glow += envelope * k;
  }

  // ── 3. Ocean Mouse Wake Halo ─────────────────────────────
  float md   = distance(p.xz, uMouse.xy);
  float halo = exp(-md * md * 1.4) * uMouse.z;
  h    += sin(md * 5.5 - t * 4.0) * halo * 0.08;
  glow += halo * 0.85;

  p.y += h;

  // ── 4. Phase 2: Anti-Gravity Levitation & Rise ───────────
  float liftDelay = aRandom * 0.42;
  float pLift = smoothstep(liftDelay, 1.0, uProgress);

  vec3 noiseSeed = vec3(p.x * 0.18 + aRandom * 5.0, t * 0.18 + aRandom * 3.0, p.z * 0.18);
  vec3 turbulence = curlNoise(noiseSeed);

  float riseHeight = (2.8 + aRandom * 3.6) * pLift;
  float floatingBob = sin(t * 1.2 + aRandom * 6.28) * 0.20 * pLift;

  vec3 floatingDisplacement = vec3(
    turbulence.x * 1.6 * pLift - p.x * 0.22 * pLift,
    riseHeight + floatingBob + turbulence.y * 0.8 * pLift,
    turbulence.z * 1.6 * pLift - (p.z + 4.5) * 0.28 * pLift
  );

  vec3 floatingPos = p + floatingDisplacement;

  // ── 5. Phase 3: Anatomical Human Iris (Sama's Eye) ───────
  float rNorm = aIrisData.x;
  float theta = aIrisData.y;

  // A. Micro-Pulsation (Hippus):
  // Physiological pupillary hippus (low-frequency spontaneous pupil oscillation)
  float hippus = sin(t * 0.82) * 0.040 + sin(t * 1.75) * 0.018 - cos(t * 0.35) * 0.014;
  // Dynamic pupil dilation dampens from pupil margin (rNorm=0) to outer limbus (rNorm=1)
  float pupilDilation = 1.0 + hippus * (1.0 - rNorm * 0.82);

  // B. Alive ocular rotation & micro-saccades
  float rotSpeed = 0.045;
  float rotAngle = t * rotSpeed;
  float cosR = cos(rotAngle);
  float sinR = sin(rotAngle);

  // Living micro-tremor in stromal trabeculae
  float tremor = snoise(vec3(aIrisLocal.xy * 3.0, t * 0.38)) * 0.028 * rNorm;

  vec2 pupilDisplaced = aIrisLocal.xy * pupilDilation;
  vec2 rotatedLocal = vec2(
    pupilDisplaced.x * cosR - pupilDisplaced.y * sinR,
    pupilDisplaced.x * sinR + pupilDisplaced.y * cosR
  );
  rotatedLocal += normalize(rotatedLocal + 1e-4) * tremor;

  // C. Shallow concave cone depth + hippus vertical displacement
  float localZ = aIrisLocal.z + hippus * 0.07 * (1.0 - rNorm);

  float cosT = cos(TILT);
  float sinT = sin(TILT);
  float tiltedY = rotatedLocal.y * cosT - localZ * sinT;
  float tiltedZ = rotatedLocal.y * sinT + localZ * cosT;

  vec3 liveIrisPos = vec3(
    EYE_CENTER.x + rotatedLocal.x,
    EYE_CENTER.y + tiltedY,
    EYE_CENTER.z + tiltedZ
  );

  float pullDelay = aRandom * 0.22 + (1.0 - rNorm) * 0.14;
  float pEye = smoothstep(pullDelay, 1.0, uFormEye);

  // Magnetic vortex swirl during geometric transition
  float transitSwirl = sin(pEye * 3.14159265);
  vec3 vortex = vec3(
    -(floatingPos.z - EYE_CENTER.z),
    sin(t * 2.8 + aRandom * 6.28) * 0.35,
    (floatingPos.x - EYE_CENTER.x)
  ) * 0.30 * transitSwirl;

  vec3 finalPos = mix(floatingPos, liveIrisPos + vortex, pEye);

  // ── 6. Magnetic Cursor Interactive Fluid Repulsion ───────
  if (uEyeMouse.w > 0.02 && pEye > 0.05) {
    float eyeDist = distance(finalPos, uEyeMouse.xyz);
    float repelRadius = 0.65;
    if (eyeDist < repelRadius && eyeDist > 1e-4) {
      float repelStrength = pow(1.0 - eyeDist / repelRadius, 2.0) * uEyeMouse.w;
      vec3 repelDir = normalize(finalPos - uEyeMouse.xyz);
      float repelWave = sin(eyeDist * 18.0 - t * 9.0) * 0.04 * repelStrength;
      finalPos += repelDir * (repelStrength * 0.42 + repelWave) * pEye;
      glow += repelStrength * 1.6 * pEye;
    }
  }

  // ── 7. Anatomical Iris Shader Properties ──────────────────
  // Voronoi crypts: cellular lacunae in polar space
  vec2 polarCryptUV = vec2(rNorm * 10.5, (theta / 3.14159265 + 1.0) * 14.0);
  float cryptNoise = voronoi2D(polarCryptUV);

  // Radial furrows: FBM fibrous lines & concentric contraction rings
  vec2 polarFurrowUV = vec2(rNorm * 28.0, (theta / 3.14159265 + 1.0) * 24.0);
  float fbmFurrow = fbm2D(polarFurrowUV);
  float furrowNoise = sin(rNorm * 38.0 + fbmFurrow * 4.2);

  // Layered gelatinous depth measure
  float gelatinousDepth = 0.5 + 0.5 * sin(localZ * 14.0 + fbmFurrow * 2.5);

  // ── 8. Projection & Dynamic Particle Sizing ──────────────
  vec4 mv = modelViewMatrix * vec4(finalPos, 1.0);
  gl_Position = projectionMatrix * mv;

  float crest = smoothstep(0.10, 0.32, h);
  float oceanSizeMult = (1.0 + glow * 1.6 + crest * 0.30) * (1.0 + pLift * 0.65);
  float irisSizeMult  = 1.95 + aRandom * 1.15;
  float sizeMultiplier = mix(oceanSizeMult, irisSizeMult, pEye);

  // LOD Zoom crossfade: particles gently shrink in zoom focus to yield to micro-text
  float zoomShrink = mix(1.0, 0.48, uZoomProgress * pEye);
  sizeMultiplier *= zoomShrink;

  float size = uSize * (0.85 + aRandom * 0.65) * sizeMultiplier;
  gl_PointSize = size * uPixelRatio / max(-mv.z, 0.35);

  vGlow         = glow + pLift * (0.75 + 0.45 * aRandom);
  vHeight       = finalPos.y;
  vRandom       = aRandom;
  vProgress     = pLift;
  vFormEye      = pEye;
  vZoomProgress = uZoomProgress;
  vIrisRadius   = rNorm;
  vStriation    = aIrisData.z;
  vCrypts       = cryptNoise;
  vFurrows      = furrowNoise;
  vGelatinous   = gelatinousDepth;
  vHippus       = hippus;
  vFade         = 1.0 - smoothstep(14.0, 48.0, -mv.z);
}
`

export const oceanFragmentShader = /* glsl */ `
uniform float uTime;
uniform vec3  uColorDeep;
uniform vec3  uColorMid;
uniform vec3  uColorBright;
uniform float uIntro;

// Sama's Vibrant Blue Eye Palette (#0A1116, #4A85B2, #7AB0D6, #1E3A5F)
uniform vec3  uIrisPupil;      // Pupil / Deep Center (#0A1116 Near black, subtle blue tint)
uniform vec3  uIrisMid;        // Base Iris Color (#4A85B2 Strong, vibrant mid-blue)
uniform vec3  uIrisHighlight;  // Highlight Color (#7AB0D6 Clear, bright light blue)
uniform vec3  uIrisLimbal;     // Limbal Ring (#1E3A5F Deep navy blue)

varying float vGlow;
varying float vHeight;
varying float vFade;
varying float vRandom;
varying float vProgress;
varying float vFormEye;
varying float vZoomProgress;
varying float vIrisRadius;
varying float vStriation;
varying float vCrypts;
varying float vFurrows;
varying float vGelatinous;
varying float vHippus;

void main() {
  vec2  c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;

  // Soft watercolor ink droplet with delicate feathered rim
  float inkWash = 1.0 - smoothstep(0.0, 0.50, d);
  float inkRing = smoothstep(0.28, 0.46, d) * smoothstep(0.50, 0.44, d);
  float dropletProfile = pow(inkWash, 0.85) + inkRing * 0.40;

  float g = clamp(vGlow, 0.0, 3.0);

  // ── 1. Minimalist Watercolor Ocean Palette ───────────────
  vec3 oceanCol = mix(uColorDeep, uColorMid, smoothstep(0.0, 0.45, g));
  oceanCol = mix(oceanCol, uColorBright, smoothstep(0.35, 1.25, g));
  oceanCol = mix(oceanCol, uColorBright, smoothstep(-0.15, 0.25, vHeight) * 0.35);

  // ── 2. Sama's Refined Eye Palette (Watercolor Light Mode) ──
  float r = clamp(vIrisRadius, 0.0, 1.0);

  // A. Pupil / Deep Center (r: 0.0 -> 0.16)
  // Starts with near-black pupil (#0A1116)
  vec3 irisCol = uIrisPupil;

  // B. Transition into Inner Pupillary Zone (#0A1116 -> #6B8FA8)
  float pupilToMid = smoothstep(0.03, 0.20, r);
  irisCol = mix(irisCol, uIrisMid, pupilToMid);

  // C. Inner Crypts & Collarette Highlight (#9DBDD6 Soft misty blue)
  // Subtle misty highlights along the collarette ridge & crypt boundaries
  float collarettePeak = exp(-pow(r - 0.355, 2.0) / (2.0 * 0.045 * 0.045));
  float cryptFactor = smoothstep(0.20, 0.65, vCrypts);
  float innerHighlight = smoothstep(0.16, 0.38, r) * (1.0 - smoothstep(0.38, 0.52, r));
  float highlightBlend = max(collarettePeak * 0.85, innerHighlight * (1.0 - cryptFactor * 0.5));
  irisCol = mix(irisCol, uIrisHighlight, highlightBlend);

  // D. Base Ciliary Stroma (r: 0.36 -> 0.78)
  // Dusty blue mid-tone (#6B8FA8) with fibrous trabeculae modulated by FBM & Voronoi
  float furrowIntensity = smoothstep(-0.35, 0.65, vFurrows);
  vec3 stromalFiberCol = mix(uIrisMid, uIrisHighlight, furrowIntensity * 0.45);
  // Inside deeper crypt recess pits, richer oceanic dark gray-blue tone (#2A4050)
  vec3 stromalCryptCol = mix(uIrisLimbal * 0.85, stromalFiberCol, cryptFactor);
  irisCol = mix(irisCol, stromalCryptCol, smoothstep(0.32, 0.68, r));

  // E. Limbal Ring (r: 0.76 -> 0.94)
  // Deep oceanic dark gray-blue (#2A4050) outer boundary ring
  float limbalFactor = smoothstep(0.76, 0.92, r);
  irisCol = mix(irisCol, uIrisLimbal, limbalFactor);

  // F. Outer Edge Transition (r: 0.94 -> 1.0)
  // Soft fade from dark limbal ring to edge
  float edgeFade = smoothstep(0.92, 1.0, r);
  irisCol = mix(irisCol, uIrisLimbal * 0.70, edgeFade);

  // ── 3. Smooth Blend Between States ───────────────────────
  vec3 finalColor = mix(oceanCol, irisCol, vFormEye);

  // ── 4. Translucent Watercolor Ink Layering (NormalBlending) ─
  float stromalDensity = 0.75 + 0.25 * cryptFactor;
  float radialOpacity = smoothstep(0.015, 0.12, r) * (1.0 - smoothstep(0.96, 1.0, r) * 0.50);
  float gelatinousAlpha = mix(0.60, 0.95, vGelatinous * stromalDensity);

  // Soft watercolor droplet opacity that layers rich translucent glazes
  float oceanAlpha = dropletProfile * 0.70 * vFade * uIntro;
  float irisAlpha  = dropletProfile * radialOpacity * gelatinousAlpha * (0.82 + 0.18 * vRandom) * vFade * uIntro;
  float alpha = mix(oceanAlpha, irisAlpha, vFormEye);
  alpha = clamp(alpha * 1.15, 0.0, 0.96);

  // LOD zoom crossfade into microscopic text
  float zoomAlpha = mix(1.0, 0.30, vZoomProgress * vFormEye);
  alpha *= zoomAlpha;

  gl_FragColor = vec4(finalColor, alpha);
  #include <colorspace_fragment>
}
`
