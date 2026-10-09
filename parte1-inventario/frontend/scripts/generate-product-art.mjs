/**
 * Genera las ilustraciones de producto (SVG) que usa la ficha de producto.
 * Cada producto tiene 3 vistas: principal, detalle (acercamiento) y oscura.
 *
 * Uso:  node scripts/generate-product-art.mjs
 * Salida: public/products/<slug>-1.svg, -2.svg, -3.svg y placeholder.svg
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'products');
mkdirSync(OUT, { recursive: true });

const DEFS = `
<linearGradient id="metal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eef2f9"/><stop offset=".5" stop-color="#aab6cb"/><stop offset="1" stop-color="#6f7d97"/></linearGradient>
<linearGradient id="white" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d3ddee"/></linearGradient>
<linearGradient id="dark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4d5972"/><stop offset="1" stop-color="#1c2438"/></linearGradient>
<linearGradient id="black" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2d3347"/><stop offset="1" stop-color="#0c101b"/></linearGradient>
<linearGradient id="navy" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3f5079"/><stop offset="1" stop-color="#1a2342"/></linearGradient>
<linearGradient id="red" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#b3202a"/><stop offset=".4" stop-color="#ff6b6b"/><stop offset="1" stop-color="#a91d27"/></linearGradient>
<linearGradient id="wood" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c58a45"/><stop offset="1" stop-color="#6e411a"/></linearGradient>
<linearGradient id="amber" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe08a"/><stop offset="1" stop-color="#f59e0b"/></linearGradient>
<linearGradient id="gun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6b778c"/><stop offset=".5" stop-color="#3a4457"/><stop offset="1" stop-color="#171d2b"/></linearGradient>
<radialGradient id="glass" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#5b8fe8"/><stop offset=".45" stop-color="#1e3a7a"/><stop offset="1" stop-color="#070d22"/></radialGradient>
<radialGradient id="lens" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#7fb2ff"/><stop offset=".35" stop-color="#27468c"/><stop offset="1" stop-color="#050a1c"/></radialGradient>
<filter id="sh" x="-25%" y="-25%" width="150%" height="160%"><feDropShadow dx="0" dy="16" stdDeviation="13" flood-color="#0f2560" flood-opacity=".32"/></filter>
`;

const dot = (x, y, r, fill, extra = '') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" ${extra}/>`;
const shine = (x, y, rx, ry, op = 0.35) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#fff" opacity="${op}"/>`;

/** Cada ilustracion devuelve { body, focus } sobre un lienzo de 640x480. */
const ART = {
  dome: () => ({
    focus: [320, 250],
    body: `
      <ellipse cx="320" cy="318" rx="165" ry="40" fill="url(#white)" stroke="#b7c4dc" stroke-width="2"/>
      <path d="M155 318 v-18 a165 40 0 0 0 330 0 v18 a165 40 0 0 1 -330 0z" fill="#c4d0e6"/>
      <path d="M185 306 A135 135 0 0 1 455 306 Z" fill="url(#glass)"/>
      <path d="M205 290 A120 120 0 0 1 300 190" stroke="#fff" stroke-width="9" fill="none" opacity=".35" stroke-linecap="round"/>
      ${dot(320, 262, 44, 'url(#black)')}
      ${dot(320, 262, 30, 'url(#lens)')}
      ${dot(310, 252, 8, '#fff', 'opacity=".75"')}
      ${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => dot(320 + 60 * Math.cos((a * Math.PI) / 180), 262 + 60 * Math.sin((a * Math.PI) / 180), 4.5, '#7dd3fc')).join('')}
      <rect x="296" y="326" width="48" height="8" rx="4" fill="#9fb0cd"/>`,
  }),

  bullet: () => ({
    focus: [440, 248],
    body: `
      <g transform="rotate(-10 320 250)">
        <rect x="270" y="300" width="44" height="64" rx="8" fill="url(#metal)"/>
        <rect x="225" y="356" width="134" height="18" rx="9" fill="url(#dark)"/>
        <rect x="110" y="190" width="330" height="116" rx="46" fill="url(#white)" stroke="#b7c4dc" stroke-width="2"/>
        <path d="M98 196 h300 a22 22 0 0 1 22 22 v-6 a22 22 0 0 0 -22 -22 h-300z" fill="#c5d1e7"/>
        <rect x="96" y="176" width="320" height="30" rx="15" fill="url(#metal)"/>
        <ellipse cx="440" cy="248" rx="32" ry="58" fill="url(#black)"/>
        <ellipse cx="444" cy="248" rx="22" ry="40" fill="url(#lens)"/>
        <ellipse cx="438" cy="228" rx="6" ry="12" fill="#fff" opacity=".7"/>
        ${[212, 232, 264, 284].map((y) => dot(426, y, 4, '#7dd3fc')).join('')}
        ${shine(230, 215, 90, 10, 0.5)}
      </g>`,
  }),

  nvr: () => ({
    focus: [210, 262],
    body: `
      <rect x="80" y="196" width="480" height="132" rx="16" fill="url(#dark)"/>
      <rect x="80" y="196" width="480" height="30" rx="16" fill="#fff" opacity=".14"/>
      <rect x="104" y="226" width="150" height="76" rx="10" fill="#0a1226" stroke="#3b82f6" stroke-width="2"/>
      <text x="179" y="256" fill="#7dd3fc" font-family="Inter,Arial" font-weight="700" font-size="20" text-anchor="middle">NVR 16CH</text>
      <rect x="120" y="268" width="118" height="6" rx="3" fill="#3b82f6" opacity=".7"/>
      <rect x="120" y="282" width="80" height="6" rx="3" fill="#3b82f6" opacity=".45"/>
      ${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<rect x="290" y="${222 + i * 10}" width="170" height="4" rx="2" fill="#0c101b" opacity=".7"/>`).join('')}
      ${dot(494, 236, 6, '#34d399')}${dot(516, 236, 6, '#38bdf8')}${dot(538, 236, 6, '#fbbf24')}
      <rect x="486" y="262" width="56" height="30" rx="8" fill="url(#metal)"/>
      <rect x="100" y="328" width="24" height="12" rx="4" fill="#0c101b"/><rect x="516" y="328" width="24" height="12" rx="4" fill="#0c101b"/>`,
  }),

  access: () => ({
    focus: [320, 300],
    body: `
      <rect x="226" y="86" width="188" height="308" rx="34" fill="url(#white)" stroke="#b7c4dc" stroke-width="2"/>
      <rect x="248" y="112" width="144" height="92" rx="14" fill="url(#black)"/>
      <rect x="260" y="126" width="120" height="10" rx="5" fill="#3b82f6"/>
      <rect x="260" y="146" width="84" height="8" rx="4" fill="#38bdf8" opacity=".7"/>
      <rect x="260" y="164" width="100" height="8" rx="4" fill="#38bdf8" opacity=".45"/>
      ${dot(320, 300, 56, 'url(#black)')}
      <g fill="none" stroke="#38bdf8" stroke-width="4" stroke-linecap="round">
        <path d="M296 322 q0 -34 24 -34 q24 0 24 34"/><path d="M286 316 q0 -44 34 -44 q34 0 34 44" opacity=".8"/>
        <path d="M306 330 q0 -22 14 -22 q14 0 14 22" opacity=".9"/><path d="M276 300 q4 -40 44 -40" opacity=".55"/>
      </g>
      ${dot(320, 372, 7, '#34d399')}`,
  }),

  pir: () => ({
    focus: [320, 240],
    body: `
      <rect x="228" y="156" width="184" height="196" rx="30" fill="url(#white)" stroke="#b7c4dc" stroke-width="2"/>
      <ellipse cx="320" cy="238" rx="62" ry="70" fill="#eef3fb" stroke="#aab9d6" stroke-width="3"/>
      ${[-40, -24, -8, 8, 24, 40].map((dx) => `<path d="M${320 + dx} 176 q${dx > 0 ? 6 : -6} 62 0 124" stroke="#9fb0cd" stroke-width="2.5" fill="none"/>`).join('')}
      ${shine(296, 205, 18, 30, 0.7)}
      ${dot(320, 326, 8, '#ef4444')}${shine(318, 323, 3, 3, 0.9)}
      <rect x="296" y="350" width="48" height="20" rx="8" fill="url(#metal)"/>`,
  }),

  siren: () => ({
    focus: [320, 220],
    body: `
      <path d="M232 226 A88 88 0 0 1 408 226 Z" fill="url(#amber)"/>
      <path d="M252 214 A70 70 0 0 1 320 156" stroke="#fff" stroke-width="9" fill="none" opacity=".5" stroke-linecap="round"/>
      ${[-60, -30, 0, 30, 60].map((a) => `<line x1="${320 + 108 * Math.sin((a * Math.PI) / 180)}" y1="${222 - 108 * Math.cos((a * Math.PI) / 180)}" x2="${320 + 134 * Math.sin((a * Math.PI) / 180)}" y2="${222 - 134 * Math.cos((a * Math.PI) / 180)}" stroke="#fbbf24" stroke-width="7" stroke-linecap="round"/>`).join('')}
      <rect x="196" y="226" width="248" height="128" rx="18" fill="url(#red)"/>
      <rect x="196" y="226" width="248" height="28" rx="14" fill="#fff" opacity=".18"/>
      ${[0, 1, 2, 3, 4].map((i) => `<rect x="236" y="${268 + i * 14}" width="168" height="6" rx="3" fill="#7f1018" opacity=".75"/>`).join('')}`,
  }),

  padlock: () => ({
    focus: [320, 310],
    body: `
      <path d="M254 252 v-68 a66 66 0 0 1 132 0 v68" fill="none" stroke="url(#metal)" stroke-width="30" stroke-linecap="round"/>
      <path d="M254 252 v-68 a66 66 0 0 1 132 0" fill="none" stroke="#fff" stroke-width="5" opacity=".45" stroke-linecap="round"/>
      <rect x="214" y="240" width="212" height="158" rx="28" fill="url(#navy)" stroke="#0f1830" stroke-width="2"/>
      <rect x="214" y="240" width="212" height="40" rx="20" fill="#fff" opacity=".14"/>
      ${dot(320, 304, 24, '#0a1020')}<path d="M310 316 L330 316 L336 358 L304 358 Z" fill="#0a1020"/>
      ${dot(320, 304, 24, 'none', 'stroke="#38bdf8" stroke-width="3" opacity=".8"')}`,
  }),

  radio: () => ({
    focus: [320, 282],
    body: `
      <rect x="382" y="58" width="24" height="112" rx="12" fill="url(#black)"/>
      <rect x="230" y="150" width="196" height="268" rx="30" fill="url(#dark)"/>
      <rect x="230" y="150" width="196" height="40" rx="20" fill="#fff" opacity=".12"/>
      <rect x="258" y="124" width="26" height="40" rx="8" fill="url(#black)"/><rect x="298" y="132" width="36" height="32" rx="12" fill="url(#metal)"/>
      <rect x="216" y="214" width="14" height="70" rx="6" fill="#f59e0b"/>
      ${[0, 1, 2].flatMap((r) => [0, 1, 2, 3].map((c) => dot(262 + c * 34, 188 + r * 14, 3.5, '#0a1020'))).join('')}
      <rect x="256" y="240" width="144" height="58" rx="10" fill="#07101f" stroke="#3b82f6" stroke-width="2"/>
      <text x="328" y="278" fill="#7dd3fc" font-family="Inter,Arial" font-weight="700" font-size="24" text-anchor="middle">CH 04</text>
      ${[0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => `<rect x="${262 + c * 46}" y="${312 + r * 30}" width="38" height="22" rx="8" fill="#0e1424"/>`)).join('')}`,
  }),

  gps: () => ({
    focus: [320, 250],
    body: `
      <rect x="206" y="180" width="228" height="146" rx="26" fill="url(#black)" stroke="#3a4560" stroke-width="2"/>
      <rect x="206" y="180" width="228" height="36" rx="18" fill="#fff" opacity=".12"/>
      <rect x="232" y="232" width="110" height="62" rx="10" fill="#0a1226" stroke="#3b82f6" stroke-width="2"/>
      <g fill="none" stroke="#38bdf8" stroke-width="4" stroke-linecap="round"><path d="M262 276 a20 20 0 0 1 20 -20"/><path d="M262 262 a34 34 0 0 1 34 -34" opacity=".6"/>
      </g>${dot(264, 278, 4, '#38bdf8')}
      ${dot(392, 214, 7, '#34d399')}${dot(414, 214, 7, '#fbbf24')}
      <rect x="358" y="252" width="56" height="12" rx="6" fill="#0c101b"/><rect x="358" y="274" width="56" height="12" rx="6" fill="#0c101b"/>
      <path d="M434 252 q40 -10 50 -60" stroke="#1c2438" stroke-width="7" fill="none" stroke-linecap="round"/>`,
  }),

  vest: () => ({
    focus: [320, 270],
    body: `
      <path d="M244 112 Q282 150 320 150 Q358 150 396 112 L482 158 L450 226 L430 212 L430 372 Q320 408 210 372 L210 212 L190 226 L158 158 Z" fill="url(#navy)" stroke="#0f1830" stroke-width="3"/>
      <path d="M244 112 Q282 150 320 150 Q358 150 396 112" fill="none" stroke="#9fb0cd" stroke-width="8" stroke-linecap="round"/>
      <rect x="232" y="176" width="176" height="124" rx="14" fill="#fff" opacity=".1" stroke="#9fb0cd" stroke-width="2"/>
      ${[0, 1, 2].map((i) => `<rect x="238" y="${316 + i * 18}" width="164" height="12" rx="4" fill="#0f1830" opacity=".55"/>`).join('')}
      <rect x="168" y="168" width="52" height="16" rx="5" fill="#9fb0cd" transform="rotate(30 194 176)"/><rect x="420" y="168" width="52" height="16" rx="5" fill="#9fb0cd" transform="rotate(-30 446 176)"/>
      <line x1="320" y1="154" x2="320" y2="388" stroke="#0f1830" stroke-width="3"/>
      <rect x="262" y="210" width="116" height="30" rx="6" fill="#f59e0b"/><text x="320" y="231" fill="#1a2342" font-family="Inter,Arial" font-weight="800" font-size="17" text-anchor="middle">SEGURIDAD</text>`,
  }),

  helmet: () => ({
    focus: [320, 210],
    body: `
      <path d="M170 300 Q170 126 320 126 Q470 126 470 300 Q470 326 436 326 L204 326 Q170 326 170 300 Z" fill="url(#navy)" stroke="#0f1830" stroke-width="3"/>
      <path d="M196 280 Q200 160 320 150" fill="none" stroke="#fff" stroke-width="10" opacity=".28" stroke-linecap="round"/>
      <rect x="296" y="106" width="48" height="26" rx="8" fill="url(#metal)"/>
      <rect x="150" y="296" width="340" height="30" rx="15" fill="url(#dark)"/>
      <rect x="170" y="196" width="300" height="12" rx="6" fill="#0f1830" opacity=".5"/>
      ${dot(206, 262, 8, '#9fb0cd')}${dot(434, 262, 8, '#9fb0cd')}
      <path d="M226 326 q-6 36 14 52 M414 326 q6 36 -14 52" stroke="#1c2438" stroke-width="9" fill="none" stroke-linecap="round"/>`,
  }),

  flashlight: () => ({
    focus: [470, 250],
    body: `
      <g transform="rotate(-8 320 250)">
        <path d="M470 252 L640 150 L640 350 Z" fill="#fff6c8" opacity=".5"/>
        <rect x="120" y="226" width="300" height="52" rx="16" fill="url(#black)"/>
        ${Array.from({ length: 14 }, (_, i) => `<line x1="${160 + i * 18}" y1="228" x2="${160 + i * 18}" y2="276" stroke="#5a6786" stroke-width="2.5" opacity=".7"/>`).join('')}
        <path d="M414 208 L488 192 L488 312 L414 296 Z" fill="url(#metal)" stroke="#6f7d97" stroke-width="2"/>
        <ellipse cx="488" cy="252" rx="16" ry="62" fill="url(#amber)"/>
        <ellipse cx="490" cy="252" rx="8" ry="40" fill="#fff"/>
        ${dot(124, 252, 18, '#ef4444')}${shine(122, 246, 6, 6, 0.8)}
        ${shine(260, 238, 120, 5, 0.35)}
      </g>`,
  }),

  cuffs: () => ({
    focus: [320, 250],
    body: `
      <g fill="none" stroke="url(#metal)" stroke-width="22" stroke-linecap="round">
        <circle cx="222" cy="290" r="64"/><circle cx="418" cy="214" r="64"/>
      </g>
      <g fill="none" stroke="#fff" stroke-width="4" opacity=".5"><circle cx="222" cy="290" r="64"/><circle cx="418" cy="214" r="64"/></g>
      <rect x="196" y="204" width="56" height="48" rx="12" fill="url(#black)" transform="rotate(-12 224 228)"/>
      <rect x="392" y="266" width="56" height="48" rx="12" fill="url(#black)" transform="rotate(-12 420 290)"/>
      <g stroke="#7e8ca6" stroke-width="9" fill="none"><ellipse cx="296" cy="258" rx="16" ry="10"/><ellipse cx="322" cy="248" rx="16" ry="10" transform="rotate(-20 322 248)"/><ellipse cx="348" cy="238" rx="16" ry="10"/></g>`,
  }),

  tonfa: () => ({
    focus: [260, 280],
    body: `
      <g transform="rotate(-14 320 260)">
        <rect x="120" y="232" width="400" height="38" rx="19" fill="url(#black)"/>
        ${shine(300, 242, 150, 5, 0.3)}
        <rect x="236" y="262" width="34" height="120" rx="16" fill="url(#black)"/>
        ${[0, 1, 2, 3, 4].map((i) => `<rect x="236" y="${294 + i * 16}" width="34" height="6" rx="3" fill="#475270"/>`).join('')}
        <rect x="120" y="232" width="34" height="38" rx="14" fill="#ef4444" opacity=".85"/>
      </g>`,
  }),

  detector: () => ({
    focus: [310, 150],
    body: `
      <g transform="rotate(-26 320 250)">
        <rect x="242" y="48" width="156" height="230" rx="78" fill="url(#black)"/>
        <rect x="262" y="68" width="116" height="190" rx="58" fill="none" stroke="#38bdf8" stroke-width="5" opacity=".7"/>
        <rect x="303" y="270" width="34" height="140" rx="14" fill="url(#dark)"/>
        ${[0, 1, 2, 3].map((i) => `<rect x="303" y="${326 + i * 16}" width="34" height="6" rx="3" fill="#0c101b"/>`).join('')}
        ${dot(320, 296, 8, '#34d399')}
        ${shine(290, 100, 14, 40, 0.18)}
      </g>`,
  }),

  revolver: () => ({
    focus: [300, 210],
    body: `
      <rect x="326" y="180" width="224" height="30" rx="6" fill="url(#gun)"/>
      <rect x="326" y="204" width="190" height="20" rx="6" fill="url(#gun)"/>
      <rect x="528" y="168" width="16" height="12" rx="3" fill="#0c101b"/>
      <rect x="262" y="166" width="94" height="74" rx="16" fill="url(#gun)" stroke="#0c101b" stroke-width="2"/>
      ${[0, 1, 2].map((i) => `<rect x="${274 + i * 26}" y="176" width="10" height="54" rx="5" fill="#0c101b" opacity=".55"/>`).join('')}
      <path d="M176 176 H264 V248 L234 262 H176 Z" fill="url(#gun)" stroke="#0c101b" stroke-width="2"/>
      <path d="M180 170 q-14 -6 -12 -22 l18 6 z" fill="#0c101b"/>
      <path d="M176 262 L240 262 L228 366 Q224 388 200 388 L172 380 Q154 374 160 354 Z" fill="url(#wood)" stroke="#4e2c0e" stroke-width="2"/>
      ${[0, 1, 2, 3].map((i) => `<line x1="${176 - i * 2}" y1="${286 + i * 24}" x2="${224 - i * 3}" y2="${280 + i * 24}" stroke="#4e2c0e" stroke-width="2" opacity=".55"/>`).join('')}
      <path d="M246 252 Q276 312 306 252" fill="none" stroke="#161c2b" stroke-width="9"/>
      <rect x="268" y="244" width="8" height="26" rx="4" fill="#0c101b"/>
      ${shine(420, 190, 90, 4, 0.4)}`,
  }),

  pistol: () => ({
    focus: [320, 200],
    body: `
      <rect x="150" y="150" width="340" height="58" rx="12" fill="url(#gun)" stroke="#0c101b" stroke-width="2"/>
      ${Array.from({ length: 8 }, (_, i) => `<line x1="${170 + i * 9}" y1="156" x2="${170 + i * 9}" y2="202" stroke="#0c101b" stroke-width="2.5" opacity=".6"/>`).join('')}
      <rect x="488" y="162" width="30" height="34" rx="5" fill="#0c101b"/>
      <rect x="440" y="138" width="14" height="14" rx="3" fill="#0c101b"/><rect x="164" y="138" width="14" height="14" rx="3" fill="#0c101b"/>
      <path d="M150 208 H420 V240 H318 L302 336 Q298 362 274 362 L208 354 Q190 350 196 328 L216 240 H150 Z" fill="url(#black)" stroke="#0c101b" stroke-width="2"/>
      ${Array.from({ length: 5 }, (_, i) => `<circle cx="${238 + i * 10}" cy="${296 + (i % 2) * 14}" r="2.6" fill="#59647f"/>`).join('')}
      <path d="M322 240 Q350 296 384 240" fill="none" stroke="#161c2b" stroke-width="9"/>
      <rect x="338" y="238" width="8" height="26" rx="4" fill="#59647f"/>
      <rect x="208" y="348" width="76" height="14" rx="5" fill="#59647f"/>
      ${shine(330, 166, 120, 4, 0.4)}`,
  }),

  extinguisher: () => ({
    focus: [320, 270],
    body: `
      <rect x="248" y="144" width="144" height="262" rx="46" fill="url(#red)"/>
      ${shine(280, 230, 14, 70, 0.28)}
      <rect x="298" y="112" width="44" height="40" rx="8" fill="url(#metal)"/>
      <rect x="262" y="90" width="116" height="30" rx="10" fill="url(#metal)"/>
      <path d="M270 96 L224 74" stroke="#0c101b" stroke-width="9" stroke-linecap="round"/>
      <path d="M262 112 Q196 130 196 200 Q196 252 240 252" stroke="#0c101b" stroke-width="9" fill="none" stroke-linecap="round"/>
      ${dot(354, 78, 16, '#fff', 'stroke="#6f7d97" stroke-width="3"')}<path d="M354 78 l8 -6" stroke="#ef4444" stroke-width="3"/>
      <rect x="266" y="238" width="108" height="100" rx="10" fill="#fff"/>
      <path d="M320 250 q14 20 0 34 q-16 -14 0 -34z" fill="#f97316"/>
      <text x="320" y="316" fill="#b3202a" font-family="Inter,Arial" font-weight="800" font-size="15" text-anchor="middle">ABC 10 LB</text>`,
  }),
};

const BACKDROPS = {
  1: { bg: ['#f7f9f8', '#dde6e1'], floor: '#c9d6ce', ring: '#ffffff', zoom: 1, label: 'principal' },
  2: { bg: ['#eaf5eb', '#c5e0c8'], floor: '#b3d2b7', ring: '#ffffff', zoom: 1.7, label: 'detalle' },
  3: { bg: ['#2a5b9c', '#12335f'], floor: '#0d2447', ring: '#6f9bd3', zoom: 1, label: 'oscura' },
};

function compose(art, view) {
  const b = BACKDROPS[view];
  const [fx, fy] = art.focus;
  const transform = b.zoom === 1 ? '' : `transform="translate(320 240) scale(${b.zoom}) translate(${-fx} ${-fy})"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" width="640" height="480" role="img">
<defs>${DEFS}<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${b.bg[0]}"/><stop offset="1" stop-color="${b.bg[1]}"/></linearGradient></defs>
<rect width="640" height="480" fill="url(#bg)"/>
<circle cx="320" cy="236" r="210" fill="${b.ring}" opacity="${view === 3 ? 0.16 : 0.55}"/>
<circle cx="320" cy="236" r="150" fill="none" stroke="${b.ring}" stroke-width="2" opacity="${view === 3 ? 0.5 : 0.7}"/>
${view === 1 || view === 3 ? `<ellipse cx="320" cy="420" rx="220" ry="26" fill="${b.floor}" opacity=".85"/>` : ''}
<g filter="url(#sh)" ${transform}>${art.body}</g>
</svg>`;
}

export const SLUGS = Object.keys(ART);

for (const [slug, draw] of Object.entries(ART)) {
  const art = draw();
  for (const view of [1, 2, 3]) {
    writeFileSync(join(OUT, `${slug}-${view}.svg`), compose(art, view), 'utf8');
  }
}

writeFileSync(
  join(OUT, 'placeholder.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><rect width="640" height="480" fill="#e9effa"/><g fill="none" stroke="#9db2d9" stroke-width="10" stroke-linejoin="round"><path d="M320 150 L430 205 V320 L320 375 L210 320 V205 Z"/><path d="M210 205 L320 260 L430 205 M320 260 V375"/></g></svg>`,
  'utf8',
);

console.log(`${SLUGS.length} productos, ${SLUGS.length * 3} imagenes generadas en ${OUT}`);

