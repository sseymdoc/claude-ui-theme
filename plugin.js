// src/plugin.tsx
import { COMPOSER_AREAS, requestTheme, THEMES_AREA, TITLEBAR_AREAS } from "@hermes/plugin-sdk";

// src/effort/index.tsx
import { host, Popover, PopoverContent, PopoverTrigger, useI18n, usePluginI18n, useValue } from "@hermes/plugin-sdk";
import { useEffect as useEffect2, useState as useState2 } from "react";

// src/state.ts
import { useTheme } from "@hermes/plugin-sdk";

// src/theme.ts
var THEME_NAME = "claude-ui";
var light = {
  background: "#fcfcfb",
  foreground: "#0b0b0b",
  card: "#ffffff",
  cardForeground: "#0b0b0b",
  muted: "#f2f1ee",
  mutedForeground: "#898781",
  popover: "#ffffff",
  popoverForeground: "#0b0b0b",
  primary: "#1f5fe0",
  primaryForeground: "#ffffff",
  secondary: "#f0efeb",
  secondaryForeground: "#0b0b0b",
  accent: "#f0efeb",
  accentForeground: "#0b0b0b",
  border: "#0b0b0b17",
  input: "#0b0b0b24",
  ring: "#1f5fe0",
  midground: "#1f5fe0",
  midgroundForeground: "#ffffff",
  composerRing: "#0b0b0b",
  destructive: "#d03b3b",
  destructiveForeground: "#ffffff",
  sidebarBackground: "#f7f6f3",
  sidebarBorder: "#0b0b0b14",
  userBubble: "#f1f1ef",
  userBubbleBorder: "#0b0b0b14"
};
var dark = {
  background: "#151515",
  foreground: "#f0efec",
  card: "#1a1a19",
  cardForeground: "#f0efec",
  muted: "#222221",
  mutedForeground: "#898781",
  popover: "#20201f",
  popoverForeground: "#f0efec",
  primary: "#7aa2ff",
  primaryForeground: "#0b0b0b",
  secondary: "#252524",
  secondaryForeground: "#f0efec",
  accent: "#252524",
  accentForeground: "#f0efec",
  border: "#ffffff1a",
  input: "#ffffff24",
  ring: "#7aa2ff",
  midground: "#7aa2ff",
  midgroundForeground: "#0b0b0b",
  composerRing: "#f0efec",
  destructive: "#e5534b",
  destructiveForeground: "#ffffff",
  sidebarBackground: "#111111",
  sidebarBorder: "#ffffff14",
  userBubble: "#212121",
  userBubbleBorder: "#ffffff14"
};
var terminal = {
  foreground: "#1a1a1a",
  cursor: "#1f5fe0",
  selectionBackground: "#1f5fe040",
  black: "#1a1a1a",
  red: "#ff3a30",
  green: "#1e9e3c",
  yellow: "#98801f",
  blue: "#0073e6",
  magenta: "#cd2054",
  cyan: "#8e6bd9",
  white: "#999999",
  brightBlack: "#666666",
  brightRed: "#ff5047",
  brightGreen: "#1e9e3c",
  brightYellow: "#98801f",
  brightBlue: "#0078f0",
  brightMagenta: "#cd2054",
  brightCyan: "#8e6bd9",
  brightWhite: "#d6d6d6"
};
var darkTerminal = {
  foreground: "#eaecf0",
  cursor: "#7aa2ff",
  selectionBackground: "#7aa2ff4d",
  black: "#262626",
  red: "#ff3a30",
  green: "#32d74b",
  yellow: "#ffd014",
  blue: "#0099ff",
  magenta: "#ff2c56",
  cyan: "#b796ff",
  white: "#a6a6a6",
  brightBlack: "#525252",
  brightRed: "#ff5047",
  brightGreen: "#32d74b",
  brightYellow: "#ffd014",
  brightBlue: "#0087ee",
  brightMagenta: "#ff2c56",
  brightCyan: "#b796ff",
  brightWhite: "#ededed"
};
var buildTheme = (customCSS2) => ({
  name: THEME_NAME,
  label: "Claude UI",
  description: "Warm paper neutrals, hairline borders and Hermes blue, with codex-ui tool rows, docked cards and the effort slider",
  colors: light,
  darkColors: dark,
  terminal,
  darkTerminal,
  customCSS: customCSS2
});

// src/state.ts
var PLUGIN_ID = "claude-ui";
var ctx = null;
var setPluginContext = (next) => {
  ctx = next;
};
var pluginContext = () => ctx;
function useThemeActive() {
  const { themeName } = useTheme();
  return typeof themeName === "string" && themeName.startsWith(THEME_NAME);
}

// src/effort/slider.tsx
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";

// src/effort/charge.ts
var rgb = (hex) => [(hex >> 16) / 255, (hex >> 8 & 255) / 255, (hex & 255) / 255];
var CHARGE_LIGHT = {
  u_fg: rgb(16772857),
  u_fg2: rgb(11651326),
  u_charge0: [...rgb(6593252), 1],
  u_tintA: [...rgb(11132926), 0.28],
  u_tintB: [...rgb(16759525), 0.28],
  u_bedFill: 1,
  u_chargeMax: 0.92,
  u_chargeRamp: 0.5,
  u_inkFloor: 0.28,
  u_inkCeil: 1,
  u_energyGain: 1.18,
  u_maskEnd: 0.45
};
var CHARGE_DARK = {
  u_fg2: [1, 1, 1],
  u_charge0: [...rgb(7769087), 1],
  u_charge1: [...rgb(3557803), 1],
  u_tintA: [0, 0, 0, 0],
  u_tintB: [0, 0, 0, 0],
  u_bedFill: 0,
  u_chargeMax: 0.85,
  u_chargeRamp: 1.1,
  u_inkFloor: 0.08,
  u_inkCeil: 0.85,
  u_energyGain: 1,
  u_maskEnd: 0.6
};
function srgb(color, fallback) {
  const ctx2 = new OffscreenCanvas(1, 1).getContext("2d");
  ctx2.fillStyle = fallback;
  ctx2.fillStyle = color;
  ctx2.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx2.getImageData(0, 0, 1, 1).data;
  return [r / 255, g / 255, b / 255];
}
var CHARGE_VERTEX = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
uniform vec2 u_resolution;
void main() {
  v_uv = (a_position * 0.5 + 0.5) * u_resolution;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;
var CHARGE_FRAGMENT = `#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec3 u_fg;  // \u70ED\u58A8
uniform vec3 u_fg2; // \u51B7\u58A8\uFF0C\u603B\u6BD4\u5E95\u8272\u4EAE
uniform float u_seed;
// \u8109\u51B2\u73AF\uFF1A\u5404\u81EA\u53D1\u51FA\u7684\u65F6\u523B\uFF08u_time \u65F6\u949F\uFF09\u3001\u539F\u70B9\uFF08px\uFF09\u548C\u5F3A\u5EA6 0..1\u3002
const int MAX_BURSTS = 8;
uniform float u_burstTime[MAX_BURSTS];
uniform vec2 u_burstCenter[MAX_BURSTS];
uniform float u_burstGain[MAX_BURSTS];
uniform float u_fade; // \u603B\u5305\u7EDC\uFF0C\u5728\u91CF\u5316\u524D\u4E58\u4E0A
uniform float u_pos;  // \u624B\u67C4\u4F4D\u7F6E\uFF08\u5360\u8F68\u9053\u7684\u6BD4\u4F8B\uFF09
uniform vec4 u_charge0;
uniform vec4 u_charge1;
uniform float u_bedFill;
uniform vec4 u_tintA;
uniform vec4 u_tintB;
uniform float u_chargeMax;
uniform float u_chargeRamp;
uniform float u_inkFloor;
uniform float u_inkCeil;
uniform float u_energyGain;
uniform float u_maskEnd; // yK \u7684\u753B\u5E03\u906E\u7F69\uFF1A\u5728\u624B\u67C4\u8DE8\u5EA6\u7684\u8FD9\u4E00\u6BB5\u91CC\u7531\u900F\u660E\u5230\u4E0D\u900F\u660E
// \u5FEB\u901F\u6A21\u5F0F\u7684\u6761\u7EB9\u73AF\uFF1A\u5404\u81EA\u51FA\u53D1\u7684\u65F6\u523B\uFF08u_time \u65F6\u949F\uFF09\uFF1B\u539F\u70B9 x\uFF08px\uFF09\u3001\u6240\u5728\u884C\u3001\u901F\u5EA6\uFF08px/s\uFF09\u3001\u5F3A\u5EA6\u3002
const int MAX_STREAKS = 12;
uniform float u_streakTime[MAX_STREAKS];
uniform vec4 u_streak[MAX_STREAKS];
// ultra \u7684\u51B2\u51FB\u6CE2\u73AF\uFF1A\u539F\u70B9 x\uFF08px\uFF09\u3001\u51FA\u53D1\u65F6\u523B\uFF08u_time \u65F6\u949F\uFF09\u3001\u5F3A\u5EA6\u3001\u901F\u5EA6\uFF08\u683C/s\uFF09\uFF0C\u4ECE\u4E2D\u7EBF\u51FA\u53D1\u3002
const int MAX_SHOCKS = 2;
uniform vec4 u_shock[MAX_SHOCKS];
uniform float u_core; // ultra \u7684\u6838\u5FC3\uFF0C\u5176\u4F59\u6863\u4E3A 0\uFF1A\u505C\u7559\u65F6\u4FDD\u6301\uFF0C\u8109\u51B2\u8BA9\u5B83\u95EA\u70C1\uFF0C\u51B2\u51FB\u6CE2\u8BA9\u5B83\u95EA\u4EAE
uniform float u_knob; // \u624B\u67C4\u5BBD\u5EA6\uFF08px\uFF09\uFF0C\u8BA9\u6838\u5FC3\u8D34\u7740\u5B83\u7684\u8FD1\u8FB9
in vec2 v_uv;
out vec4 fragColor;

const float CELL_PITCH = 4.0;
const float CELL_SIZE = 3.0;
const float CELL_R = 0.9;
const float SPEED_LO = 20.0;
const float SPEED_HI = 36.0;
const float RANGE_LO = 10.0;
const float RANGE_HI = 55.0;
const float DENSITY_LO = 0.30;
const float DENSITY_HI = 0.85;
const float JITTER = 0.10;
const float HEAD_GAIN = 1.25;
const float HEAD_DECAY = 5.0;
const float BODY_GAIN = 0.65;
const float BODY_LO = 3.3;
const float BODY_HI = 0.77;
const float AMP_LO = 0.55;
const float MAX_AGE = 5.0;
const float RAMP_POW = 1.4;
const float BREATH_DIP = 0.28;
const float BREATH_BASE = 2.4;
const float BREATH_VARY = 1.4;
const float STREAK_DECAY = 11.0;
const float STREAK_TAIL = 0.4;
const float STREAK_DENSITY = 0.9;
const float SHOCK_HEAD = 1.3;
const float SHOCK_HEAD_DECAY = 8.0;
const float SHOCK_BODY = 0.6;
const float SHOCK_BODY_DECAY = 2.5;
const float SHOCK_AGE = 2.5;

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  // \u6574\u884C\u94FA\u6EE1\u6761\u9AD8\uFF0C\u683C\u5B50\u4FDD\u6301\u6B63\u65B9\u3002
  float pitch = u_resolution.y / max(round(u_resolution.y / CELL_PITCH), 1.0);
  float cellScale = pitch / CELL_PITCH;
  vec2 cell = floor(v_uv / pitch);
  vec2 cellCenter = (cell + 0.5) * pitch;

  // \u6297\u952F\u9F7F\u7684\u5706\u89D2\u77E9\u5F62\u683C\u5B50\u906E\u7F69\u3002
  float cellHalf = CELL_SIZE * 0.5 * cellScale;
  float cellR = CELL_R * cellScale;
  vec2 q = abs(v_uv - cellCenter) - vec2(cellHalf - cellR);
  float distC = length(max(q, vec2(0.0))) + min(max(q.x, q.y), 0.0) - cellR;
  float aa = min(fwidth(v_uv.x), 1.5);
  float cellMask = 1.0 - smoothstep(-aa, aa, distC);
  if (cellMask <= 0.0 && u_bedFill <= 0.0) {
    fragColor = vec4(0.0);
    return;
  }

  float jitter = (hash21(cell + 41.7 + u_seed) - 0.5) * 2.0 * JITTER;
  float vary = 0.35 + 0.65 * hash21(cell + 13.7 + u_seed);

  float energy = 0.0;
  float charged = 0.0;
  for (int i = 0; i < MAX_BURSTS; i++) {
    float age = u_time - u_burstTime[i];
    if (age < 0.0 || age > MAX_AGE) continue;
    float k = clamp(u_burstGain[i], 0.0, 1.0);
    vec2 originCell = floor(u_burstCenter[i] / pitch);
    float manh = abs(cell.x - originCell.x) + abs(cell.y - originCell.y);
    float range = mix(RANGE_LO, RANGE_HI, k);
    float falloff = exp(-manh / (range * 0.85));
    float reach = exp(-max(manh - range, 0.0) * 0.12);
    float speed = mix(SPEED_LO, SPEED_HI, k);
    float t = age - manh / speed - jitter;
    // \u5145\u80FD\u5E95\u8272\u968F\u524D\u6CBF\u5230\u8FBE\uFF0C\u8109\u51B2\u6D3B\u7740\u5C31\u4E00\u76F4\u5728\u3002
    charged = max(charged, smoothstep(0.0, 0.15, t) * reach);
    if (t < 0.0) continue;
    // \u6BCF\u6B21\u8109\u51B2\u91CD\u65B0\u6311\u8981\u70B9\u4EAE\u7684\u683C\u5B50\u3002
    float rank = hash21(cell + 7.3 + u_seed + u_burstTime[i]);
    if (rank > mix(DENSITY_LO, DENSITY_HI, k)) continue;
    float head = HEAD_GAIN * exp(-t * HEAD_DECAY);
    float body = BODY_GAIN * exp(-t * mix(BODY_LO, BODY_HI, k));
    energy += (head + body) * mix(AMP_LO, 1.0, k) * falloff * reach * vary;
  }

  // \u5FEB\u901F\u6A21\u5F0F\uFF1A\u6761\u7EB9\u5934\u7ECF\u8FC7\u65F6\u70B9\u4EAE\u6240\u5728\u884C\u7684\u683C\u5B50\uFF0C\u5B83\u4EEC\u6CBF\u540C\u6837\u7684\u4E94\u7EA7\u51B7\u5374\uFF0C\u8DD1\u5F97\u8D8A\u5FEB\u5C3E\u5DF4\u8D8A\u957F\u3002
  float dash = 0.0;
  for (int i = 0; i < MAX_STREAKS; i++) {
    vec4 s = u_streak[i];
    float behind = s.x - cellCenter.x;
    if (cell.y != s.y || behind < 0.0) continue;
    float t = u_time - u_streakTime[i] - behind / s.z;
    if (t < 0.0 || t > STREAK_TAIL) continue;
    if (hash21(cell + 3.9 + u_seed + u_streakTime[i]) > STREAK_DENSITY) continue;
    dash = max(dash, s.w * exp(-t * STREAK_DECAY));
  }

  // ultra \u7684\u51B2\u51FB\u6CE2\uFF1A\u4ECE\u624B\u67C4\u51FA\u53D1\u3001\u8D2F\u7A7F\u6574\u6761\u9AD8\u5EA6\u7684\u524D\u6CBF\uFF0C\u626B\u8FC7\u6BCF\u4E2A\u591F\u5F97\u7740\u7684\u683C\u5B50\uFF1B\u4E00\u9053\u70BD\u70ED\u7684\u5899\uFF0C\u8EAB\u540E\u7684\u8F89\u5149
  // \u6162\u6162\u51B7\u5374\uFF0C\u7ECF\u8FC7\u5904\u7684\u5E95\u8272\u88AB\u5145\u80FD\uFF08\u6700\u540E\u4E00\u79D2\u91CC\u653E\u624B\uFF0C\u4EA4\u7ED9\u8109\u51B2\u63A5\u7BA1\uFF09\u3002
  float shock = 0.0;
  for (int i = 0; i < MAX_SHOCKS; i++) {
    vec4 s = u_shock[i];
    float age = u_time - s.y;
    if (age < 0.0 || age > SHOCK_AGE) continue;
    vec2 origin = floor(vec2(s.x, u_resolution.y * 0.5) / pitch);
    float t = age - (abs(cell.x - origin.x) + abs(cell.y - origin.y)) / s.w - jitter * 0.3;
    charged = max(charged, smoothstep(0.0, 0.1, t) * s.z * (1.0 - smoothstep(SHOCK_AGE - 1.0, SHOCK_AGE, age)));
    if (t >= 0.0) shock = max(shock, s.z * (SHOCK_HEAD * exp(-t * SHOCK_HEAD_DECAY) + SHOCK_BODY * exp(-t * SHOCK_BODY_DECAY)));
  }

  // \u6BCF\u683C\u4EAE\u5EA6\u5728\u4E24\u79CD\u8EAB\u4EFD\u95F4\u6F02\u79FB\uFF1B\u4E00\u9053\u5FAE\u5F31\u7684\u6CE2\u4ECE\u53F3\u5F80\u5DE6\u6D41\u8FC7\u3002
  float lumA = hash21(cell + 8.8 + u_seed);
  float lumB = hash21(cell + 88.8 + u_seed);
  float lumDrift = 0.5 + 0.5 * sin(u_time * 0.35 + lumA * 6.2832);
  float lum = pow(mix(lumA, lumB, lumDrift), 1.9);
  float stream = 0.9 + 0.16 * sin(u_time * 1.3 + cell.x * 0.45 + lumB * 2.0);
  float e = clamp(energy, 0.0, 1.0) * u_fade * mix(0.16, 1.0, lum) * stream * u_energyGain;
  e = max(e, min(dash, 1.0) * u_fade * mix(0.7, 1.0, lum));
  e = max(e, min(shock, 1.0) * u_fade * mix(0.85, 1.0, lum));

  // ultra \u7684\u6838\u5FC3\uFF1A\u8D34\u7740\u624B\u67C4\u7684\u683C\u5B50\u5728\u71C3\u70E7\uFF0C\u7D27\u6328\u7740\u6700\u70ED\uFF0C\u5F80\u5916\u4E00\u7EA7\u7EA7\u51B7\u5374\uFF08\u79BB\u4E2D\u7EBF\u7A0D\u8FDC\u7684\u51B7\u5F97\u65E9\u4E9B\uFF09\uFF0C
  // \u6838\u5FC3\u95EA\u4EAE\u65F6\u4F38\u5F97\u66F4\u8FDC\u3002
  if (u_core > 0.0) {
    float d = (u_pos * u_resolution.x - u_knob - cellCenter.x) / pitch + abs(cellCenter.y - u_resolution.y * 0.5) / pitch * 0.5;
    float core = u_core * exp(-max(d, 0.0) / mix(2.0, 5.0, u_core));
    e = max(e, min(core, 1.0) * u_fade * mix(0.75, 1.0, lum));
  }

  // \u5145\u80FD\u5E95\u8272\uFF1A\u4ECE\u5DE6\u7F18\u5230\u624B\u67C4\u7684\u6E10\u53D8\uFF0C\u8D8A\u8FD1\u624B\u67C4\u8D8A\u6DF1\u3002
  float g = clamp(v_uv.x / max(u_pos * u_resolution.x, 1.0), 0.0, 1.0);
  vec3 chargeColor = mix(u_charge0.rgb, u_charge1.rgb, g);
  float bedMask = mix(u_bedFill, 1.0, cellMask);
  float chargeA = u_chargeMax * pow(g, u_chargeRamp) * charged * u_fade * bedMask * mix(u_charge0.a, u_charge1.a, g);

  // \u4E94\u4E2A\u79BB\u6563\u7684\u7EA7\uFF0C\u7EDD\u4E0D\u662F\u6E10\u53D8\uFF1B\u53EA\u6709\u6700\u9AD8\u4E00\u7EA7\u4F1A\u547C\u5438\u3002
  float lv = step(0.04, e) + step(0.2, e) + step(0.4, e) + step(0.6, e) + step(0.8, e);
  float alpha = lv <= 0.0 ? 0.0 : mix(u_inkFloor, u_inkCeil, (lv - 1.0) / 4.0);
  if (lv >= 5.0) {
    float period = BREATH_BASE + BREATH_VARY * hash21(cell + 3.1 + u_seed);
    float phase = hash21(cell + 5.5 + u_seed) * 6.2832;
    alpha *= 1.0 - BREATH_DIP * 0.5 * (1.0 + sin(u_time * 6.2832 / period + phase));
  }

  // \u80FD\u91CF\u76D6\u5728\u5145\u80FD\u4E0A\uFF0C\u9884\u4E58 alpha\uFF1B\u5C11\u6570\u683C\u5B50\u504F\u5411\u4E24\u79CD\u8272\u8C03\u3002
  vec3 ink = mix(u_fg2, u_fg, pow(lv / 5.0, RAMP_POW));
  float hueSel = hash21(cell + 27.9 + u_seed);
  ink = mix(ink, u_tintA.rgb, u_tintA.a * smoothstep(0.62, 0.95, hueSel));
  ink = mix(ink, u_tintB.rgb, u_tintB.a * (1.0 - smoothstep(0.05, 0.38, hueSel)));
  float eA = alpha * cellMask;
  vec3 col = ink * eA + chargeColor * chargeA * (1.0 - eA);
  float a = eA + chargeA * (1.0 - eA);
  if (a <= 0.0) {
    fragColor = vec4(0.0);
    return;
  }
  fragColor = vec4(col, a) * clamp(v_uv.x / max(u_maskEnd * u_pos * u_resolution.x, 1.0), 0.0, 1.0);
}`;
function chargeField(el, handle, stop, powered, rushing) {
  const gl = el.getContext("webgl2", { alpha: true, antialias: false, depth: false, stencil: false });
  if (!gl) return null;
  const program = gl.createProgram();
  const shaders = [
    [gl.VERTEX_SHADER, CHARGE_VERTEX],
    [gl.FRAGMENT_SHADER, CHARGE_FRAGMENT]
  ].map(([type, source]) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    gl.attachShader(program, shader);
    return shader;
  });
  gl.linkProgram(program);
  for (const shader of shaders) gl.deleteShader(shader);
  const buffer = gl.createBuffer();
  const locations = {};
  const u = (name) => locations[name] ??= gl.getUniformLocation(program, name);
  const parallel = gl.getExtension("KHR_parallel_shader_compile");
  const dpr = devicePixelRatio || 1;
  const width = Math.max(1, el.clientWidth);
  const height = Math.max(1, el.clientHeight);
  el.width = Math.round(width * dpr);
  el.height = Math.round(height * dpr);
  const BURSTS = 8;
  const times = new Float32Array(BURSTS).fill(-1e3);
  const centers = new Float32Array(BURSTS * 2);
  const gains = new Float32Array(BURSTS);
  let slot = 0;
  let clock = 0;
  let last = -1;
  let fade = 0;
  let held = 0;
  let lastBurst = -Infinity;
  let lastBurstAt = -Infinity;
  let gap = 0.45;
  let pressed = false;
  let ready = false;
  let running = false;
  let frame = 0;
  const rest = () => (stop * (width - handle.offsetWidth) + handle.offsetWidth) / width;
  const here = () => {
    const knob = handle.getBoundingClientRect();
    return ((knob.left + knob.right + handle.offsetWidth) / 2 - el.getBoundingClientRect().left) / width;
  };
  const strength = (t) => Math.min((powered ? 1 : 0.85) * (0.45 + 0.55 * t), 1);
  const built = () => Math.min(held / (powered ? 1 : 1.6), 1);
  let surge = 0;
  const shocks = new Float32Array([0, -1e3, 0, 1, 0, -1e3, 0, 1]);
  let shockSlot = 0;
  let lastShock = -Infinity;
  let nextBeat = 0;
  const shock = (x, gain, speed) => {
    shocks.set([x * width, clock, gain, speed], shockSlot * 4);
    shockSlot = (shockSlot + 1) % 2;
    gl.uniform4fv(u("u_shock[0]"), shocks);
    lastShock = clock;
    nextBeat = clock + 1.4 + Math.random() * 0.4;
    surge = Math.max(surge, 0.6 + 0.4 * gain);
    wake();
  };
  const burst = (gain, x) => {
    if (powered) surge = Math.max(surge, 0.5 + 0.15 * Math.min(gain, 1));
    times[slot] = clock;
    centers[slot * 2] = x * width;
    centers[slot * 2 + 1] = height * (0.35 + Math.random() * 0.3);
    gains[slot] = gain;
    slot = (slot + 1) % BURSTS;
    gl.uniform1fv(u("u_burstTime[0]"), times);
    gl.uniform2fv(u("u_burstCenter[0]"), centers);
    gl.uniform1fv(u("u_burstGain[0]"), gains);
    lastBurst = clock;
    lastBurstAt = performance.now();
    wake();
  };
  const STREAKS = 12;
  const streakTimes = new Float32Array(STREAKS).fill(-1e3);
  const streaks = new Float32Array(STREAKS * 4);
  const rows = Math.max(Math.round(height / 4), 1);
  let streakSlot = 0;
  let lastStreak = -Infinity;
  let streakGap = 0;
  let row = -1;
  const streak = (k, x, delay = 0) => {
    row = (row + 1 + Math.floor(Math.random() * Math.max(rows - 1, 1))) % rows;
    streakTimes[streakSlot] = clock + delay;
    streaks.set([x * width, row, (200 + 160 * k) * (0.85 + Math.random() * 0.3), 1 + Math.random() * 0.3], streakSlot * 4);
    streakSlot = (streakSlot + 1) % STREAKS;
    gl.uniform1fv(u("u_streakTime[0]"), streakTimes);
    gl.uniform4fv(u("u_streak[0]"), streaks);
    lastStreak = clock + delay;
    wake();
  };
  const tick = (now) => {
    const dt = last < 0 ? 0 : Math.max(0, (now - last) / 1e3);
    clock += dt;
    last = now;
    fade = pressed ? Math.min(fade + dt / 0.7, 1) : Math.max(fade - dt / 0.85, 0);
    held = pressed ? held + dt : 0;
    const pos = here();
    if (pressed && clock - lastBurst > gap) {
      gap = (0.3 + Math.random() * 0.45) * (powered ? 0.7 : 1);
      burst(strength(built()) * (0.85 + Math.random() * 0.3), pos + (Math.random() - 0.5) * 0.08);
    }
    if (pressed && rushing && clock - lastStreak > streakGap) {
      const k = built();
      streakGap = (0.22 - 0.1 * k) * (0.6 + Math.random() * 0.8);
      streak(k, pos);
    }
    if (pressed && powered && clock > nextBeat) shock(pos, 0.6, 45);
    const eased = fade * fade * (3 - 2 * fade);
    surge = Math.max(surge * Math.exp(-dt * 1.5), powered && pressed ? 0.5 : 0);
    gl.uniform1f(u("u_core"), surge);
    gl.uniform1f(u("u_pos"), pos);
    gl.uniform1f(u("u_fade"), eased);
    gl.uniform1f(u("u_time"), clock);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    running = pressed || clock - lastBurst < 5 && fade > 0;
    if (running) frame = requestAnimationFrame(tick);
  };
  const wake = () => {
    if (running) return;
    running = true;
    last = -1;
    frame = requestAnimationFrame(tick);
  };
  const start = () => {
    const style = getComputedStyle(el);
    const dark2 = style.colorScheme.includes("dark");
    const accent = srgb(style.getPropertyValue("--ui-accent"), dark2 ? "#7aa2ff" : "#1f5fe0");
    const ink = dark2 ? { ...CHARGE_DARK, u_fg: accent } : { ...CHARGE_LIGHT, u_charge1: [...accent, 1] };
    for (const [name, value] of Object.entries(ink)) {
      if (typeof value === "number") gl.uniform1f(u(name), value);
      else if (value.length === 3) gl.uniform3fv(u(name), value);
      else gl.uniform4fv(u(name), value);
    }
    if (performance.now() - lastBurstAt > 5e3 && fade <= 0) {
      times.fill(-1e3);
      gl.uniform1f(u("u_seed"), Math.random() * 512);
    }
    held = 0;
    nextBeat = clock + 1.2;
    burst(strength(0), rest());
  };
  const init = () => {
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.viewport(0, 0, el.width, el.height);
    gl.clearColor(0, 0, 0, 0);
    gl.uniform2f(u("u_resolution"), width, height);
    gl.uniform1fv(u("u_burstTime[0]"), times);
    gl.uniform4fv(u("u_shock[0]"), shocks);
    gl.uniform1f(u("u_knob"), handle.offsetWidth);
    ready = true;
    if (pressed) start();
  };
  const link = () => {
    if (parallel && !gl.getProgramParameter(program, parallel.COMPLETION_STATUS_KHR)) frame = requestAnimationFrame(link);
    else if (gl.getProgramParameter(program, gl.LINK_STATUS)) init();
  };
  link();
  return {
    press(on) {
      if (on === pressed) return;
      pressed = on;
      if (ready) {
        if (on) start();
        else wake();
      }
    },
    aim(next, power) {
      if (next === stop && power === powered) return;
      const arriving = power && !powered;
      stop = next;
      powered = power;
      if (ready && pressed) {
        held = 0;
        burst(strength(0), rest());
        if (arriving && clock - lastShock > 0.8) shock(rest(), 1, 70);
      }
    },
    rush(on) {
      if (on === rushing) return;
      rushing = on;
      if (on && ready && pressed) for (let i = 0; i < 4; i++) streak(1, here(), i * 0.05);
    },
    dispose() {
      cancelAnimationFrame(frame);
      gl.deleteProgram(program);
      gl.deleteBuffer(buffer);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    }
  };
}

// src/effort/slider.tsx
import { jsx, jsxs } from "react/jsx-runtime";
var WARNING_EFFORT = "max";
var PRO_EFFORT = "ultra";
var EFFORT_CHARGE = {
  low: [-40.2, 0.049, 1.928],
  // #B6C2C5
  medium: [-40.2, 0.282, 1.713],
  // #7AB6C5
  high: [-28.8, 0.5, 1.53],
  // #4AA3D2
  xhigh: [-16.3, 0.687, 1.311],
  // #2686DB
  max: [0, 1, 1],
  // #1F5FE0
  ultra: [22.9, 0.812, 0.991]
  // #574FCF
};
var REDUCE = "(prefers-reduced-motion: reduce)";
var subscribeMotion = (onChange) => {
  const query = matchMedia(REDUCE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
var reducedNow = () => matchMedia(REDUCE).matches;
function useReducedMotion() {
  return useSyncExternalStore(subscribeMotion, reducedNow);
}
function EffortSlider({
  levels,
  value,
  labels,
  descriptions,
  recommended,
  fast,
  title,
  ends,
  recommendedLabel,
  helpLabel,
  warningText,
  autoFocus = false,
  onPick
}) {
  const n = levels.length;
  const current = Math.max(0, levels.indexOf(value));
  const [preview, setPreview] = useState(null);
  const [picked, setPicked] = useState(null);
  if (picked !== null && (levels[picked] === void 0 || levels[picked] === value)) setPicked(null);
  const range = useRef(null);
  const track = useRef(null);
  const handle = useRef(null);
  const drag = useRef(null);
  const reduced = useReducedMotion();
  const shown = Math.min(preview ?? picked ?? current, n - 1);
  const chosen = Math.min(picked ?? current, n - 1);
  const lean = () => {
    const el = track.current;
    if (!el || !drag.current || !range.current || n < 2) return;
    const inset = (handle.current?.offsetWidth ?? 0) / 2;
    const box = el.getBoundingClientRect();
    const span = box.width - 2 * inset;
    const steps = (Math.min(Math.max((drag.current.x - drag.current.grab - box.left - inset) / span, 0), 1) - Number(range.current.value) / (n - 1)) * (n - 1);
    const px = `${(Math.round(Math.sign(steps) * 0.12 * (1 - Math.exp(-Math.abs(steps) / 0.12)) * span / (n - 1) / 0.5) * 0.5).toFixed(1)}px`;
    if (span > 0 && el.style.getPropertyValue("--lean") !== px) el.style.setProperty("--lean", px);
  };
  const release = () => {
    drag.current = null;
    track.current?.style.removeProperty("--lean");
  };
  useLayoutEffect(lean, [shown]);
  useEffect(() => {
    if (autoFocus) requestAnimationFrame(() => range.current?.focus());
  }, [autoFocus]);
  if (n < 2) return null;
  const name = (index) => labels[levels[index]] ?? levels[index];
  const info = (index) => descriptions?.[levels[index]] ?? "";
  const mark = recommended === void 0 ? -1 : levels.indexOf(recommended);
  const level2 = levels[shown];
  const [hue, saturate, brightness] = EFFORT_CHARGE[level2] ?? EFFORT_CHARGE.low;
  const commit = () => {
    const index = Number(range.current?.value ?? current);
    setPreview(null);
    const next = levels[index];
    if (next !== void 0 && next !== value) {
      setPicked(index);
      onPick(next);
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: "cx-effort-section", children: [
    /* @__PURE__ */ jsxs("div", { className: "cx-effort-head", children: [
      /* @__PURE__ */ jsxs("div", { className: "cx-effort-title", children: [
        /* @__PURE__ */ jsx("span", { children: title }),
        /* @__PURE__ */ jsx(EffortName, { index: shown, label: name(shown), pro: level2 === PRO_EFFORT, reduced }),
        level2 === WARNING_EFFORT && warningText && /* @__PURE__ */ jsxs("span", { className: "cx-effort-warn", role: "img", "aria-label": warningText, children: [
          /* @__PURE__ */ jsx("i", { className: "codicon codicon-warning", "aria-hidden": "true" }),
          /* @__PURE__ */ jsx("span", { className: "cx-effort-warn-card", "aria-hidden": "true", children: warningText })
        ] })
      ] }),
      info(shown) && /* @__PURE__ */ jsxs("button", { type: "button", className: "cx-effort-help", "aria-label": helpLabel, children: [
        /* @__PURE__ */ jsx("i", { className: "codicon codicon-question", "aria-hidden": "true" }),
        /* @__PURE__ */ jsxs("span", { className: "cx-effort-help-card", role: "tooltip", children: [
          /* @__PURE__ */ jsx("span", { children: name(shown) }),
          /* @__PURE__ */ jsx("span", { children: info(shown) })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "cx-effort-body", children: [
      /* @__PURE__ */ jsxs("div", { className: "cx-effort-ends", dir: "ltr", children: [
        /* @__PURE__ */ jsx("span", { children: ends[0] }),
        /* @__PURE__ */ jsx("span", { children: ends[1] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "cx-effort-slider", children: [
        /* @__PURE__ */ jsxs(
          "div",
          {
            ref: track,
            className: "cx-effort-track",
            style: { "--pos": shown / (n - 1), "--charge": `hue-rotate(${hue}deg) saturate(${saturate}) brightness(${brightness})` },
            children: [
              /* @__PURE__ */ jsx("span", { className: "cx-effort-fill" }),
              /* @__PURE__ */ jsx("span", { className: "cx-effort-charge", "data-on": !reduced || void 0, children: /* @__PURE__ */ jsx(ChargeCanvas, { lit: !reduced, stop: shown / (n - 1), power: level2 === PRO_EFFORT, rush: fast, handle }) }),
              /* @__PURE__ */ jsx("span", { className: "cx-effort-stops", "aria-hidden": "true", children: levels.map((id, index) => /* @__PURE__ */ jsx("span", { "data-mark": index === mark || void 0 }, id)) }),
              /* @__PURE__ */ jsx(
                "input",
                {
                  ref: range,
                  type: "range",
                  className: "cx-effort-range",
                  min: 0,
                  max: n - 1,
                  step: 1,
                  value: shown,
                  "aria-label": title,
                  "aria-valuetext": shown === mark ? `${name(shown)} (${recommendedLabel})` : name(shown),
                  onChange: (event) => setPreview(Number(event.target.value)),
                  onPointerDown: (event) => {
                    if (event.button !== 0 || reduced || !track.current) return;
                    const inset = (handle.current?.offsetWidth ?? 0) / 2;
                    const box = track.current.getBoundingClientRect();
                    const offset = event.clientX - (box.left + inset + shown / (n - 1) * (box.width - 2 * inset));
                    drag.current = { x: event.clientX, grab: Math.abs(offset) <= 0.7 * inset ? offset : 0 };
                    lean();
                  },
                  onPointerMove: (event) => {
                    if (!drag.current) return;
                    if (event.buttons === 0) return release();
                    drag.current.x = event.clientX;
                    lean();
                  },
                  onPointerUp: () => {
                    release();
                    commit();
                  },
                  onPointerCancel: () => {
                    release();
                    setPreview(null);
                  },
                  onKeyDown: (event) => {
                    if (event.key === "Home" || event.key === "End") event.stopPropagation();
                  },
                  onKeyUp: (event) => {
                    if (event.key.startsWith("Arrow") || event.key === "Home" || event.key === "End" || event.key.startsWith("Page")) commit();
                  }
                }
              ),
              /* @__PURE__ */ jsx("span", { ref: handle, className: "cx-effort-handle", "aria-hidden": "true" })
            ]
          }
        ),
        mark >= 0 && /* @__PURE__ */ jsx("div", { className: "cx-effort-mark", "data-on": shown === mark || void 0, style: { "--mark": mark / (n - 1) }, "aria-hidden": "true", children: /* @__PURE__ */ jsx("span", { children: recommendedLabel }) })
      ] }),
      info(chosen) && /* @__PURE__ */ jsx("span", { className: "cx-effort-desc", children: info(chosen) })
    ] })
  ] });
}
var EASE_OUT = "cubic-bezier(0, 0, 0.58, 1)";
var NAME_BLUR = [0, 0.5, 1, 2];
var NAME_TIMES = [0, 0.342, 0.563, 1];
var NAME_IN = [
  [0, 0, 0, 1],
  [0, 0, 1, 0],
  [0, 1, 0, 0],
  [1, 0, 0, 0]
];
var NAME_OUT = [0, 0, 0, 1];
function EffortName({ index, label, pro, reduced }) {
  const [names, setNames] = useState([{ seq: 0, index, label, pro, dir: 1 }]);
  const current = names[names.length - 1];
  if (current.index !== index) {
    const next = { seq: current.seq + 1, index, label, pro, dir: index > current.index ? 1 : -1 };
    setNames(reduced ? [next] : [...names, next]);
  }
  const box = useRef(null);
  const leaving = useRef(/* @__PURE__ */ new Set());
  useLayoutEffect(() => {
    const nodes = [...box.current?.children ?? []];
    if (current.seq === 0 || reduced || nodes.length !== names.length) return;
    const layers = (node2) => [...node2.children];
    const node = nodes[nodes.length - 1];
    node.animate([{ transform: `translateY(${current.dir * 0.55}em)`, opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 200, easing: EASE_OUT });
    layers(node).forEach((layer, k) => layer.animate(NAME_IN[k].map((opacity, i) => ({ opacity, offset: NAME_TIMES[i], easing: i === 2 ? EASE_OUT : "linear" })), 200));
    names.slice(0, -1).forEach(({ seq }, i) => {
      if (leaving.current.has(seq)) return;
      leaving.current.add(seq);
      const old = nodes[i];
      const from = getComputedStyle(old);
      const exit = old.animate([{ transform: from.transform, opacity: from.opacity }, { transform: `translateY(${-current.dir * 0.55}em)`, opacity: 0 }], { duration: 200, easing: EASE_OUT, fill: "forwards" });
      exit.onfinish = () => {
        leaving.current.delete(seq);
        setNames((list) => list.filter((name) => name.seq !== seq));
      };
      layers(old).forEach((layer, k) => layer.animate([{ opacity: getComputedStyle(layer).opacity }, { opacity: NAME_OUT[k] }], { duration: 200, easing: EASE_OUT, fill: "forwards" }));
    });
  }, [current.seq]);
  return /* @__PURE__ */ jsx("span", { ref: box, className: "cx-effort-names", "aria-hidden": "true", children: names.map((name) => /* @__PURE__ */ jsx("span", { className: "cx-effort-name", "data-pro": (name === current ? pro : name.pro) || void 0, "data-leaving": name !== current || void 0, children: NAME_BLUR.map((blur) => /* @__PURE__ */ jsx("span", { style: blur ? { filter: `blur(${blur}px)` } : void 0, children: name === current ? label : name.label }, blur)) }, name.seq)) });
}
function ChargeCanvas({ lit, stop, power, rush, handle }) {
  const canvas = useRef(null);
  const field = useRef(null);
  const disposing = useRef(0);
  useEffect(() => {
    clearTimeout(disposing.current);
    return () => {
      disposing.current = window.setTimeout(() => {
        field.current?.dispose();
        field.current = null;
      });
    };
  }, []);
  useEffect(() => {
    if (lit && !field.current && canvas.current && handle.current) field.current = chargeField(canvas.current, handle.current, stop, power, rush);
    field.current?.press(lit);
  }, [lit]);
  useEffect(() => field.current?.aim(stop, power), [stop, power]);
  useEffect(() => field.current?.rush(rush), [rush]);
  return /* @__PURE__ */ jsx("canvas", { ref: canvas, "aria-hidden": "true" });
}

// src/effort/index.tsx
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
var LEVELS = ["minimal", "low", "medium", "high", "xhigh", "max", "ultra"];
var isFast = (value) => value === "fast" || value === "ultrafast" || value === "priority" || value === true;
function useSessionEffort(sessionId) {
  const [state, setState] = useState2(null);
  useEffect2(() => {
    setState(null);
    if (!sessionId) {
      return;
    }
    let live = true;
    Promise.all([
      host.request("config.get", { key: "reasoning", session_id: sessionId }),
      host.request("config.get", { key: "fast", session_id: sessionId })
    ]).then(([reasoning, fast]) => {
      if (live) {
        setState({ effort: String(reasoning?.value ?? ""), fast: isFast(fast?.value) });
      }
    }).catch(() => void 0);
    const off = host.onEvent("session.info", (event) => {
      if (event?.session_id && event.session_id !== sessionId) {
        return;
      }
      const payload = event?.payload ?? {};
      setState((prev) => ({
        effort: typeof payload.reasoning_effort === "string" ? payload.reasoning_effort : prev?.effort ?? "",
        fast: "fast" in payload ? isFast(payload.fast) : prev?.fast ?? false
      }));
    });
    return () => {
      live = false;
      if (typeof off === "function") {
        off();
      }
    };
  }, [sessionId]);
  return [state, setState];
}
function EffortControl() {
  const active = useThemeActive();
  const sessionId = useValue(host.state.activeSessionId);
  const { t } = useI18n();
  const pt = usePluginI18n(PLUGIN_ID);
  const [state, setState] = useSessionEffort(active ? sessionId : null);
  const [open, setOpen] = useState2(false);
  if (!active || !sessionId || !state || !LEVELS.includes(state.effort)) {
    return null;
  }
  const options = t?.shell?.modelOptions ?? {};
  const title = options.effort ?? "Effort";
  const labels = Object.fromEntries(LEVELS.map((level2) => [level2, options[level2] ?? level2]));
  const pick = async (level2) => {
    const previous = state;
    setState({ ...state, effort: level2 });
    try {
      await host.request("config.set", { key: "reasoning", session_id: sessionId, value: level2 });
    } catch {
      setState(previous);
      host.notify({ kind: "error", message: options.updateFailed ?? "Model option update failed" });
    }
  };
  return /* @__PURE__ */ jsxs2(Popover, { open, onOpenChange: setOpen, children: [
    /* @__PURE__ */ jsx2(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsx2(
      "button",
      {
        type: "button",
        className: "cx-pill cx-effort-trigger",
        "data-cxui-effort": "",
        "data-pro": state.effort === "ultra" || void 0,
        "aria-label": `${title}: ${labels[state.effort]}`,
        children: labels[state.effort]
      }
    ) }),
    /* @__PURE__ */ jsx2(PopoverContent, { side: "top", align: "end", sideOffset: 8, className: "cx-effort-pop", children: /* @__PURE__ */ jsx2(
      EffortSlider,
      {
        levels: LEVELS,
        value: state.effort,
        labels,
        recommended: "medium",
        fast: state.fast,
        title,
        ends: [pt("effort.faster"), pt("effort.smarter")],
        recommendedLabel: pt("effort.default"),
        helpLabel: pt("effort.help"),
        autoFocus: true,
        onPick: (level2) => void pick(level2)
      }
    ) })
  ] });
}

// src/i18n.ts
var BUNDLES = {
  en: {
    effort: {
      faster: "Faster",
      smarter: "Smarter",
      default: "Default",
      help: "About reasoning effort"
    },
    quota: {
      title: "Plan usage",
      limited: "Limit reached",
      ring: (name, percent) => `Plan usage: ${name} ${percent}% used`
    },
    rail: {
      title: "Session",
      toggle: "Session panel",
      environment: "Environment",
      goal: "Goal",
      context: "Context",
      connectors: "Connectors",
      background: "Background",
      folder: "Folder",
      branch: "Branch",
      project: "Project",
      gateway: "Gateway",
      noFolder: "No folder",
      noSession: "Start a session to see its details here.",
      noGoal: "No goal or to-dos yet",
      todos: (done, total) => `${done} / ${total} to-dos`,
      turns: (used, max) => `${used} / ${max} turns`,
      compress: "Compress",
      signIn: "Sign in",
      refresh: "Refresh",
      noConnectors: "No MCP servers",
      tools: (n) => `${n} tools`,
      noBackground: "Nothing in the background",
      stop: "Stop",
      finished: "Finished",
      subagent: "Subagent"
    }
  },
  zh: {
    effort: {
      faster: "\u66F4\u5FEB",
      smarter: "\u66F4\u806A\u660E",
      default: "\u9ED8\u8BA4",
      help: "\u5173\u4E8E\u63A8\u7406\u5F3A\u5EA6"
    },
    quota: {
      title: "\u5957\u9910\u7528\u91CF",
      limited: "\u5DF2\u8FBE\u4E0A\u9650",
      ring: (name, percent) => `\u5957\u9910\u7528\u91CF\uFF1A${name} \u5DF2\u7528 ${percent}%`
    },
    rail: {
      title: "\u4F1A\u8BDD",
      toggle: "\u4F1A\u8BDD\u9762\u677F",
      environment: "\u73AF\u5883",
      goal: "\u76EE\u6807",
      context: "\u4E0A\u4E0B\u6587",
      connectors: "\u8FDE\u63A5\u5668",
      background: "\u540E\u53F0",
      folder: "\u6587\u4EF6\u5939",
      branch: "\u5206\u652F",
      project: "\u9879\u76EE",
      gateway: "\u7F51\u5173",
      noFolder: "\u672A\u9009\u62E9\u6587\u4EF6\u5939",
      noSession: "\u5F00\u59CB\u4E00\u4E2A\u4F1A\u8BDD\u540E\uFF0C\u8FD9\u91CC\u4F1A\u663E\u793A\u5B83\u7684\u8BE6\u60C5\u3002",
      noGoal: "\u8FD8\u6CA1\u6709\u76EE\u6807\u6216\u5F85\u529E",
      todos: (done, total) => `\u5F85\u529E ${done} / ${total}`,
      turns: (used, max) => `${used} / ${max} \u8F6E`,
      compress: "\u538B\u7F29",
      signIn: "\u767B\u5F55",
      refresh: "\u5237\u65B0",
      noConnectors: "\u6CA1\u6709 MCP \u670D\u52A1\u5668",
      tools: (n) => `${n} \u4E2A\u5DE5\u5177`,
      noBackground: "\u540E\u53F0\u6CA1\u6709\u4EFB\u52A1",
      stop: "\u505C\u6B62",
      finished: "\u5DF2\u7ED3\u675F",
      subagent: "\u5B50\u4EE3\u7406"
    }
  }
};

// src/quota/index.tsx
import { atom, host as host2, Popover as Popover2, PopoverContent as PopoverContent2, PopoverTrigger as PopoverTrigger2, useI18n as useI18n2, usePluginI18n as usePluginI18n2, useValue as useValue2 } from "@hermes/plugin-sdk";
import { useEffect as useEffect4, useState as useState4 } from "react";

// src/quota/data.ts
var clampPercent = (value) => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : null;
};
var toMs = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value < 1e12 ? value * 1e3 : value;
  }
  if (typeof value === "string" && value) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};
function toQuota(result) {
  const providers = Array.isArray(result?.providers) ? result.providers : [];
  const provider = providers.find((p) => p?.slug === result?.provider) ?? providers.find((p) => p?.is_current);
  if (!provider) {
    return null;
  }
  const rows = [];
  const usage = provider.usage ?? {};
  const accounts = Array.isArray(usage.accounts) ? usage.accounts : [];
  const windows = Array.isArray(usage.windows) && usage.windows.length > 0 ? usage.windows : (accounts.find((a) => a?.state === "ready") ?? accounts.find((a) => a?.state === "limited"))?.windows ?? [];
  for (const w of windows) {
    const percent = clampPercent(w?.used_percent);
    if (percent !== null && typeof w?.label === "string") {
      rows.push({ name: w.label, percent, resetsAt: toMs(w.resets_at) });
    }
  }
  for (const g of provider.plan_usage?.gauges ?? []) {
    const left = clampPercent(typeof g?.left_fraction === "number" ? g.left_fraction * 100 : null);
    if (left !== null && typeof g?.label === "string") {
      rows.push({ name: g.label, percent: 100 - left, resetsAt: toMs(g.resets_at_ms) });
    }
  }
  if (rows.length === 0) {
    return null;
  }
  return { title: String(provider.name ?? provider.slug), rows, limited: Boolean(provider.limit) };
}

// src/quota/model.ts
function level(percent) {
  const p = percent ?? 0;
  return p >= 90 ? "critical" : p >= 75 ? "warning" : "normal";
}
function pickTop(rows) {
  return rows.reduce((top, row) => row.percent !== null && row.percent > (top?.percent ?? -1) ? row : top, null);
}
function resetText(resetsAtMs, now, locale) {
  if (!resetsAtMs) return null;
  const zh = locale === "zh";
  const minutes = Math.max(0, Math.round((resetsAtMs - now) / 6e4));
  if (minutes < 60) return zh ? `${minutes} \u5206\u949F\u540E\u91CD\u7F6E` : `resets in ${minutes}m`;
  if (minutes < 1440) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return zh ? `${h} \u5C0F\u65F6${m ? ` ${m} \u5206\u949F` : ""}\u540E\u91CD\u7F6E` : `resets in ${h}h${m ? ` ${m}m` : ""}`;
  }
  const when = new Date(resetsAtMs).toLocaleDateString(
    zh ? "zh-CN" : "en-US",
    minutes < 10080 ? { weekday: "short" } : { month: "short", day: "numeric" }
  );
  return zh ? `${when}\u91CD\u7F6E` : `resets ${when}`;
}

// src/quota/ring.tsx
import { useEffect as useEffect3, useId, useLayoutEffect as useLayoutEffect2, useRef as useRef2, useState as useState3, useSyncExternalStore as useSyncExternalStore2 } from "react";
import { jsx as jsx3, jsxs as jsxs3 } from "react/jsx-runtime";
var QUIET = { entrance: null, beat: null, queued: null, shimmer: null };
var BEAT_MS = { 1: 2300, 2: 1450, 3: 2450 };
var BAND = { normal: 0, warning: 1, critical: 2 };
var LEDGER = "claude-ui:usageRingMotion";
function readLedger() {
  try {
    return JSON.parse(localStorage.getItem(LEDGER) ?? "{}") ?? {};
  } catch {
    return {};
  }
}
function writeLedger(key, band) {
  const ledger = readLedger();
  const beats = [1, 2, 3].filter((b) => b <= band || ledger[key]?.beats.includes(b));
  delete ledger[key];
  ledger[key] = { drawn: true, beats };
  const keys = Object.keys(ledger);
  for (const old of keys.slice(0, Math.max(0, keys.length - 100))) delete ledger[old];
  try {
    localStorage.setItem(LEDGER, JSON.stringify(ledger));
  } catch {
  }
}
var REDUCE2 = "(prefers-reduced-motion: reduce)";
function subscribeMotion2(onChange) {
  const query = matchMedia(REDUCE2);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
var reducedNow2 = () => matchMedia(REDUCE2).matches;
function UsageRing({ value, size = 18, stroke = 2, motionKey, streaming = false }) {
  const percent = Math.min(100, Math.max(0, value || 0));
  const severity = level(percent);
  const band = percent >= 100 ? 3 : BAND[severity];
  const reduced = useSyncExternalStore2(subscribeMotion2, reducedNow2);
  const [motion, setMotion] = useState3(QUIET);
  const seen = useRef2(null);
  const wasStreaming = useRef2(streaming);
  useLayoutEffect2(() => {
    if (reduced) return;
    const entry = motionKey ? readLedger()[motionKey] : void 0;
    const unplayed = motionKey && band > 0 && !entry?.beats.includes(band) ? band : null;
    const first = seen.current === null || seen.current.key !== motionKey;
    const rose = !first && band > (seen.current?.band ?? 0);
    seen.current = { key: motionKey, band };
    if (first) setMotion((m) => ({ ...m, entrance: motionKey && !entry?.drawn ? "draw" : "quiet", beat: null, queued: unplayed }));
    else if (rose && unplayed) setMotion((m) => m.entrance ? { ...m, queued: unplayed } : { ...m, beat: unplayed });
    else return;
    if (motionKey) writeLedger(motionKey, band);
  }, [motionKey, band, reduced]);
  useEffect3(() => {
    if (!motion.entrance) return;
    const timer = setTimeout(() => setMotion((m) => ({ ...m, entrance: null, beat: m.queued, queued: null })), motion.entrance === "draw" ? 1200 : 200);
    return () => clearTimeout(timer);
  }, [motion.entrance]);
  useEffect3(() => {
    if (!motion.beat) return;
    const timer = setTimeout(() => setMotion((m) => ({ ...m, beat: null })), BEAT_MS[motion.beat]);
    return () => clearTimeout(timer);
  }, [motion.beat]);
  useEffect3(() => {
    if (streaming && !wasStreaming.current && !reduced && percent >= 15) setMotion((m) => ({ ...m, shimmer: (m.shimmer ?? 0) + 1 }));
    wasStreaming.current = streaming;
  }, [streaming, reduced, percent]);
  useEffect3(() => {
    if (motion.shimmer === null) return;
    const timer = setTimeout(() => setMotion((m) => ({ ...m, shimmer: null })), 2e3);
    return () => clearTimeout(timer);
  }, [motion.shimmer]);
  const shown = reduced ? QUIET : motion;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const style = {
    "--cx-usage-size": `${size}px`,
    "--cx-usage-c": circumference,
    // 彗星是 10% 圈长（36°）的一段，从 12 点转到尾端与弧尾对齐
    "--cx-usage-travel": `${Math.max(0, percent * 3.6 - 36)}deg`
  };
  return /* @__PURE__ */ jsx3(
    "span",
    {
      className: "cx-usage-ring",
      style,
      "data-level": severity,
      "data-entrance": shown.entrance ?? void 0,
      "data-beat": shown.beat ?? void 0,
      "data-shimmer": shown.shimmer === null ? void 0 : "",
      "aria-hidden": "true",
      children: /* @__PURE__ */ jsx3("span", { className: "cx-usage-ring__hover", children: /* @__PURE__ */ jsxs3("span", { className: "cx-usage-ring__beat", children: [
        /* @__PURE__ */ jsx3("span", { className: "cx-usage-ring__glow" }),
        /* @__PURE__ */ jsx3("span", { className: "cx-usage-ring__beat-glow" }),
        /* @__PURE__ */ jsx3("span", { className: "cx-usage-ring__hover-glow" }),
        /* @__PURE__ */ jsxs3("span", { className: "cx-usage-ring__breath", children: [
          /* @__PURE__ */ jsxs3("svg", { className: "cx-usage-ring__svg", width: size, height: size, viewBox: `0 0 ${size} ${size}`, children: [
            /* @__PURE__ */ jsx3("circle", { className: "cx-usage-ring__track", cx: center, cy: center, r: radius, strokeWidth: stroke }),
            /* @__PURE__ */ jsx3(
              "circle",
              {
                className: "cx-usage-ring__arc",
                cx: center,
                cy: center,
                r: radius,
                strokeWidth: stroke,
                strokeDasharray: circumference,
                strokeDashoffset: circumference * (1 - percent / 100)
              }
            )
          ] }),
          shown.shimmer !== null && percent >= 15 && /* @__PURE__ */ jsx3("svg", { className: "cx-usage-ring__comet", width: size, height: size, viewBox: `0 0 ${size} ${size}`, children: /* @__PURE__ */ jsx3("circle", { cx: center, cy: center, r: radius, strokeWidth: stroke, strokeDasharray: `${circumference * 0.1} ${circumference}` }) }, shown.shimmer)
        ] })
      ] }) })
    }
  );
}
function QuotaPopoverBody({ title, rows, footnote }) {
  const titleId = useId();
  return /* @__PURE__ */ jsxs3("div", { className: "cx-usage-plan", children: [
    /* @__PURE__ */ jsx3("div", { id: titleId, className: "cx-usage-head", children: title }),
    /* @__PURE__ */ jsx3("div", { className: "cx-usage-list", role: "group", "aria-labelledby": titleId, children: rows.map((row, index) => {
      const pct = Number.isFinite(row.percent) ? Math.round(Math.min(100, Math.max(0, row.percent))) : null;
      return /* @__PURE__ */ jsxs3("div", { className: "cx-usage-row", children: [
        /* @__PURE__ */ jsxs3("div", { className: "cx-usage-row-head", children: [
          /* @__PURE__ */ jsx3("span", { className: "cx-usage-name", children: row.name }),
          /* @__PURE__ */ jsxs3("span", { className: "cx-usage-value", children: [
            row.resetText && /* @__PURE__ */ jsx3("span", { children: row.resetText }),
            pct !== null && /* @__PURE__ */ jsxs3("span", { "aria-hidden": "true", children: [
              pct,
              "%"
            ] })
          ] })
        ] }),
        pct !== null && /* @__PURE__ */ jsx3("div", { className: "cx-usage-bar", role: "meter", "aria-label": row.name, "aria-valuenow": pct, "aria-valuemin": 0, "aria-valuemax": 100, children: pct > 0 && /* @__PURE__ */ jsx3("span", { "data-level": level(pct), style: { "--cx-usage-pct": `${pct}%` } }) })
      ] }, `${index}-${row.name}`);
    }) }),
    footnote && /* @__PURE__ */ jsx3("div", { className: "cx-usage-note", children: footnote })
  ] });
}

// src/quota/index.tsx
import { jsx as jsx4, jsxs as jsxs4 } from "react/jsx-runtime";
var POLL_MS = 5 * 6e4;
var MIN_GAP_MS = 2 * 6e4;
var $quota = atom(null);
var users = 0;
var stopTimer = null;
var lastFetch = 0;
var inflight = false;
async function refreshQuota(force) {
  if (users === 0 || inflight || !force && Date.now() - lastFetch < MIN_GAP_MS) {
    return;
  }
  inflight = true;
  try {
    const sessionId = host2.state.activeSessionId.get();
    const result = await host2.request("model.options", sessionId ? { session_id: sessionId, explicit_only: true } : { explicit_only: true }, 3e4);
    $quota.set(toQuota(result));
  } catch {
  } finally {
    inflight = false;
    lastFetch = Date.now();
  }
}
function bindQuota(ctx2) {
  ctx2.onEvent("message.complete", () => void refreshQuota(false));
  ctx2.onDispose(() => {
    stopTimer?.();
    stopTimer = null;
    users = 0;
  });
}
function useQuotaPolling(enabled) {
  useEffect4(() => {
    if (!enabled) {
      return;
    }
    users += 1;
    if (users === 1) {
      void refreshQuota(true);
      stopTimer = pluginContext()?.setInterval(() => {
        if (document.visibilityState === "visible") {
          void refreshQuota(false);
        }
      }, POLL_MS);
    }
    return () => {
      users -= 1;
      if (users === 0) {
        stopTimer?.();
        stopTimer = null;
      }
    };
  }, [enabled]);
}
function QuotaControl() {
  const active = useThemeActive();
  const quota = useValue2($quota);
  const busy = useValue2(host2.state.busy);
  const { locale } = useI18n2();
  const pt = usePluginI18n2(PLUGIN_ID);
  const [open, setOpen] = useState4(false);
  useQuotaPolling(active);
  if (!active || !quota) {
    return null;
  }
  const now = Date.now();
  const lang = String(locale ?? "").startsWith("zh") ? "zh" : "en";
  const top = pickTop(quota.rows);
  const percent = Math.round(top?.percent ?? 0);
  const label = pt("quota.ring", top?.name ?? "", percent);
  return /* @__PURE__ */ jsxs4(
    Popover2,
    {
      open,
      onOpenChange: (next) => {
        setOpen(next);
        if (next) {
          void refreshQuota(true);
        }
      },
      children: [
        /* @__PURE__ */ jsx4(PopoverTrigger2, { asChild: true, children: /* @__PURE__ */ jsx4("button", { type: "button", className: "cx-pill cx-usage-trigger", "data-cxui-quota": "", "data-limited": quota.limited || void 0, "aria-label": label, children: /* @__PURE__ */ jsx4(UsageRing, { value: percent, size: 14, stroke: 2, motionKey: `plan:${top?.name ?? ""}:${top?.resetsAt ?? ""}`, streaming: busy }) }) }),
        /* @__PURE__ */ jsx4(PopoverContent2, { side: "top", align: "end", sideOffset: 8, className: "cx-usage-pop", children: /* @__PURE__ */ jsx4(
          QuotaPopoverBody,
          {
            title: `${pt("quota.title")} \xB7 ${quota.title}`,
            rows: quota.rows.map((r) => ({ name: r.name, percent: r.percent, resetText: resetText(r.resetsAt, now, lang) })),
            footnote: quota.limited ? pt("quota.limited") : void 0
          }
        ) })
      ]
    }
  );
}

// src/rail/index.tsx
import { atom as atom2, compactNumber, ConnectionGlyph, host as host3, PANES_AREA, useI18n as useI18n3, usePluginI18n as usePluginI18n3, useValue as useValue3 } from "@hermes/plugin-sdk";
import { useEffect as useEffect5, useState as useState5 } from "react";
import { Fragment, jsx as jsx5, jsxs as jsxs5 } from "react/jsx-runtime";
var $todos = atom2({});
var todoProvider = {
  resolve(context) {
    if ($todos.get()[context.sessionId] !== context.todos) {
      queueMicrotask(() => $todos.set({ ...$todos.get(), [context.sessionId]: context.todos }));
    }
    return [];
  }
};
function useLive(load, deps, events = [], debounceMs = 600) {
  const [data, setData] = useState5(null);
  const [tick, setTick] = useState5(0);
  useEffect5(() => {
    let live = true;
    load().then((value) => live && setData(value)).catch(() => live && setData(null));
    return () => {
      live = false;
    };
  }, [...deps, tick]);
  useEffect5(() => {
    if (events.length === 0) {
      return;
    }
    let timer;
    const offs = events.map(
      (type) => host3.onEvent(type, () => {
        clearTimeout(timer);
        timer = setTimeout(() => setTick((n) => n + 1), debounceMs);
      })
    );
    return () => {
      clearTimeout(timer);
      offs.forEach((off) => typeof off === "function" && off());
    };
  }, deps);
  return [data, () => setTick((n) => n + 1)];
}
var basename = (path) => path.replace(/[\\/]+$/, "").split(/[\\/]/).pop() || path;
function Card({ id, title, action, children }) {
  const storage = pluginContext()?.storage;
  const [folded, setFolded] = useState5(() => Boolean(storage?.get(`fold.${id}`, false)));
  const toggle = () => {
    setFolded(!folded);
    storage?.set(`fold.${id}`, !folded);
  };
  return /* @__PURE__ */ jsxs5("section", { className: "cx-card", "data-folded": folded || void 0, children: [
    /* @__PURE__ */ jsxs5("header", { className: "cx-card-head", children: [
      /* @__PURE__ */ jsxs5("button", { type: "button", className: "cx-card-title", "aria-expanded": !folded, onClick: toggle, children: [
        /* @__PURE__ */ jsx5("span", { className: "dither cx-card-dither", "aria-hidden": "true" }),
        title
      ] }),
      action
    ] }),
    !folded && /* @__PURE__ */ jsx5("div", { className: "cx-card-body", children })
  ] });
}
function Row({ label, children, title }) {
  return /* @__PURE__ */ jsxs5("div", { className: "cx-row", title, children: [
    /* @__PURE__ */ jsx5("span", { className: "cx-row-label", children: label }),
    children !== void 0 && /* @__PURE__ */ jsx5("span", { className: "cx-row-value", children })
  ] });
}
function EnvironmentCard({ sessionId }) {
  const pt = usePluginI18n3(PLUGIN_ID);
  const primaryCwd = useValue3(host3.state.cwd);
  const profile = useValue3(host3.state.profile);
  const connectionId = useValue3(host3.state.connectionId);
  const [info, setInfo] = useState5({});
  useEffect5(() => {
    setInfo({});
    const off = host3.onEvent("session.info", (event) => {
      if (event?.session_id && event.session_id !== sessionId) {
        return;
      }
      const p = event?.payload ?? {};
      setInfo((prev) => ({ cwd: p.cwd ?? prev.cwd, branch: p.branch ?? prev.branch }));
    });
    return () => typeof off === "function" && off();
  }, [sessionId]);
  const folder = info.cwd || primaryCwd || "";
  const [project] = useLive(() => folder ? host3.request("projects.for_cwd", { cwd: folder }) : Promise.resolve(null), [folder]);
  const [connections] = useLive(() => host3.connections().catch(() => []), []);
  const connection = connections?.find((c) => c.id === connectionId) ?? connections?.find((c) => c.primary);
  const branch = info.branch || project?.branch;
  return /* @__PURE__ */ jsxs5(Card, { id: "environment", title: pt("rail.environment"), children: [
    /* @__PURE__ */ jsx5(Row, { label: pt("rail.folder"), title: folder || void 0, children: folder ? /* @__PURE__ */ jsx5("span", { className: "cx-strong", children: basename(folder) }) : /* @__PURE__ */ jsx5("span", { className: "cx-muted", children: pt("rail.noFolder") }) }),
    branch && /* @__PURE__ */ jsx5(Row, { label: pt("rail.branch"), children: /* @__PURE__ */ jsx5("span", { className: "cx-mono", children: branch }) }),
    project?.project?.name && /* @__PURE__ */ jsx5(Row, { label: pt("rail.project"), children: project.project.name }),
    /* @__PURE__ */ jsx5(Row, { label: pt("rail.gateway"), children: /* @__PURE__ */ jsxs5("span", { className: "cx-inline", children: [
      connection && /* @__PURE__ */ jsx5(ConnectionGlyph, { connection, className: "cx-glyph" }),
      /* @__PURE__ */ jsx5("span", { children: connection?.label ?? "local" }),
      profile && /* @__PURE__ */ jsxs5("span", { className: "cx-muted", children: [
        "\xB7 ",
        profile
      ] })
    ] }) })
  ] });
}
var TODO_GLYPH = { completed: "\u25CF", in_progress: "\u25D0", cancelled: "\u2298" };
function GoalCard({ sessionId }) {
  const pt = usePluginI18n3(PLUGIN_ID);
  const todosBySession = useValue3($todos);
  const [control] = useLive(
    () => sessionId ? host3.request("session.control.read", { session_id: sessionId }).then((r) => r?.control ?? null) : Promise.resolve(null),
    [sessionId],
    ["session.control.update"]
  );
  const goal = control?.goal;
  const todos = sessionId && todosBySession[sessionId] || [];
  const done = todos.filter((t) => t?.status === "completed").length;
  return /* @__PURE__ */ jsxs5(Card, { id: "goal", title: pt("rail.goal"), children: [
    !goal && todos.length === 0 && /* @__PURE__ */ jsx5("span", { className: "cx-muted", children: pt("rail.noGoal") }),
    goal && /* @__PURE__ */ jsxs5("div", { className: "cx-goal", children: [
      /* @__PURE__ */ jsx5("span", { className: "cx-strong", children: goal.title }),
      /* @__PURE__ */ jsxs5("span", { className: "cx-muted", children: [
        goal.status,
        goal.max_turns ? ` \xB7 ${pt("rail.turns", goal.turns_used ?? 0, goal.max_turns)}` : ""
      ] }),
      (goal.subgoals ?? []).map((s, i) => /* @__PURE__ */ jsx5("span", { className: "cx-subgoal", children: s }, i))
    ] }),
    todos.length > 0 && /* @__PURE__ */ jsxs5("div", { className: "cx-todos", children: [
      /* @__PURE__ */ jsx5("span", { className: "cx-muted", children: pt("rail.todos", done, todos.length) }),
      todos.map((todo, i) => /* @__PURE__ */ jsxs5("span", { className: "cx-todo", "data-status": todo?.status, children: [
        /* @__PURE__ */ jsx5("span", { className: "cx-todo-glyph", "aria-hidden": "true", children: TODO_GLYPH[todo?.status] ?? "\u25CB" }),
        /* @__PURE__ */ jsx5("span", { children: todo?.content ?? "" })
      ] }, todo?.id ?? i))
    ] })
  ] });
}
function ContextCard({ sessionId }) {
  const pt = usePluginI18n3(PLUGIN_ID);
  const { t } = useI18n3();
  const usage = useValue3(host3.state.focusedUsage);
  const busy = useValue3(host3.state.busy);
  const [breakdown] = useLive(
    () => sessionId ? host3.request("session.context_breakdown", { session_id: sessionId }) : Promise.resolve(null),
    [sessionId],
    ["message.complete"],
    1500
  );
  const used = usage?.context_used ?? breakdown?.context_used ?? 0;
  const max = usage?.context_max ?? breakdown?.context_max ?? 0;
  const percent = max > 0 ? Math.round(used / max * 100) : null;
  const names = t?.shell?.statusbar?.contextUsagePanel?.categories ?? {};
  const categories = (breakdown?.categories ?? []).filter((c) => c?.tokens > 0);
  return /* @__PURE__ */ jsxs5(
    Card,
    {
      id: "context",
      title: pt("rail.context"),
      action: sessionId && percent !== null && percent >= 50 ? /* @__PURE__ */ jsx5("button", { type: "button", className: "cx-mini", disabled: busy, onClick: () => host3.composer.submit(sessionId, "/compress"), children: pt("rail.compress") }) : void 0,
      children: [
        /* @__PURE__ */ jsx5("div", { className: "cx-meter", role: "img", "aria-label": percent === null ? "" : `${percent}%`, children: categories.length > 0 && max > 0 ? categories.map((c) => /* @__PURE__ */ jsx5("span", { style: { width: `${c.tokens / max * 100}%`, background: c.color } }, c.id)) : percent !== null && /* @__PURE__ */ jsx5("span", { style: { width: `${percent}%`, background: "var(--ui-text-tertiary)" } }) }),
        /* @__PURE__ */ jsx5(Row, { label: max > 0 ? `${compactNumber(used)} / ${compactNumber(max)}` : "\u2014", children: percent !== null ? `${percent}%` : "" }),
        categories.length > 0 && /* @__PURE__ */ jsx5("div", { className: "cx-legend", children: categories.slice(0, 6).map((c) => /* @__PURE__ */ jsxs5("span", { children: [
          /* @__PURE__ */ jsx5("i", { style: { background: c.color } }),
          names[c.id] ?? c.label
        ] }, c.id)) })
      ]
    }
  );
}
var TONE = { connected: "good", connecting: "busy", lazy: "muted", configured: "muted", disabled: "off", failed: "bad" };
function ConnectorsCard() {
  const pt = usePluginI18n3(PLUGIN_ID);
  const [status, reload] = useLive(() => host3.request("mcp.servers.status", {}), [], ["session.info"], 2e3);
  const servers = status?.servers ?? [];
  return /* @__PURE__ */ jsxs5(
    Card,
    {
      id: "connectors",
      title: pt("rail.connectors"),
      action: /* @__PURE__ */ jsx5("button", { type: "button", className: "cx-icon", "aria-label": pt("rail.refresh"), onClick: reload, children: /* @__PURE__ */ jsx5("i", { className: "codicon codicon-refresh" }) }),
      children: [
        servers.length === 0 && /* @__PURE__ */ jsx5("span", { className: "cx-muted", children: pt("rail.noConnectors") }),
        servers.map((server) => /* @__PURE__ */ jsxs5("div", { className: "cx-row", children: [
          /* @__PURE__ */ jsxs5("span", { className: "cx-inline", children: [
            /* @__PURE__ */ jsx5("span", { className: "cx-dot", "data-tone": server.needs_auth ? "warn" : TONE[server.status] ?? "muted" }),
            /* @__PURE__ */ jsx5("span", { className: "cx-strong", children: server.name })
          ] }),
          server.needs_auth ? /* @__PURE__ */ jsx5("button", { type: "button", className: "cx-mini cx-accent", onClick: () => host3.completeMcpOAuth({ serverName: server.name }).finally(reload), children: pt("rail.signIn") }) : /* @__PURE__ */ jsx5("span", { className: "cx-muted", children: server.disabled ? "\u2014" : pt("rail.tools", server.tools ?? 0) })
        ] }, server.name))
      ]
    }
  );
}
var isRunning = (status) => !status || /run|start|active|pending/i.test(status);
function BackgroundCard({ sessionId }) {
  const pt = usePluginI18n3(PLUGIN_ID);
  const [processes, reloadProcesses] = useLive(
    () => sessionId ? host3.request("process.list", { session_id: sessionId }).then((r) => r?.processes ?? []) : Promise.resolve([]),
    [sessionId],
    ["status.update", "tool.complete"],
    800
  );
  const [subagents, reloadSubagents] = useLive(
    () => sessionId ? host3.request("subagent.list", { session_id: sessionId }).then((r) => r?.subagents ?? []) : Promise.resolve([]),
    [sessionId],
    ["subagent.start", "subagent.complete", "subagent.progress"],
    800
  );
  const procs = processes ?? [];
  const subs = subagents ?? [];
  const stop = (method, params, reload) => host3.request(method, { session_id: sessionId, ...params }).catch(() => void 0).finally(reload);
  return /* @__PURE__ */ jsxs5(Card, { id: "background", title: pt("rail.background"), children: [
    procs.length === 0 && subs.length === 0 && /* @__PURE__ */ jsx5("span", { className: "cx-muted", children: pt("rail.noBackground") }),
    procs.map((p) => {
      const running = isRunning(p.status) && p.exit_code == null;
      return /* @__PURE__ */ jsxs5("div", { className: "cx-row", title: p.command, children: [
        /* @__PURE__ */ jsxs5("span", { className: "cx-inline cx-ellipsis", children: [
          /* @__PURE__ */ jsx5("span", { className: "cx-dot", "data-tone": running ? "busy" : p.exit_code ? "bad" : "muted" }),
          /* @__PURE__ */ jsx5("span", { className: "cx-mono cx-ellipsis", children: p.command ?? p.session_id })
        ] }),
        running ? /* @__PURE__ */ jsx5("button", { type: "button", className: "cx-icon", "aria-label": pt("rail.stop"), onClick: () => stop("process.kill", { process_id: p.session_id }, reloadProcesses), children: /* @__PURE__ */ jsx5("i", { className: "codicon codicon-debug-stop" }) }) : /* @__PURE__ */ jsx5("span", { className: "cx-muted", children: p.exit_code != null ? `exit ${p.exit_code}` : pt("rail.finished") })
      ] }, p.session_id);
    }),
    subs.map((s) => {
      const running = isRunning(s.status);
      return /* @__PURE__ */ jsxs5("div", { className: "cx-row", title: s.goal ?? void 0, children: [
        /* @__PURE__ */ jsxs5("span", { className: "cx-inline cx-ellipsis", children: [
          /* @__PURE__ */ jsx5("span", { className: "cx-dot", "data-tone": running ? "busy" : "muted" }),
          /* @__PURE__ */ jsx5("span", { className: "cx-ellipsis", children: s.goal || pt("rail.subagent") })
        ] }),
        running ? /* @__PURE__ */ jsx5("button", { type: "button", className: "cx-icon", "aria-label": pt("rail.stop"), onClick: () => stop("subagent.interrupt", { subagent_id: s.subagent_id }, reloadSubagents), children: /* @__PURE__ */ jsx5("i", { className: "codicon codicon-debug-stop" }) }) : /* @__PURE__ */ jsx5("span", { className: "cx-muted", children: s.status ?? "" })
      ] }, s.subagent_id);
    })
  ] });
}
function Rail() {
  const pt = usePluginI18n3(PLUGIN_ID);
  const sessionId = useValue3(host3.state.focusedSessionId);
  return /* @__PURE__ */ jsxs5("div", { className: "cx-rail", "data-cxui-rail": "", children: [
    /* @__PURE__ */ jsx5(EnvironmentCard, { sessionId }),
    sessionId ? /* @__PURE__ */ jsxs5(Fragment, { children: [
      /* @__PURE__ */ jsx5(GoalCard, { sessionId }),
      /* @__PURE__ */ jsx5(ContextCard, { sessionId })
    ] }) : /* @__PURE__ */ jsx5("p", { className: "cx-muted cx-rail-empty", children: pt("rail.noSession") }),
    /* @__PURE__ */ jsx5(ConnectorsCard, {}),
    sessionId && /* @__PURE__ */ jsx5(BackgroundCard, { sessionId })
  ] });
}
var NARROW_PX = 1e3;
function RailManager() {
  const active = useThemeActive();
  const pt = usePluginI18n3(PLUGIN_ID);
  const viewport = useValue3(host3.state.viewport);
  const ctx2 = pluginContext();
  const [wanted, setWanted] = useState5(() => Boolean(ctx2?.storage.get("rail", true)));
  const wide = !viewport?.narrow && (viewport?.width ?? NARROW_PX) >= NARROW_PX;
  const shown = active && wanted && wide;
  useEffect5(() => {
    if (!shown || !ctx2) {
      return;
    }
    return ctx2.register({
      id: "rail",
      area: PANES_AREA,
      title: pt("rail.title"),
      data: {
        placement: "main",
        dock: { pane: "workspace", pos: "right", enforce: true },
        width: "260px",
        minWidth: "232px",
        maxWidth: "360px",
        headerVeto: true,
        uncloseable: true
      },
      render: () => /* @__PURE__ */ jsx5(Rail, {})
    });
  }, [shown]);
  useEffect5(() => {
    if (!active || !ctx2) {
      return;
    }
    return ctx2.register({
      id: "rail-toggle",
      area: "titleBar.tools.right",
      data: {
        id: "claude-ui-rail",
        label: pt("rail.toggle"),
        icon: /* @__PURE__ */ jsx5("i", { className: "codicon codicon-layout-sidebar-right" }),
        active: shown,
        disabled: !wide,
        onSelect: () => {
          ctx2.storage.set("rail", !wanted);
          setWanted(!wanted);
        }
      }
    });
  }, [active, wanted, wide, shown, pt]);
  return null;
}

// src/styles/components.css
var components_default = "/* \u2500\u2500 Claude UI \xB7 \u81EA\u5EFA\u7EC4\u4EF6\uFF08\u989D\u5EA6\u73AF\u3001\u63A8\u7406\u5F3A\u5EA6\u5165\u53E3\u3001\u4F1A\u8BDD\u680F\uFF09\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n/* \u9009\u62E9\u5668\u884C\u91CC\u7684\u5C0F\u6309\u94AE\uFF1A\u4E0E Hermes \u7684\u6A21\u578B pill \u540C\u9AD8\uFF0Csecondary \u8272 */\n:root .cx-pill {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  gap: 4px;\n  height: var(--composer-control-size, 1.5rem);\n  min-width: var(--composer-control-size, 1.5rem);\n  padding: 0 6px;\n  border: 0;\n  border-radius: var(--cx-radius-control);\n  background: transparent;\n  color: var(--ui-text-secondary);\n  font: inherit;\n  font-size: var(--conversation-caption-font-size, 0.75rem);\n  white-space: nowrap;\n  cursor: pointer;\n  transition:\n    background-color var(--cx-dur-snap) ease-out,\n    color var(--cx-dur-snap) ease-out;\n}\n\n:root .cx-pill:hover,\n:root .cx-pill[data-state='open'] {\n  background: var(--chrome-action-hover);\n  color: var(--ui-text-primary);\n}\n\n:root .cx-pill[data-pro] {\n  color: var(--cx-pro);\n}\n\n:root .cx-usage-trigger {\n  padding: 0 4px;\n}\n\n/* \u63A8\u7406\u5F3A\u5EA6\uFF1A\u6A21\u578B\u4E0D\u652F\u6301\u63A8\u7406\u65F6\u539F\u751F pill \u4E0D\u6E32\u67D3\uFF0C\u6211\u4EEC\u4E5F\u8BA9\u4F4D\uFF1B\u6211\u4EEC\u5728\u65F6\u539F\u751F pill \u6536\u8D77\uFF08\u53EA\u5728\u4E3B\u4F1A\u8BDD\uFF09 */\n:root [data-slot='composer-root']:not(:has([data-testid='reasoning-pill'])) [data-cxui-effort] {\n  display: none;\n}\n\n:root [data-chat-surface][data-composer-target='main'] [data-slot='composer-root']:has([data-cxui-effort]) [data-testid='reasoning-pill'] {\n  display: none !important;\n}\n\n/* tile\uFF08\u5206\u5C4F\u4F1A\u8BDD\uFF09\u4FDD\u7559 Hermes \u539F\u751F\u63A7\u4EF6 */\n:root [data-chat-surface]:not([data-composer-target='main']) :is([data-cxui-effort], [data-cxui-quota]) {\n  display: none;\n}\n\n/* \u2500\u2500 \u4F1A\u8BDD\u680F \u2500\u2500 */\n:root .cx-rail {\n  display: flex;\n  flex-direction: column;\n  gap: 10px;\n  height: 100%;\n  overflow-y: auto;\n  padding: 10px 10px 14px;\n  color: var(--ui-text-secondary);\n  font-size: 12px;\n  line-height: 1.45;\n  scrollbar-width: none;\n}\n\n:root .cx-rail-empty {\n  margin: 0;\n  padding: 0 4px;\n}\n\n:root .cx-card {\n  border-radius: var(--cx-radius-card);\n  background: var(--cx-surface);\n  box-shadow: var(--cx-edge);\n}\n\n:root .cx-card-head {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 6px;\n  min-height: 30px;\n  padding: 0 6px 0 10px;\n}\n\n/* \u5361\u7247\u6807\u9898\u6CBF\u7528 Hermes \u4FA7\u680F\u7684\u5927\u5199\u5206\u7EC4\u6807\u9898 + dither \u65B9\u70B9 */\n:root .cx-card-title {\n  display: inline-flex;\n  align-items: center;\n  gap: 6px;\n  padding: 0;\n  border: 0;\n  background: none;\n  color: var(--theme-primary);\n  font: inherit;\n  font-size: 0.64rem;\n  font-weight: 500;\n  letter-spacing: 0.08em;\n  text-transform: uppercase;\n  cursor: pointer;\n}\n\n:root .cx-card-dither {\n  width: 7px;\n  height: 7px;\n  flex: none;\n  transition: transform var(--cx-dur-snap) var(--cx-ease-snap);\n}\n\n:root .cx-card[data-folded] .cx-card-dither {\n  transform: scale(0.7);\n  opacity: 0.6;\n}\n\n:root .cx-card-body {\n  display: grid;\n  gap: 4px;\n  padding: 0 10px 10px;\n  min-width: 0;\n}\n\n:root .cx-row {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 8px;\n  min-height: 22px;\n  min-width: 0;\n}\n\n:root .cx-row-label {\n  color: var(--ui-text-tertiary);\n  white-space: nowrap;\n}\n\n:root .cx-row-value {\n  min-width: 0;\n  overflow: hidden;\n  text-align: right;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n:root .cx-strong {\n  color: var(--ui-text-primary);\n}\n\n:root .cx-muted {\n  color: var(--ui-text-tertiary);\n}\n\n:root .cx-mono {\n  font-family: var(--dt-font-mono);\n  font-size: 11px;\n}\n\n:root .cx-inline {\n  display: inline-flex;\n  align-items: center;\n  gap: 6px;\n  min-width: 0;\n}\n\n:root .cx-ellipsis {\n  min-width: 0;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n:root .cx-glyph {\n  flex: none;\n  color: var(--ui-text-tertiary);\n}\n\n:root .cx-goal,\n:root .cx-todos {\n  display: grid;\n  gap: 3px;\n}\n\n:root .cx-subgoal {\n  padding-left: 10px;\n  border-left: 2px solid var(--cx-line-strong);\n}\n\n:root .cx-todo {\n  display: flex;\n  gap: 6px;\n  align-items: baseline;\n}\n\n:root .cx-todo-glyph {\n  width: 10px;\n  flex: none;\n  color: var(--ui-text-tertiary);\n  font-size: 9px;\n}\n\n:root .cx-todo[data-status='in_progress'] {\n  color: var(--ui-text-primary);\n}\n\n:root .cx-todo[data-status='in_progress'] .cx-todo-glyph {\n  color: var(--ui-accent);\n}\n\n:root .cx-todo[data-status='completed'] {\n  color: var(--ui-text-tertiary);\n  text-decoration: line-through;\n  text-decoration-color: var(--cx-line-strong);\n}\n\n/* \u4E0A\u4E0B\u6587\u5360\u7528\u6761\uFF1A\u5206\u6BB5\uFF0C\u989C\u8272\u6765\u81EA Hermes \u7684 --context-usage-* */\n:root .cx-meter {\n  display: flex;\n  height: 6px;\n  overflow: hidden;\n  border-radius: 3px;\n  background: color-mix(in srgb, var(--ui-base) 8%, transparent);\n}\n\n:root .cx-meter > span {\n  height: 100%;\n  transition: width var(--cx-dur-base) var(--cx-ease-out);\n}\n\n:root .cx-legend {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 2px 10px;\n  color: var(--ui-text-tertiary);\n  font-size: 11px;\n}\n\n:root .cx-legend i {\n  display: inline-block;\n  width: 6px;\n  height: 6px;\n  margin-right: 4px;\n  border-radius: 2px;\n  vertical-align: 1px;\n}\n\n/* \u72B6\u6001\u70B9\uFF1Acodex-ui \u7684 6px \u5706\u70B9 */\n:root .cx-dot {\n  width: 6px;\n  height: 6px;\n  flex: none;\n  border-radius: 50%;\n  background: var(--ui-text-tertiary);\n}\n\n:root .cx-dot[data-tone='good'] {\n  background: var(--ui-green);\n}\n\n:root .cx-dot[data-tone='warn'] {\n  background: var(--cx-warning-fill);\n}\n\n:root .cx-dot[data-tone='bad'] {\n  background: var(--ui-red);\n}\n\n:root .cx-dot[data-tone='off'] {\n  background: var(--cx-line-strong);\n}\n\n:root .cx-dot[data-tone='busy'] {\n  background: var(--ui-text-tertiary);\n  animation: cx-blink 1.2s ease-in-out infinite;\n}\n\n/* \u5361\u7247\u91CC\u7684\u5C0F\u6309\u94AE */\n:root :is(.cx-mini, .cx-icon) {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  height: 22px;\n  border: 0;\n  border-radius: var(--cx-radius-control);\n  background: transparent;\n  color: var(--ui-text-secondary);\n  font: inherit;\n  font-size: 11px;\n  cursor: pointer;\n  transition: background-color var(--cx-dur-snap) ease-out;\n}\n\n:root .cx-mini {\n  padding: 0 8px;\n  box-shadow: inset 0 0 0 1px var(--cx-line);\n}\n\n:root .cx-icon {\n  width: 22px;\n  color: var(--ui-text-tertiary);\n}\n\n:root :is(.cx-mini, .cx-icon):hover:not(:disabled) {\n  background: var(--cx-hover);\n  color: var(--ui-text-primary);\n}\n\n:root :is(.cx-mini, .cx-icon):disabled {\n  cursor: default;\n  opacity: 0.4;\n}\n\n:root .cx-mini.cx-accent {\n  color: var(--ui-accent);\n  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ui-accent) 40%, transparent);\n}\n\n@media (prefers-reduced-motion: reduce) {\n  :root .cx-dot[data-tone='busy'] {\n    animation: none;\n  }\n}\n";

// src/styles/composer.css
var composer_default = "/* \u2500\u2500 Claude UI \xB7 composer \u4E0E\u505C\u9760\u5361 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n   \u8F93\u5165\u6846\uFF1A\u4E0D\u900F\u660E\u5361\u9762 + \u4E00\u5708\u58A8\u8272\u7EC6\u73AF + 3.5% \u8F6F\u9634\u5F71\uFF0C\u805A\u7126\u65F6\u9634\u5F71\u52A0\u6DF1\uFF08codex-ui composer.css:301\uFF09\u3002\n   \u5BA1\u6279\u5361\u3001\u63D0\u95EE\u5361\uFF1A\u4ECE\u6D88\u606F\u6D41\u91CC\u300C\u505C\u9760\u300D\u5230\u8F93\u5165\u6846\u6B63\u4E0A\u65B9 6px\uFF0C\u4E0E\u8F93\u5165\u6846\u540C\u5BBD\uFF0C\u6EDA\u52A8\u65F6\u5438\u4F4F\u4E0D\u8D70\u3002 */\n\n/* \u6D88\u606F\u89C6\u53E3\u7684\u5E95\u8FB9\u6BD4\u8F93\u5165\u6846\u5361\u9762\u9876\u8FB9\u4F4E (composer \u6D4B\u91CF\u9AD8\u5EA6 \u2212 1.125rem \u2212 3px)\uFF0C\u518D\u7559 6px \u7F1D\u3002\n   \u6D4B\u91CF\u503C\u5185\u8054\u5728\u6BCF\u4E2A [data-chat-surface] \u4E0A\uFF0C\u6240\u4EE5\u8FD9\u4E2A\u91CF\u4E5F\u5FC5\u987B\u5728\u90A3\u91CC\u6C42\u503C\u3002 */\n:root [data-chat-surface] {\n  --cx-dock-offset: calc(var(--composer-measured-height, 48px) - 1.125rem + 9px);\n}\n\n:root [data-slot='composer-root'],\n:root [data-slot='composer-root'][data-thread-scrolled-up] {\n  --composer-fill: var(--cx-popover);\n}\n\n:root [data-slot='composer-surface'] {\n  border-color: var(--cx-line) !important;\n  box-shadow: var(--cx-shadow-composer);\n  transition:\n    box-shadow var(--cx-dur-base) cubic-bezier(0.4, 0, 0.2, 1),\n    border-color var(--cx-dur-snap) ease-out;\n}\n\n:root [data-slot='composer-surface']:hover {\n  border-color: var(--cx-line-strong) !important;\n}\n\n:root [data-slot='composer-root']:focus-within [data-slot='composer-surface'] {\n  box-shadow: var(--cx-shadow-composer-focus);\n}\n\n/* \u9009\u62E9\u5668\u884C\uFF1A\u6A21\u578B\u3001\u63A8\u7406\u5F3A\u5EA6\u7528 secondary \u8272\uFF0Chover \u624D\u5230 primary */\n:root [data-slot='composer-root'] :is([data-tour='model-pill'], [data-testid='reasoning-pill'], [aria-label='Open model picker']) {\n  color: var(--ui-text-secondary);\n}\n\n:root [data-slot='composer-root'] :is([data-tour='model-pill'], [data-testid='reasoning-pill'], [aria-label='Open model picker']):hover {\n  color: var(--ui-text-primary);\n}\n\n/* \u2500\u2500 \u505C\u9760\uFF1A\u6709\u5F85\u5904\u7406\u7684\u5BA1\u6279\u6216\u63D0\u95EE\u65F6\uFF0C\u6D88\u606F\u5E95\u90E8\u53EA\u7ED9\u5B83\u4EEC\u7559\u51FA\u5361\u7247\u5230\u8F93\u5165\u6846\u7684\u8DDD\u79BB \u2500\u2500 */\n:root [data-chat-surface]:has([data-slot='tool-approval-stack'], form[data-clarify-batch]:not([data-clarify-batch-preview])) {\n  --thread-last-message-clearance: var(--cx-dock-offset) !important;\n}\n\n/* \u4E0E\u8F93\u5165\u6846\u5361\u9762\u5DE6\u53F3\u5BF9\u9F50\uFF1A\u5185\u5BB9\u5217\u5DE6\u53F3\u5404\u6709 24px \u5185\u8FB9\u8DDD\u3001\u53F3\u4FA7\u591A 8px \u6EDA\u52A8\u6761\u69FD\u4F4D\uFF1B\u8F93\u5165\u6846\u5DE6\u53F3\u5404\u5185\u7F29 1rem */\n:root [data-slot='tool-approval-stack'] {\n  position: sticky;\n  bottom: var(--cx-dock-offset);\n  z-index: 30;\n  width: calc(100% + 24px);\n  max-width: none;\n  margin-left: -8px;\n}\n\n:root [data-slot='aui_assistant-message-root']:has(form[data-clarify-batch]:not([data-clarify-batch-preview])),\n:root [data-slot='aui_assistant-message-content']:has(> form[data-clarify-batch]:not([data-clarify-batch-preview])) {\n  overflow: visible;\n}\n\n:root form[data-clarify-batch]:not([data-clarify-batch-preview]) {\n  position: sticky;\n  bottom: var(--cx-dock-offset);\n  z-index: 30;\n  width: calc(100% + 36px);\n  /* \u56DE\u5408\u5BB9\u5668\u5E95\u90E8\u8FD8\u6709 5px \u7559\u767D\uFF0C\u5403\u6389\u5B83\uFF0C\u63D0\u95EE\u5361\u4E0E\u5BA1\u6279\u5361\u79BB\u8F93\u5165\u6846\u90FD\u662F 6px */\n  margin: 0.5rem 0 -5px -20px;\n}\n\n/* \u2500\u2500 \u5BA1\u6279\u5361\uFF08codex-ui approval-card\uFF09\u2500\u2500 */\n/* \u6D3B\u52A8\u6458\u8981\u884C\u4E0E\u6D88\u606F\u6B63\u6587\u7684\u7F29\u8FDB\u5BF9\u9F50 */\n:root [data-slot='tool-approval-stack'] [data-approval-activity] {\n  padding-left: 20px;\n}\n\n:root [data-slot='tool-approval-stack'] :is([data-slot='card-stack-surface'], [data-slot='card-stack-edge']) {\n  border-color: transparent;\n  border-radius: var(--cx-radius-dock);\n  background: var(--cx-popover);\n  box-shadow: var(--cx-edge), var(--cx-shadow-composer);\n}\n\n:root [data-slot='tool-approval-stack'] [data-slot='card-stack-edge'] {\n  background: var(--cx-surface);\n  box-shadow: var(--cx-edge);\n}\n\n:root [data-slot='tool-approval-card'] {\n  padding: 6px 4px 2px;\n}\n\n:root [data-slot='tool-approval-card'] > div:first-child {\n  color: var(--ui-text-primary);\n  font-weight: 500;\n}\n\n:root [data-slot='tool-approval-card'] > pre {\n  margin: 6px 10px 4px;\n  padding: 8px 12px;\n  border-radius: 5px;\n  background: color-mix(in srgb, var(--ui-base) 5%, transparent);\n  color: var(--ui-text-secondary);\n}\n\n/* \u2500\u2500 \u505C\u9760\u5361\u91CC\u7684\u4E3B\u6309\u94AE\u4E0E\u53D1\u9001\u952E\u540C\u8272\uFF08\u58A8\u8272\uFF09\uFF0C\u6B21\u6309\u94AE\u662F\u5E26\u7EC6\u73AF\u7684\u8FD1\u900F\u660E\u5E95 \u2500\u2500 */\n:root :is([data-slot='tool-approval-actions'], form[data-clarify-batch]) [data-slot='button'][data-variant='default'] {\n  border-color: transparent;\n  background: var(--ui-text-primary);\n  color: var(--ui-bg-chrome);\n}\n\n:root :is([data-slot='tool-approval-actions'], form[data-clarify-batch]) [data-slot='button'][data-variant='default']:hover {\n  background: color-mix(in srgb, var(--ui-text-primary) 86%, var(--ui-bg-chrome));\n}\n\n:root [data-slot='tool-approval-actions'] [data-variant='secondary'] {\n  border-color: transparent;\n  background: color-mix(in srgb, #fff 10%, transparent);\n  box-shadow: inset 0 0 0 1px var(--cx-line), 0 1px 2px #0000000d;\n  color: var(--ui-text-primary);\n}\n\n:root [data-slot='tool-approval-actions'] [data-variant='secondary']:hover {\n  background: var(--cx-hover);\n}\n\n:root :is([data-slot='tool-approval-actions'], form[data-clarify-batch]) [data-slot='button'] {\n  border-radius: var(--cx-radius-control);\n}\n\n/* \u2500\u2500 \u63D0\u95EE\u5361\uFF08codex-ui question card\uFF09\uFF1A\u6574\u5F20 form \u5F53\u5361\u9762\uFF0C\u6309\u94AE\u6536\u8FDB\u5361\u7247\u5E95\u90E8 \u2500\u2500 */\n:root form[data-clarify-batch] {\n  gap: 10px;\n  padding: 12px 12px 10px;\n  border-radius: var(--cx-radius-dock);\n  background: var(--cx-popover);\n  box-shadow: var(--cx-edge), var(--cx-shadow-composer);\n}\n\n:root form[data-clarify-batch] > [data-slot='clarify-inline'] {\n  padding: 0;\n  border-radius: 0;\n  background: transparent;\n}\n\n/* \u5934\u90E8\u7684\u300C0 of 2 answered\u300D\u505A\u6210 codex-ui \u7684\u6B65\u6570\u80F6\u56CA */\n:root form[data-clarify-batch] > [data-slot='clarify-inline'] > div:first-child > span:first-child {\n  flex: none;\n  padding: 1px 7px;\n  border-radius: 999px;\n  background: var(--cx-warning-bg);\n  color: var(--cx-warning);\n  font-weight: 500;\n}\n\n:root form[data-clarify-batch] > [data-slot='clarify-inline'] > div:first-child {\n  justify-content: space-between;\n}\n\n:root form[data-clarify-batch] [data-clarify-batch-question] > div:first-child > span:first-child {\n  font-weight: 600;\n}\n\n:root form[data-clarify-batch] [data-choice],\n:root form[data-clarify-batch] [role='group'] > label {\n  min-height: 28px;\n  padding: 4px 8px;\n  border-radius: var(--cx-radius-control);\n  transition: background-color var(--cx-dur-snap) ease-out;\n}\n\n:root form[data-clarify-batch] [data-choice]:hover,\n:root form[data-clarify-batch] :is([data-choice], label)[data-highlighted] {\n  background: var(--cx-hover);\n}\n\n:root form[data-clarify-batch] [data-choice][aria-pressed='true'] {\n  background: color-mix(in srgb, var(--ui-accent) 9%, transparent);\n  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ui-accent) 45%, transparent);\n}\n\n:root form[data-clarify-batch] [data-choice][aria-pressed='true'] [data-slot='kbd'] {\n  border-color: transparent;\n  background: var(--ui-accent);\n  color: var(--dt-midground-foreground);\n}\n\n:root form[data-clarify-batch] [data-slot='kbd'] {\n  border-radius: 4px;\n}\n\n:root form[data-clarify-batch] textarea {\n  border-radius: var(--cx-radius-control);\n}\n\n/* \u56DE\u6267\u6CBF\u7528\u540C\u4E00\u5361\u9762\uFF0C\u4F46\u7559\u5728\u6D88\u606F\u6D41\u91CC */\n:root [data-slot='clarify-inline'][data-clarify-settled] {\n  border-radius: var(--cx-radius-dock);\n  background: var(--cx-surface);\n  box-shadow: var(--cx-edge);\n}\n";

// src/styles/effort.css
var effort_default = '/* \u2500\u2500 Claude UI \xB7 \u52AA\u529B\u5F3A\u5EA6\u6ED1\u5757 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n   \u79FB\u690D\u81EA codex-ui composer.css \u7684 .effort-*\uFF08c8e04f916 EffortControl + c2d9b9a76 Slider\uFF09\uFF0C\u7EC4\u4EF6\u89C1\n   src/effort/slider.tsx\u3002\u5C3A\u5BF8\u53D6\u539F\u7248 compact \u5BC6\u5EA6\u7684\u503C\uFF1A\u63A7\u4EF6\u9AD8 24\u3001\u5706\u89D2 6\u3001gap xs / sm / lg = 6 / 8 / 20\u3001\n   \u6B63\u6587 13/19\u3001\u811A\u6CE8 12/15\u3002 */\n\n/* \u533A\u5757\uFF1A\u6807\u9898\u884C\u3001\u300C\u901F\u5EA6\u66F4\u5FEB \u2026 \u66F4\u667A\u80FD\u300D\u3001\u6ED1\u5757\uFF0C\u7EB5\u5411 gap-lg\u3002\u653E\u5728\u83DC\u5355\u91CC\u65F6\u5185\u5BB9\u79BB\u83DC\u5355\u8FB9\u7F18 8px\u3002 */\n:root .cx-effort-section {\n  /* \u7126\u70B9\u73AF\uFF08\u539F --cds-focus-shadow\uFF09\uFF1A1px \u5F39\u5C42\u5E95\u8272\u30011px \u5F3A\u8C03\u8272\u30016px \u5149\u6655 */\n  --cx-effort-focus: inset 0 0 0 1px var(--cx-popover), 0 0 0 1px var(--ui-accent), 0 0 6px 1px color-mix(in srgb, var(--ui-accent) 30%, transparent);\n  display: flex;\n  flex-direction: column;\n  gap: 20px;\n  padding: 8px;\n  user-select: none;\n}\n\n/* \u5355\u72EC\u653E\u8FDB\u4E00\u4E2A\u5F39\u5C42\u65F6\uFF0C\u7ED9\u5F39\u5C42\u52A0 cx-effort-pop\uFF1A220 \u5BBD\u3001\u65E0\u5185\u8FB9\u8DDD\uFF0C\u533A\u5757\u81EA\u5DF1\u7559 12px */\n:root .cx-effort-pop {\n  width: 220px;\n  min-width: 0;\n  padding: 0;\n}\n\n:root .cx-effort-pop .cx-effort-section {\n  padding: 12px;\n}\n\n/* \u6807\u9898\u884C\u4E5F\u662F\u8B66\u544A\u60AC\u505C\u5361\u7684\u5B9A\u4F4D\u57FA\u51C6 */\n:root .cx-effort-head {\n  position: relative;\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 8px;\n  font-size: 13px;\n  line-height: 19px;\n}\n\n:root .cx-effort-title {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  min-width: 0;\n}\n\n:root .cx-effort-title > :first-child {\n  flex: none;\n  color: var(--ui-text-tertiary);\n}\n\n:root .cx-effort-names {\n  position: relative;\n  min-width: 0;\n}\n\n/* \u6863\u4F4D\u540D\uFF08c8e04f916 S\uFF09\uFF1A\u6E05\u6670\u7684\u90A3\u5C42\u5728\u6587\u6863\u6D41\u91CC\uFF0C\u51E0\u5C42\u6A21\u7CCA\u526F\u672C\u53E0\u5728\u4E0A\u9762\uFF08plus-lighter\uFF0C\u9759\u6B62\u65F6\u770B\u4E0D\u89C1\uFF09\uFF0C\n   \u6BCF\u5C42\u90FD\u4F1A\u622A\u65AD\uFF1B\u52A8\u753B\u7531 EffortName \u9A71\u52A8\u3002\u6B63\u5728\u9000\u573A\u7684\u90A3\u4E2A\u8131\u79BB\u6587\u6863\u6D41\uFF0C\u7559\u5728\u539F\u5904\u3002 */\n:root .cx-effort-name {\n  position: relative;\n  isolation: isolate;\n  display: block;\n  min-width: 0;\n}\n\n:root .cx-effort-name[data-leaving] {\n  position: absolute;\n  top: 0;\n  left: 0;\n}\n\n:root .cx-effort-name > span {\n  display: block;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n:root .cx-effort-name > span + span {\n  position: absolute;\n  inset: 0;\n  opacity: 0;\n  mix-blend-mode: plus-lighter;\n  pointer-events: none;\n}\n\n:root .cx-effort-name[data-pro] {\n  color: var(--cx-pro);\n  font-weight: 500;\n}\n\n:root .cx-effort-help {\n  position: relative;\n  display: inline-flex;\n  flex: none;\n  align-items: center;\n  justify-content: center;\n  border-radius: 999px;\n  color: var(--ui-text-tertiary);\n  transition: box-shadow var(--cx-dur-fast) ease-out;\n}\n\n:root .cx-effort-help:hover,\n:root .cx-effort-help:focus-visible {\n  color: var(--ui-text-primary);\n}\n\n:root .cx-effort-help:focus-visible {\n  box-shadow: var(--cx-effort-focus);\n}\n\n/* \u60AC\u505C\u5361\uFF1A\u300C?\u300D\u7684\u6863\u4F4D\u8BF4\u660E\u4E0E max \u7684\u7528\u91CF\u8B66\u544A\u3002220 \u5BBD\uFF0C\u505C 200ms \u540E\u5728\u4E0A\u65B9 8px \u5904\u6D6E\u51FA\uFF1B\n   \u8BF4\u660E\u5361\u4E0E\u300C?\u300D\u7684\u5916\u7AEF\u5BF9\u9F50\uFF0C\u8B66\u544A\u5361\u4E0E\u6807\u9898\u884C\u7684\u8D77\u7AEF\u5BF9\u9F50\u3002 */\n:root .cx-effort-help-card,\n:root .cx-effort-warn-card {\n  position: absolute;\n  bottom: calc(100% + 8px);\n  z-index: 1;\n  display: flex;\n  flex-direction: column;\n  gap: 6px;\n  width: 220px;\n  padding: 12px;\n  border-radius: var(--cx-radius-card);\n  background: var(--cx-popover);\n  box-shadow: var(--cx-edge), var(--cx-shadow-popover);\n  color: var(--ui-text-primary);\n  font-size: 12px;\n  line-height: 15px;\n  text-align: start;\n  white-space: normal;\n  visibility: hidden;\n  opacity: 0;\n  transition:\n    opacity var(--cx-dur-snap) var(--cx-ease-snap),\n    visibility 0s linear var(--cx-dur-snap);\n}\n\n:root .cx-effort-help-card {\n  right: -12px;\n}\n\n:root .cx-effort-warn-card {\n  left: -12px;\n}\n\n:root .cx-effort-help:hover .cx-effort-help-card,\n:root .cx-effort-help:focus-visible .cx-effort-help-card,\n:root .cx-effort-warn:hover .cx-effort-warn-card {\n  visibility: visible;\n  opacity: 1;\n  transition:\n    opacity var(--cx-dur-snap) var(--cx-ease-snap) 0.2s,\n    visibility 0s linear 0.2s;\n}\n\n:root .cx-effort-help-card > :first-child {\n  font-weight: 500;\n}\n\n:root .cx-effort-help-card > :last-child {\n  color: var(--ui-text-tertiary);\n  overflow-wrap: break-word;\n}\n\n:root .cx-effort-body {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n  width: 100%;\n}\n\n:root .cx-effort-ends {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 8px;\n  color: var(--ui-text-tertiary);\n  font-size: 12px;\n  line-height: 15px;\n}\n\n/* \u6ED1\u5757\uFF08c2d9b9a76\uFF09\uFF1A\u4E00\u4E2A\u63A7\u4EF6\u9AD8\uFF1B\u8F68\u9053\u4E0A\u4E0B\u5404\u5185\u7F29 2px\uFF0C10% \u58A8\u8272\uFF0C\u586B\u5145\u5230\u624B\u67C4\u4E3A 20%\uFF08\u6697\u8272 35%\uFF09\uFF1B\n   3px \u7684\u6863\u4F4D\u70B9\uFF08\u63A8\u8350\u6863\u662F 3\xD79 \u7684\u7AD6\u7EBF\uFF09\u6392\u5728\u5185\u7F29 h/2 \u2212 2px \u7684\u4E00\u884C\u4E0A\uFF1B\u624B\u67C4 (h \u2212 8) \xD7 (h \u2212 4)\uFF0C\u767D\u8272\uFF0C\n   \u4E00\u5708\u7EC6\u73AF\u52A0\u4E00\u5C42\u6295\u5F71\uFF0C\u6309\u4F4F\u65F6\u653E\u5927 1.12\u3002\u624B\u67C4\u548C\u586B\u5145\u6ED1\u5230\u6BCF\u4E00\u6863\uFF08snap\u3001ease-out\uFF09\uFF0C\u62D6\u52A8\u65F6\u6309 --lean\n   \u671D\u6307\u9488\u63A2\u8EAB\u3002 */\n:root .cx-effort-slider {\n  --slider-track: var(--cx-line);\n  --slider-fill: var(--cx-line-strong);\n  --slider-stop: rgb(11 11 11 / 25%);\n  --slider-handle: #fff;\n  --slider-handle-ring: rgb(11 11 11 / 4%);\n  --slider-handle-depth: rgb(11 11 11 / 6%);\n  display: flex;\n  flex-direction: column;\n  gap: 6px;\n}\n\n:root.dark .cx-effort-slider {\n  --slider-fill: rgb(255 255 255 / 35%);\n  --slider-stop: rgb(255 255 255 / 25%);\n  --slider-handle-ring: rgb(255 255 255 / 0%);\n  --slider-handle-depth: rgb(11 11 11 / 24%);\n}\n\n:root .cx-effort-track {\n  --h: 24px;\n  --inset: calc((var(--h) - 8px) / 2);\n  position: relative;\n  height: var(--h);\n  container-type: inline-size;\n}\n\n:root .cx-effort-track::before,\n:root .cx-effort-fill,\n:root .cx-effort-charge {\n  content: "";\n  position: absolute;\n  top: 2px;\n  right: 0;\n  bottom: 2px;\n  left: 0;\n  border-radius: 6px;\n  pointer-events: none;\n}\n\n:root .cx-effort-track::before {\n  background: var(--slider-track);\n}\n\n/* \u586B\u5145\u5C31\u662F\u8F68\u9053\u672C\u8EAB\u7684\u5F62\u72B6\uFF0C\u5728\u624B\u67C4\u4E2D\u5FC3\u5904\u88C1\u6389\uFF1B\u5B83\u4EE5 4 \u500D\u901F\u4ECE 0 \u957F\u5230\u624B\u67C4\u4E2D\u5FC3\uFF0C\u6700\u4F4E\u6863\u4FBF\u4E00\u70B9\u4E5F\u4E0D\u9732\n   \uFF08c2d9b9a76 min(pos\xB7b, 4\xB7pos\xB7b \u2212 inset)\uFF09\u3002\u5355\u72EC\u4E00\u4E2A\u76D2\u5B50\u7684\u8BDD\uFF0C\u5728\u6700\u4F4E\u6863\u4F1A\u6709\u534A\u4E2A\u624B\u67C4\u5BBD\uFF0C\u5706\u89D2\u88AB\n   \u624B\u67C4\u7684\u5706\u89D2\u6324\u7740\uFF0C\u89D2\u4E0A\u4F1A\u9732\u51FA\u6765\u3002 */\n:root .cx-effort-fill,\n:root .cx-effort-charge {\n  clip-path: inset(0 calc(100% - min(var(--inset) + var(--pos) * (100% - 2 * var(--inset)), 4 * var(--pos) * (100% - 2 * var(--inset))) - var(--lean, 0px)) 0 0);\n}\n\n:root .cx-effort-fill {\n  background: var(--slider-fill);\n  transition: clip-path var(--cx-dur-snap) var(--cx-ease-out);\n}\n\n:root .cx-effort-stops {\n  position: absolute;\n  inset: 0;\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 0 calc(var(--h) / 2 - 2px);\n  pointer-events: none;\n}\n\n:root .cx-effort-stops > span {\n  width: 3px;\n  height: 3px;\n  border-radius: 999px;\n  background: var(--slider-stop);\n}\n\n:root .cx-effort-stops > [data-mark] {\n  height: 9px;\n}\n\n:root .cx-effort-range {\n  position: relative;\n  z-index: 1;\n  display: block;\n  width: 100%;\n  height: var(--h);\n  margin: 0;\n  background: transparent;\n  cursor: pointer;\n  appearance: none;\n}\n\n/* \u7126\u70B9\u73AF\u7531\u624B\u67C4\u6765\u753B\uFF0Crange \u81EA\u5DF1\u4E0D\u753B */\n:root .cx-effort-range:focus-visible {\n  outline: none;\n  box-shadow: none;\n}\n\n:root .cx-effort-range::-webkit-slider-runnable-track {\n  height: var(--h);\n  background: transparent;\n}\n\n/* \u539F\u751F\u62C7\u6307\u53EA\u8D1F\u8D23\u63A5\u4F4F\u6307\u9488\uFF0C\u753B\u51FA\u6765\u7684\u662F .cx-effort-handle\uFF08\u6ED1\u67B6\uFF09 */\n:root .cx-effort-range::-webkit-slider-thumb {\n  width: calc(var(--h) - 8px);\n  height: calc(var(--h) - 4px);\n  margin-top: 2px;\n  border: 0;\n  background: transparent;\n  appearance: none;\n}\n\n/* \u7528 translate \u800C\u4E0D\u662F transform\uFF0C1.12 \u7684\u7F29\u653E\u624D\u4E0D\u4F1A\u628A\u4F4D\u79FB\u4E00\u8D77\u653E\u5927 */\n:root .cx-effort-handle {\n  position: absolute;\n  top: 2px;\n  left: 0;\n  z-index: 1;\n  width: calc(var(--h) - 8px);\n  height: calc(var(--h) - 4px);\n  border-radius: 6px;\n  background: var(--slider-handle);\n  box-shadow:\n    0 0 0 1px var(--slider-handle-ring),\n    0 0 12px var(--slider-handle-depth);\n  pointer-events: none;\n  translate: calc(var(--pos) * (100cqw - 2 * var(--inset)) + var(--lean, 0px));\n  transition:\n    translate var(--cx-dur-snap) var(--cx-ease-out),\n    scale var(--cx-dur-snap) var(--cx-overshoot);\n}\n\n:root .cx-effort-range:active + .cx-effort-handle {\n  scale: 1.12;\n}\n\n:root .cx-effort-range:focus-visible + .cx-effort-handle {\n  box-shadow:\n    0 0 0 1px var(--slider-handle-ring),\n    0 0 12px var(--slider-handle-depth),\n    var(--cx-effort-focus);\n}\n\n/* \u63A8\u8350\u6863\u7684\u6807\u8BB0\u5728\u5B83\u6B63\u4E0B\u65B9\uFF08\u811A\u6CE8\u5B57\u53F7\uFF1B\u505C\u5728\u8BE5\u6863\u65F6\u7528 secondary \u8272\uFF09 */\n:root .cx-effort-mark {\n  position: relative;\n  height: 15px;\n  margin: 0 11.5px;\n  color: var(--ui-text-tertiary);\n  font-size: 12px;\n  line-height: 15px;\n  white-space: nowrap;\n}\n\n:root .cx-effort-mark > span {\n  position: absolute;\n  left: calc(var(--mark) * 100%);\n  translate: -50% 0;\n}\n\n:root .cx-effort-mark[data-on] {\n  color: var(--ui-text-secondary);\n}\n\n/* max\uFF1A\u6863\u4F4D\u540D\u540E\u4E00\u4E2A\u8B66\u544A\u56FE\u6807\uFF0812px\uFF09\uFF0C\u8B66\u544A\u672C\u8EAB\u662F\u5B83\u7684\u60AC\u505C\u5361 */\n:root .cx-effort-warn {\n  display: inline-flex;\n  flex: none;\n  color: var(--cx-warning);\n}\n\n:root .cx-effort-warn > .codicon {\n  font-size: 12px;\n}\n\n:root .cx-effort-desc {\n  display: none;\n  color: var(--ui-text-tertiary);\n  font-size: 12px;\n  line-height: 15px;\n  overflow-wrap: break-word;\n}\n\n@media (pointer: coarse) {\n  :root .cx-effort-help {\n    display: none;\n  }\n\n  :root .cx-effort-desc {\n    display: block;\n  }\n}\n\n/* \u5145\u80FD\uFF08W22 yK\uFF09\uFF0C\u8FD9\u91CC\u6BCF\u4E00\u6863\u90FD\u6709\uFF1A\u8F68\u9053\u591A\u4E00\u5C42\u5F39\u5C42\u5E95\u8272 + 10% \u58A8\u8272\u7684\u5E95\u677F\uFF08\u6DE1\u5165 700ms ease-out\uFF0C\n   \u6DE1\u51FA 850ms linear\uFF09\uFF0C\u4E0A\u9762\u4E00\u5757 3px \u65B9\u683C\u30014px \u7F51\u683C\u7684\u753B\u5E03\uFF0C\u5728\u624B\u67C4\u8DE8\u5EA6\u7684 45% \u5185\u7531\u900F\u660E\u6E10\u5230\u4E0D\u900F\u660E\n   \uFF08\u6697\u8272 60%\uFF0C\u5E76\u4EE5 plus-lighter 0.65 \u53E0\u52A0\uFF1B\u906E\u7F69\u7531\u7740\u8272\u5668\u505A\uFF0C\u56E0\u4E3A\u8DE8\u5EA6\u4F1A\u52A8\uFF09\u3002\u5B83\u8DDF\u586B\u5145\u4E00\u8D77\u88C1\u5207\n   \uFF08c2d9b9a76 overlay\uFF09\uFF0C\u6240\u4EE5\u968F\u624B\u67C4\u4E00\u8D77\u7F29\u56DE\uFF1B\u753B\u5E03\u4FDD\u6301\u8F68\u9053\u7684\u5BBD\u5EA6\uFF08100cqw\uFF09\u3002\u573A\u662F Hermes \u84DD\uFF0C\n   \u5404\u6863\u7684\u6EE4\u955C\uFF08--charge\uFF09\u7ED9\u5B83\u4E0A\u8272\uFF0C\u6362\u6863\u65F6\u4ECE\u4E00\u6863\u8FC7\u6E21\u5230\u4E0B\u4E00\u6863\u3002 */\n:root .cx-effort-charge {\n  overflow: hidden;\n  background: linear-gradient(var(--cx-line), var(--cx-line)), var(--cx-popover);\n  opacity: 0;\n  transition:\n    clip-path var(--cx-dur-snap) var(--cx-ease-out),\n    opacity 850ms linear;\n}\n\n:root .cx-effort-charge[data-on] {\n  opacity: 1;\n  transition:\n    clip-path var(--cx-dur-snap) var(--cx-ease-out),\n    opacity 700ms ease-out;\n}\n\n/* \u6EE4\u955C\u8FC7\u6E21 300ms\uFF08\u539F --cds-dur-sheet\uFF09 */\n:root .cx-effort-charge canvas {\n  position: absolute;\n  top: 0;\n  left: 0;\n  width: 100cqw;\n  height: 100%;\n  filter: var(--charge);\n  transition: filter 300ms var(--cx-ease-out);\n}\n\n:root.dark .cx-effort-charge canvas {\n  mix-blend-mode: plus-lighter;\n  opacity: 0.65;\n}\n\n/* \u51CF\u5F31\u52A8\u6548\u65F6\u6CA1\u6709\u573A\uFF1A\u586B\u5145\u81EA\u5DF1\u4E0A\u8BE5\u6863\u7684\u989C\u8272\u3002\u6EE4\u955C\u662F\u7167\u4EAE\u8272\u57FA\u8272 #1f5fe0 \u89E3\u7684\uFF0C\u4E24\u5957\u4E3B\u9898\u90FD\u7528\u5B83\n   \uFF08\u539F\u7248\u540C\u6837\u5728\u4E24\u5957\u4E3B\u9898\u91CC\u5199\u6B7B #8964c4\uFF09\u3002 */\n@media (prefers-reduced-motion: reduce) {\n  :root .cx-effort-fill {\n    background: #1f5fe0;\n    filter: var(--charge);\n  }\n}\n';

// src/styles/overlays.css
var overlays_default = "/* \u2500\u2500 Claude UI \xB7 \u6D6E\u5C42 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n   \u83DC\u5355\u3001\u4E0B\u62C9\u3001\u5F39\u5C42\uFF1Acodex-ui \u7684 surface-3 + \u4E00\u5708\u7EC6\u73AF + popover \u9634\u5F71\uFF0C\u4E0D\u900F\u660E\u3001\u65E0\u5165\u573A\u52A8\u753B\u3002\n   \u5BF9\u8BDD\u6846\uFF1A\u5706\u89D2 10 + \u7EC6\u73AF + \u53CC\u5C42\u6295\u5F71\uFF1Btooltip\uFF1A\u58A8\u8272\u5E95\uFF08\u6697\u8272\u4E0B\u6362\u6210\u5F39\u5C42\u8272 + \u5185\u73AF\uFF09\u3002 */\n\n:root\n  :is(\n    [data-slot='dropdown-menu-content'],\n    [data-slot='dropdown-menu-sub-content'],\n    [data-slot='select-content'],\n    [data-slot='context-menu-content'],\n    [data-slot='context-menu-sub-content'],\n    [data-slot='popover-content'],\n    [data-slot='thread-timeline-popover']\n  ) {\n  border-color: transparent;\n  border-radius: var(--cx-radius-card);\n  background: var(--cx-popover);\n  box-shadow: var(--cx-edge), var(--cx-shadow-popover);\n  backdrop-filter: none;\n  -webkit-backdrop-filter: none;\n}\n\n:root :is([data-slot='dropdown-menu-content'], [data-slot='dropdown-menu-sub-content'], [data-slot='select-content'], [data-slot='context-menu-content'], [data-slot='context-menu-sub-content'])[data-state='open'] {\n  animation: none;\n}\n\n:root\n  :is(\n    [data-slot='dropdown-menu-item'],\n    [data-slot='dropdown-menu-checkbox-item'],\n    [data-slot='dropdown-menu-radio-item'],\n    [data-slot='dropdown-menu-sub-trigger'],\n    [data-slot='select-item'],\n    [data-slot='context-menu-item'],\n    [data-slot='context-menu-sub-trigger']\n  ) {\n  border-radius: var(--cx-radius-control);\n}\n\n:root\n  :is(\n    [data-slot='dropdown-menu-item'],\n    [data-slot='dropdown-menu-checkbox-item'],\n    [data-slot='dropdown-menu-radio-item'],\n    [data-slot='dropdown-menu-sub-trigger'],\n    [data-slot='select-item'],\n    [data-slot='context-menu-item'],\n    [data-slot='context-menu-sub-trigger']\n  ):is(:focus, [data-highlighted], [data-state='open'], [data-kb-active]) {\n  background: var(--cx-hover);\n  color: var(--ui-text-primary);\n}\n\n:root :is([data-slot='dropdown-menu-separator'], [data-slot='context-menu-separator'], [data-slot='select-separator']) {\n  background: var(--cx-line);\n}\n\n:root :is([data-slot='dropdown-menu-label'], [data-slot='select-label']) {\n  color: var(--ui-text-tertiary);\n}\n\n/* \u52FE\u9009\u6807\u8BB0\u7528\u5F3A\u8C03\u8272 */\n:root :is([data-slot='dropdown-menu-checkbox-item'], [data-slot='dropdown-menu-radio-item'], [data-slot='select-item']) :is(svg, .codicon-check) {\n  color: var(--ui-accent);\n}\n\n/* \u2500\u2500 \u5BF9\u8BDD\u6846 \u2500\u2500 */\n:root [data-slot='dialog-overlay'] {\n  background: rgb(0 0 0 / 0.28);\n  backdrop-filter: none;\n}\n\n:root.dark [data-slot='dialog-overlay'] {\n  background: rgb(0 0 0 / 0.5);\n}\n\n:root [data-slot='dialog-content']:not([data-variant='media-lightbox']) {\n  border-color: transparent;\n  border-radius: var(--cx-radius-dock);\n  background: var(--cx-popover);\n  box-shadow: var(--cx-edge), var(--cx-shadow-dialog);\n  backdrop-filter: none;\n  -webkit-backdrop-filter: none;\n}\n\n/* \u8BBE\u7F6E\u7B49\u8986\u76D6\u5C42\u5361\u7247 */\n:root [data-overlay-surface] {\n  background: rgb(0 0 0 / 0.22);\n}\n\n:root [data-overlay-surface] [data-glass-raised] {\n  border-color: transparent;\n  border-radius: var(--cx-radius-dock);\n  box-shadow: var(--cx-edge), var(--cx-shadow-dialog);\n}\n\n/* \u2500\u2500 \u547D\u4EE4\u9762\u677F\uFF08\u2318K\uFF09\u2500\u2500 */\n:root [role='dialog']:has([cmdk-root]) {\n  border-color: transparent;\n  border-radius: 12px;\n  background: var(--cx-popover);\n  box-shadow:\n    0 0 0 0.5px var(--cx-line-strong),\n    0 25px 50px -12px rgb(0 0 0 / 0.25);\n}\n\n:root [data-slot='command-item'] {\n  border-radius: var(--cx-radius-control);\n}\n\n:root [data-slot='command-item'][data-selected='true'] {\n  background: var(--cx-hover);\n  color: var(--ui-text-primary);\n}\n\n/* \u2500\u2500 tooltip \u2500\u2500 */\n:root [data-slot='tooltip-content'].tooltip-bubble {\n  border-radius: var(--cx-radius-control);\n  background: #0b0b0b;\n  color: #ffffff;\n}\n\n:root [data-slot='tooltip-arrow'] {\n  fill: #0b0b0b;\n}\n\n:root.dark [data-slot='tooltip-content'].tooltip-bubble {\n  background: var(--cx-popover);\n  color: var(--ui-text-primary);\n  box-shadow: inset 0 0 0 1px var(--cx-line);\n}\n\n:root.dark [data-slot='tooltip-arrow'] {\n  fill: var(--cx-popover);\n}\n\n/* \u2500\u2500 toast \u2500\u2500 */\n:root [role='region'] [data-slot='card-stack-surface'] {\n  border-color: transparent;\n  border-radius: var(--cx-radius-dock);\n  background: var(--cx-popover);\n  box-shadow: var(--cx-edge), var(--cx-shadow-popover);\n  backdrop-filter: none;\n}\n";

// src/styles/quota.css
var quota_default = "/* \u2500\u2500 Claude UI \xB7 \u989D\u5EA6\u7528\u91CF\u73AF\u4E0E\u5F39\u5C42 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n   \u79FB\u690D\u81EA codex-ui\uFF1Abase.css:2175-2372\uFF08\u7528\u91CF\u73AF\u4E0E Usage Ring Meter \u52A8\u6548\uFF09\u3001composer.css:831-839\uFF08\u8F93\u5165\u6846\u884C\u91CC\u7684\u89E6\u53D1\u6309\u94AE\uFF09\u3001\n   composer.css:1315-1548\uFF08\u5F39\u5C42\u3001\u5957\u9910\u989D\u5EA6\u884C\u4E0E\u8FDB\u5EA6\u6761\uFF09\u3001base.css:2536-2568\uFF08\u51CF\u5C11\u52A8\u6548\uFF09\uFF0Ckeyframes \u53D6\u81EA tokens.css:1181-1406\u3002\n   codex-ui \u7684\u8F93\u5165\u6846\u5728 compact \u5BC6\u5EA6\u4E0B\uFF0C\u5F39\u5C42\u95F4\u8DDD\u6309\u90A3\u4E00\u6863\u53D6\uFF1Apad-xs 4 \xB7 pad-sm 6 \xB7 pad-lg 12 \xB7 gap-xs 6 \xB7 gap-sm 8\uFF0C\u5B57\u53F7 12/15\u3002\n   \u7EC4\u4EF6\u89C1 src/quota/ring.tsx\u3002 */\n\n/* \u2500\u2500 \u7528\u91CF\u73AF\uFF1A\u5916\u5C42\u5B9A\u5C3A\u5BF8\uFF0C\u4E09\u5C42\u58F3\uFF08hover \u653E\u5927 \u2192 \u5FC3\u8DF3 \u2192 \u547C\u5438\uFF09\u53E0\u5728\u540C\u4E00\u683C\u91CC\uFF1B\u5F27\u8272\u968F data-level \u2500\u2500 */\n:root .cx-usage-ring {\n  --cx-usage-color: var(--ui-text-secondary);\n  position: relative;\n  display: inline-grid;\n  place-items: center;\n  flex: none;\n  width: var(--cx-usage-size);\n  height: var(--cx-usage-size);\n}\n\n:root .cx-usage-ring[data-level='warning'] {\n  --cx-usage-color: var(--cx-warning-fill);\n}\n\n:root .cx-usage-ring[data-level='critical'] {\n  --cx-usage-color: var(--ui-red);\n}\n\n:root :is(.cx-usage-ring__hover, .cx-usage-ring__beat, .cx-usage-ring__breath) {\n  position: relative;\n  display: grid;\n  place-items: center;\n  width: 100%;\n  height: 100%;\n}\n\n:root .cx-usage-ring__breath > * {\n  grid-area: 1 / 1;\n}\n\n/* \u5F27\u8272\u7684\u5149\u6655\uFF1A\u5E38\u9A7B\u4E00\u5C42\u5F88\u6DE1\u7684\uFF0C\u5FC3\u8DF3\u3001hover \u5404\u4E00\u5C42\u5E73\u65F6\u900F\u660E\u7684 */\n:root :is(.cx-usage-ring__glow, .cx-usage-ring__beat-glow, .cx-usage-ring__hover-glow) {\n  position: absolute;\n  inset: calc(var(--cx-usage-size) * -1);\n  border-radius: 50%;\n  background: radial-gradient(closest-side, color-mix(in srgb, var(--cx-usage-color) 55%, transparent), transparent 62%);\n  pointer-events: none;\n}\n\n:root .cx-usage-ring__glow {\n  opacity: 0.06;\n}\n\n:root :is(.cx-usage-ring__beat-glow, .cx-usage-ring__hover-glow) {\n  opacity: 0;\n}\n\n:root .cx-usage-ring__hover {\n  transition: transform var(--cx-dur-fast) var(--cx-ease-out);\n}\n\n:root .cx-usage-ring__hover-glow {\n  transition: opacity var(--cx-dur-fast) var(--cx-ease-out);\n}\n\n/* hover \u5916\u5C42\u6309\u94AE\uFF1A\u73AF\u653E\u5927 1.08\uFF0C\u5149\u6655\u4EAE\u8D77 */\n@media (hover: hover) {\n  :root :is(button, [role='button']):hover .cx-usage-ring__hover {\n    transform: scale(1.08);\n  }\n\n  :root :is(button, [role='button']):hover .cx-usage-ring__hover-glow {\n    opacity: 0.23;\n  }\n}\n\n/* \u8F6C -90\xB0 \u8BA9\u5F27\u4ECE 12 \u70B9\u8D77\uFF1B\u5F27\u7684 dashoffset \u8FC7\u6E21 300ms\uFF08\u4E3B\u9898\u6CA1\u6709 --cx-dur-sheet\uFF0C\u56DE\u9000\u5230 300ms\uFF09 */\n:root .cx-usage-ring__svg {\n  transform: rotate(-90deg);\n}\n\n:root .cx-usage-ring circle {\n  fill: none;\n}\n\n:root .cx-usage-ring__track {\n  stroke: color-mix(in srgb, var(--ui-base) 8%, transparent);\n  transition: stroke var(--cx-dur-base) var(--cx-ease-out);\n}\n\n:root .cx-usage-ring__arc {\n  stroke: var(--cx-usage-color);\n  stroke-linecap: round;\n  transition-property: stroke-dashoffset, stroke;\n  transition-duration: var(--cx-dur-sheet, 300ms), var(--cx-dur-base);\n  transition-timing-function: var(--cx-ease-out);\n}\n\n/* \u753B\u5165\uFF08\u7A97\u53E3\u5728\u672C\u673A\u7B2C\u4E00\u6B21\u51FA\u73B0\uFF09\uFF1A\u5F27 900ms \u56DE\u5F39\u626B\u5165\uFF0C\u8F68\u9053\u7A0D\u540E\u6DE1\u5165\uFF0C\u5149\u6655\u5728 1.2s \u91CC\u95EA\u4E00\u4E0B */\n:root .cx-usage-ring[data-entrance='draw'] .cx-usage-ring__arc {\n  animation:\n    cx-usage-sweep calc(2 * var(--cx-dur-slow)) var(--cx-overshoot) backwards,\n    cx-usage-fade-in var(--cx-dur-snap) linear backwards;\n}\n\n:root .cx-usage-ring[data-entrance='draw'] .cx-usage-ring__track {\n  animation: cx-usage-fade-in var(--cx-dur-sheet, 300ms) var(--cx-ease-out) 0.15s backwards;\n}\n\n:root .cx-usage-ring[data-entrance='draw'] .cx-usage-ring__glow {\n  animation: cx-usage-draw-glow 1.2s linear backwards;\n}\n\n/* \u5B89\u9759\u5165\u573A\uFF1A200ms \u626B\u5165\u5E76\u6DE1\u5165 */\n:root .cx-usage-ring[data-entrance='quiet'] .cx-usage-ring__arc {\n  animation:\n    cx-usage-sweep var(--cx-dur-base) var(--cx-ease-out) backwards,\n    cx-usage-fade-in var(--cx-dur-base) var(--cx-ease-out) backwards;\n}\n\n:root .cx-usage-ring[data-entrance='quiet'] :is(.cx-usage-ring__track, .cx-usage-ring__glow) {\n  animation: cx-usage-fade-in var(--cx-dur-base) var(--cx-ease-out) backwards;\n}\n\n/* \u5FC3\u8DF3\uFF1A1 \u8B66\u544A \xB7 2 \u5371\u9669 \xB7 3 \u89E6\u9876\uFF0C\u65F6\u957F\u4E0E ring.tsx \u7684 BEAT_MS \u4E00\u81F4 */\n:root .cx-usage-ring[data-beat='1'] .cx-usage-ring__beat {\n  animation: cx-usage-beat-warning 2.3s linear;\n}\n\n:root .cx-usage-ring[data-beat='1'] .cx-usage-ring__beat-glow {\n  animation: cx-usage-beat-warning-glow 2.3s linear;\n}\n\n:root .cx-usage-ring[data-beat='2'] .cx-usage-ring__beat {\n  animation: cx-usage-beat-critical 1.45s linear;\n}\n\n:root .cx-usage-ring[data-beat='2'] .cx-usage-ring__beat-glow {\n  animation: cx-usage-beat-critical-glow 1.45s linear;\n}\n\n:root .cx-usage-ring[data-beat='3'] .cx-usage-ring__beat {\n  animation: cx-usage-beat-limit 2.45s linear;\n}\n\n:root .cx-usage-ring[data-beat='3'] .cx-usage-ring__beat-glow {\n  animation: cx-usage-beat-limit-glow 2.45s linear;\n}\n\n/* \u5F00\u59CB\u6D41\u5F0F\u56DE\u590D\uFF1A\u73AF\u547C\u5438\u4E00\u6B21\uFF0C\u5F57\u661F 2s \u8DD1\u5230\u5F27\u5C3E */\n:root .cx-usage-ring[data-shimmer] .cx-usage-ring__breath {\n  animation: cx-usage-breath 1.5s ease-in-out;\n}\n\n:root .cx-usage-ring__comet {\n  position: absolute;\n  inset: 0;\n  opacity: 0;\n  transform: rotate(-90deg);\n  pointer-events: none;\n}\n\n:root .cx-usage-ring__comet circle {\n  stroke: color-mix(in srgb, var(--cx-usage-color) 28%, white);\n  stroke-linecap: round;\n}\n\n:root .cx-usage-ring[data-shimmer] .cx-usage-ring__comet {\n  animation:\n    cx-usage-comet-travel 2s linear,\n    cx-usage-comet-fade 2s linear;\n}\n\n/* \u2500\u2500 \u89E6\u53D1\u6309\u94AE\uFF08\u52A0\u5728\u5305\u7740\u73AF\u7684\u6309\u94AE\u4E0A\uFF09\uFF1A\u5728\u8F93\u5165\u6846\u884C\u91CC\u5F80\u91CC\u632A 1px\uFF0C\u8F68\u9053\u52A0\u6DF1\u4E00\u6863 \u2500\u2500 */\n:root .cx-usage-trigger {\n  margin-inline-start: 1px;\n}\n\n:root .cx-usage-trigger .cx-usage-ring__track {\n  stroke: var(--cx-line-strong);\n}\n\n/* \u2500\u2500 \u5F39\u5C42\u5BB9\u5668\uFF08\u52A0\u5728 Hermes PopoverContent \u7684 className \u4E0A\uFF09\uFF1A360 \u5BBD\u3001\u4E0A\u4E0B 6\u3001\u8FC7\u9AD8\u65F6\u6EDA\u52A8 \u2500\u2500 */\n:root .cx-usage-pop {\n  display: flex;\n  flex-direction: column;\n  width: 360px;\n  max-width: calc(100vw - 2rem);\n  max-height: min(calc(100vh - 16px), 640px);\n  padding: 6px 0;\n  overflow-y: auto;\n}\n\n/* \u2500\u2500 \u5F39\u5C42\u5185\u5BB9\uFF1A\u6807\u9898\u884C\uFF0C\u518D\u662F\u4E00\u5217\u989D\u5EA6\u7A97\u53E3\uFF1B\u6BCF\u5757\u662F\u540D\u79F0\u4E0E\u300C\u91CD\u7F6E\u6587\u6848 N%\u300D\uFF0C\u4E0B\u9762\u4E00\u6761\u8FDB\u5EA6\u6761 \u2500\u2500 */\n:root .cx-usage-plan {\n  display: flex;\n  flex-direction: column;\n  gap: 6px;\n  font-size: 12px;\n  line-height: 15px;\n}\n\n:root .cx-usage-head {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 8px;\n  min-height: 20px;\n  padding: 4px 12px;\n  color: var(--ui-text-tertiary);\n}\n\n:root .cx-usage-list {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n  padding: 0 12px 4px;\n}\n\n:root .cx-usage-row {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n}\n\n:root .cx-usage-row-head {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: baseline;\n  justify-content: space-between;\n  column-gap: 8px;\n}\n\n:root .cx-usage-name {\n  min-width: 0;\n  color: var(--ui-text-primary);\n}\n\n:root .cx-usage-value {\n  display: flex;\n  align-items: baseline;\n  gap: 6px;\n  margin-inline-start: auto;\n  color: var(--ui-text-tertiary);\n  font-variant-numeric: tabular-nums;\n}\n\n/* 4px \u5168\u5706\u89D2\u8FDB\u5EA6\u6761\uFF1A\u5E95\u8272 + \u4E00\u5708\u7EC6\u73AF\uFF0C\u524D\u666F\u6309\u5206\u7EA7\u7740\u8272\uFF0C\u6709\u7528\u91CF\u65F6\u81F3\u5C11 4px */\n:root .cx-usage-bar {\n  height: 4px;\n  overflow: hidden;\n  border-radius: 999px;\n  background: color-mix(in srgb, var(--ui-base) 8%, transparent);\n  box-shadow: inset 0 0 0 1px var(--cx-line);\n}\n\n:root .cx-usage-bar > span {\n  display: block;\n  width: max(var(--cx-usage-pct), 4px);\n  height: 100%;\n  border-radius: inherit;\n  background: var(--ui-text-secondary);\n  transition: width var(--cx-dur-base) ease-out;\n}\n\n:root .cx-usage-bar > [data-level='warning'] {\n  background: var(--cx-warning-fill);\n}\n\n:root .cx-usage-bar > [data-level='critical'] {\n  background: var(--ui-red);\n}\n\n/* \u5217\u8868\u4E0B\u65B9\u7684\u5C0F\u5B57\uFF08\u5982\u89E6\u9876\u8BF4\u660E\uFF09\uFF0C\u53EF\u6362\u884C */\n:root .cx-usage-note {\n  padding: 0 12px 4px;\n  color: var(--ui-text-secondary);\n}\n\n/* \u2500\u2500 \u51CF\u5C11\u52A8\u6548\uFF1A\u5165\u573A\u3001\u5FC3\u8DF3\u3001\u547C\u5438\u7531 ring.tsx \u76F4\u63A5\u4E0D\u6302\uFF08\u4E0D\u7ED9 data-entrance / data-beat / data-shimmer\uFF09\uFF1B\n   \u8FD9\u91CC\u518D\u53BB\u6389\u8FC7\u6E21\u3001hover \u653E\u5927\u548C\u5F57\u661F \u2500\u2500 */\n@media (prefers-reduced-motion: reduce) {\n  :root :is(.cx-usage-ring__arc, .cx-usage-ring__track, .cx-usage-ring__hover, .cx-usage-ring__hover-glow, .cx-usage-bar > span) {\n    transition: none;\n  }\n\n  :root :is(button, [role='button']):hover .cx-usage-ring__hover {\n    transform: none;\n  }\n\n  :root .cx-usage-ring__comet {\n    display: none;\n  }\n}\n\n/* \u2500\u2500 keyframes\uFF1A\u5165\u573A\u626B\u5F27\u4E0E\u6DE1\u5165\u3001\u753B\u5165\u5149\u6655\u3001\u547C\u5438\u3001\u5F57\u661F\uFF0C\u4EE5\u53CA\u8B66\u544A / \u5371\u9669 / \u89E6\u9876\u4E09\u6761\u91C7\u6837\u6765\u7684\u53CC\u5CF0\u5FC3\u8DF3\u66F2\u7EBF \u2500\u2500 */\n@keyframes cx-usage-sweep {\n  0% {\n    stroke-dashoffset: var(--cx-usage-c);\n  }\n}\n\n@keyframes cx-usage-fade-in {\n  0% {\n    opacity: 0;\n  }\n}\n\n@keyframes cx-usage-draw-glow {\n  0% { opacity: 0; }\n  10% { opacity: 0.06; }\n  50% { opacity: 0.07; }\n  56.25% { opacity: 0.12; }\n  62.5% { opacity: 0.271; }\n  68.75% { opacity: 0.506; }\n  75% { opacity: 0.633; }\n  81.25% { opacity: 0.506; }\n  87.5% { opacity: 0.271; }\n  93.75% { opacity: 0.12; }\n  to { opacity: 0.06; }\n}\n\n@keyframes cx-usage-breath {\n  50% {\n    transform: scale(1.0384);\n  }\n}\n\n@keyframes cx-usage-comet-travel {\n  0% {\n    transform: rotate(-90deg);\n  }\n  to {\n    transform: rotate(calc(-90deg + var(--cx-usage-travel)));\n  }\n}\n\n@keyframes cx-usage-comet-fade {\n  0% { opacity: 0; }\n  16.67% { opacity: 0.425; }\n  33.33% { opacity: 0.736; }\n  50% { opacity: 0.85; }\n  66.67% { opacity: 0.736; }\n  83.33% { opacity: 0.425; }\n  to { opacity: 0; }\n}\n\n@keyframes cx-usage-beat-warning {\n  0% { transform: scale(1); }\n  14.7% { transform: scale(1.0006); }\n  17.83% { transform: scale(1.0037); }\n  20.91% { transform: scale(1.0129); }\n  24.04% { transform: scale(1.0275); }\n  27.13% { transform: scale(1.0352); }\n  30.26% { transform: scale(1.0273); }\n  33.35% { transform: scale(1.0129); }\n  36.48% { transform: scale(1.0037); }\n  39.57% { transform: scale(1.0006); }\n  52% { transform: scale(1.0004); }\n  55.96% { transform: scale(1.002); }\n  59.91% { transform: scale(1.0071); }\n  63.87% { transform: scale(1.015); }\n  67.83% { transform: scale(1.0192); }\n  71.78% { transform: scale(1.015); }\n  75.74% { transform: scale(1.0071); }\n  79.7% { transform: scale(1.002); }\n  83.65% { transform: scale(1.0004); }\n  to { transform: scale(1); }\n}\n\n@keyframes cx-usage-beat-warning-glow {\n  0% { opacity: 0; }\n  14.7% { opacity: 0.005; }\n  17.83% { opacity: 0.027; }\n  20.91% { opacity: 0.093; }\n  24.04% { opacity: 0.198; }\n  27.13% { opacity: 0.253; }\n  30.26% { opacity: 0.196; }\n  33.35% { opacity: 0.093; }\n  36.48% { opacity: 0.026; }\n  39.57% { opacity: 0.005; }\n  52% { opacity: 0.003; }\n  55.96% { opacity: 0.016; }\n  59.91% { opacity: 0.055; }\n  63.87% { opacity: 0.116; }\n  67.83% { opacity: 0.15; }\n  71.78% { opacity: 0.116; }\n  75.74% { opacity: 0.055; }\n  79.7% { opacity: 0.016; }\n  83.65% { opacity: 0.003; }\n  to { opacity: 0; }\n}\n\n@keyframes cx-usage-beat-critical {\n  0% { transform: scale(1); }\n  14.34% { transform: scale(1.0006); }\n  17.38% { transform: scale(1.0037); }\n  20.41% { transform: scale(1.0129); }\n  23.45% { transform: scale(1.0274); }\n  26.48% { transform: scale(1.0352); }\n  29.52% { transform: scale(1.0274); }\n  32.55% { transform: scale(1.0129); }\n  35.59% { transform: scale(1.0037); }\n  38.62% { transform: scale(1.0006); }\n  50.76% { transform: scale(1.0004); }\n  54.62% { transform: scale(1.002); }\n  58.48% { transform: scale(1.0071); }\n  62.34% { transform: scale(1.015); }\n  66.21% { transform: scale(1.0192); }\n  70.07% { transform: scale(1.015); }\n  73.93% { transform: scale(1.0071); }\n  77.79% { transform: scale(1.002); }\n  81.66% { transform: scale(1.0004); }\n  to { transform: scale(1); }\n}\n\n@keyframes cx-usage-beat-critical-glow {\n  0% { opacity: 0; }\n  14.34% { opacity: 0.005; }\n  17.38% { opacity: 0.027; }\n  20.41% { opacity: 0.093; }\n  23.45% { opacity: 0.197; }\n  26.48% { opacity: 0.253; }\n  29.52% { opacity: 0.197; }\n  32.55% { opacity: 0.093; }\n  35.59% { opacity: 0.027; }\n  38.62% { opacity: 0.005; }\n  50.76% { opacity: 0.003; }\n  54.62% { opacity: 0.016; }\n  58.48% { opacity: 0.055; }\n  62.34% { opacity: 0.116; }\n  66.21% { opacity: 0.15; }\n  70.07% { opacity: 0.116; }\n  73.93% { opacity: 0.055; }\n  77.79% { opacity: 0.016; }\n  81.66% { opacity: 0.003; }\n  to { opacity: 0; }\n}\n\n@keyframes cx-usage-beat-limit {\n  0% { transform: scale(1); }\n  4.53% { transform: scale(1.0009); }\n  5.47% { transform: scale(1.0049); }\n  6.41% { transform: scale(1.0167); }\n  7.39% { transform: scale(1.0359); }\n  8.33% { transform: scale(1.0458); }\n  9.27% { transform: scale(1.0359); }\n  10.24% { transform: scale(1.0167); }\n  11.18% { transform: scale(1.0049); }\n  12.16% { transform: scale(1.0008); }\n  15.96% { transform: scale(1.0005); }\n  17.18% { transform: scale(1.0027); }\n  18.41% { transform: scale(1.0093); }\n  19.59% { transform: scale(1.0194); }\n  20.82% { transform: scale(1.025); }\n  22.04% { transform: scale(1.0194); }\n  23.27% { transform: scale(1.009); }\n  24.45% { transform: scale(1.0027); }\n  25.67% { transform: scale(1.0005); }\n  73.92% { transform: scale(1.0009); }\n  74.86% { transform: scale(1.0049); }\n  75.8% { transform: scale(1.0167); }\n  76.78% { transform: scale(1.0359); }\n  77.71% { transform: scale(1.0458); }\n  78.65% { transform: scale(1.0359); }\n  79.63% { transform: scale(1.0167); }\n  80.57% { transform: scale(1.0049); }\n  81.55% { transform: scale(1.0008); }\n  85.35% { transform: scale(1.0005); }\n  86.57% { transform: scale(1.0027); }\n  87.8% { transform: scale(1.0093); }\n  88.98% { transform: scale(1.0194); }\n  90.2% { transform: scale(1.025); }\n  91.43% { transform: scale(1.0194); }\n  92.65% { transform: scale(1.009); }\n  93.84% { transform: scale(1.0027); }\n  95.06% { transform: scale(1.0005); }\n  to { transform: scale(1); }\n}\n\n@keyframes cx-usage-beat-limit-glow {\n  0% { opacity: 0; }\n  4.53% { opacity: 0.006; }\n  5.47% { opacity: 0.035; }\n  6.41% { opacity: 0.12; }\n  7.39% { opacity: 0.258; }\n  8.33% { opacity: 0.329; }\n  9.27% { opacity: 0.258; }\n  10.24% { opacity: 0.12; }\n  11.18% { opacity: 0.035; }\n  12.16% { opacity: 0.006; }\n  15.96% { opacity: 0.004; }\n  17.18% { opacity: 0.021; }\n  18.41% { opacity: 0.073; }\n  19.59% { opacity: 0.151; }\n  20.82% { opacity: 0.194; }\n  22.04% { opacity: 0.151; }\n  23.27% { opacity: 0.07; }\n  24.45% { opacity: 0.021; }\n  25.67% { opacity: 0.004; }\n  73.92% { opacity: 0.006; }\n  74.86% { opacity: 0.035; }\n  75.8% { opacity: 0.12; }\n  76.78% { opacity: 0.258; }\n  77.71% { opacity: 0.329; }\n  78.65% { opacity: 0.258; }\n  79.63% { opacity: 0.12; }\n  80.57% { opacity: 0.035; }\n  81.55% { opacity: 0.006; }\n  85.35% { opacity: 0.004; }\n  86.57% { opacity: 0.021; }\n  87.8% { opacity: 0.073; }\n  88.98% { opacity: 0.151; }\n  90.2% { opacity: 0.194; }\n  91.43% { opacity: 0.151; }\n  92.65% { opacity: 0.07; }\n  93.84% { opacity: 0.021; }\n  95.06% { opacity: 0.004; }\n  to { opacity: 0; }\n}\n";

// src/styles/shell.css
var shell_default = "/* shell */\n\n/* \u53BB\u6389\u804A\u5929\u533A\u6700\u4E0A\u65B9\u7684\u4F1A\u8BDD\u6807\u7B7E\u680F\uFF08\u8FDE\u540C\u300C+\u300D\uFF09\u3002\u53EA\u8BA4\u88C5\u7740 workspace / session-tile \u6807\u7B7E\u7684\u90A3\u6761\uFF0C\n   \u5DE6\u4FA7\u300C\u4F1A\u8BDD | \u673A\u5668\u4EBA\u300D\u548C\u53F3\u4FA7\u680F\u7684\u6807\u7B7E\u680F\u4E0D\u53D7\u5F71\u54CD\u3002\u5207\u6362\u4F1A\u8BDD\u7528\u5DE6\u4FA7\u4F1A\u8BDD\u5217\u8868\u6216 \u23181\u2026\u23189\u3001\u2303Tab\uFF0C\u65B0\u5EFA\u7528 \u2318T\u3002\n   \u6807\u7B7E\u8BA9\u51FA\u7684\u90A3\u6BB5\u6807\u9898\u680F\u4EA4\u7ED9\u62D6\u62FD\u628A\u624B\uFF0C\u7A97\u53E3\u7167\u5E38\u53EF\u62D6\uFF1B\u5934\u90E8\u9AD8\u5EA6\u56DE\u843D\u5230\u6807\u9898\u680F\u672C\u8EAB\uFF0C\u7A84\u7A97\u53E3\u4E0B\u4E0D\u7559\u7A7A\u884C\u3002 */\n:root [data-panel-header]:has([data-tree-tab='workspace'], [data-tree-tab^='session-tile:']) {\n  height: auto !important;\n}\n\n:root [data-panel-header]:has([data-tree-tab='workspace'], [data-tree-tab^='session-tile:']) [data-zone-tabstrip] {\n  display: none;\n}\n\n:root [data-panel-header]:has([data-tree-tab='workspace'], [data-tree-tab^='session-tile:']) > [data-window-drag-handle] {\n  flex: 1 1 0;\n}\n";

// src/styles/tokens.css
var tokens_default = "/* \u2500\u2500 Claude UI \xB7 tokens \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n   Hermes \u7684\u8868\u9762\u8272\u7531\u79CD\u5B50\u8272 color-mix \u63A8\u5BFC\uFF08styles.css @layer base\uFF09\u3002\u8FD9\u91CC\u4E0D\u5206\u5C42\uFF0C\n   \u76F4\u63A5\u628A\u63A8\u5BFC\u7ED3\u679C\u9489\u56DE\u8BBE\u8BA1\u503C\uFF0C\u5E76\u53BB\u6389\u5F3A\u8C03\u8272\u5728\u4E2D\u6027\u586B\u5145\u548C\u63CF\u8FB9\u91CC\u7684\u63BA\u8272\uFF1A\n   codex-ui \u7684\u5C42\u6B21\u53EA\u9760\u58A8\u8272\u900F\u660E\u5EA6\uFF0C\u84DD\u8272\u53EA\u7559\u7ED9\u4EA4\u4E92\u4E0E Hermes \u7684\u54C1\u724C\u5143\u7D20\u3002 */\n\n:root {\n  --radius-scalar: 0.4;\n\n  --ui-bg-chrome: var(--theme-background-seed);\n  --ui-bg-sidebar: var(--theme-sidebar-seed);\n  --ui-bg-editor: var(--theme-card-seed);\n  --ui-bg-elevated: var(--theme-elevated-seed);\n  --ui-chat-bubble-background: var(--theme-bubble-seed);\n  --ui-widget-surface-background: var(--theme-card-seed);\n\n  --theme-fill-primary-accent-mix: 0%;\n  --theme-fill-secondary-accent-mix: 0%;\n  --theme-fill-tertiary-accent-mix: 0%;\n  --theme-fill-quaternary-accent-mix: 0%;\n  --theme-fill-quinary-accent-mix: 0%;\n  --theme-stroke-primary-accent-mix: 0%;\n  --theme-stroke-secondary-accent-mix: 0%;\n  --theme-stroke-tertiary-accent-mix: 0%;\n  --theme-stroke-quaternary-accent-mix: 0%;\n  --theme-row-hover-accent-mix: 0%;\n  --theme-row-active-accent-mix: 0%;\n  --theme-control-hover-accent-mix: 0%;\n  --theme-control-active-accent-mix: 0%;\n\n  --ui-blue: var(--theme-primary);\n\n  /* codex-ui \u52A8\u6548\uFF08tokens.css:235-247\uFF09 */\n  --cx-dur-fast: 60ms;\n  --cx-dur-snap: 120ms;\n  --cx-dur-base: 200ms;\n  --cx-dur-sheet: 300ms;\n  --cx-dur-slow: 450ms;\n  --cx-ease-out: cubic-bezier(0.165, 0.84, 0.44, 1);\n  --cx-ease-snap: cubic-bezier(0.32, 0.72, 0, 1);\n  --cx-overshoot: cubic-bezier(0.34, 1.3, 0.64, 1);\n\n  /* \u672C\u63D2\u4EF6\u81EA\u5DF1\u7684\u7EC4\u4EF6\u4E0E\u91CD\u5851\u89C4\u5219\u5171\u7528\u7684\u51E0\u4E2A\u91CF */\n  --cx-surface: var(--ui-bg-editor);\n  --cx-popover: var(--ui-bg-elevated);\n  --cx-hover: color-mix(in srgb, var(--ui-base) 5%, transparent);\n  --cx-selected: color-mix(in srgb, var(--ui-base) 10%, transparent);\n  --cx-line: color-mix(in srgb, var(--ui-base) 10%, transparent);\n  --cx-line-strong: color-mix(in srgb, var(--ui-base) 20%, transparent);\n  --cx-edge: 0 0 0 1px var(--cx-line);\n  --cx-edge-strong: 0 0 0 1px var(--cx-line-strong);\n  --cx-shadow-popover: 0 8px 24px #0000001f, 0 2px 6px #00000014;\n  --cx-shadow-dialog: 0 4px 8px #0b0b0b14, 0 12px 28px -2px #0b0b0b14;\n  --cx-shadow-composer: 0 0.25rem 1.25rem color-mix(in srgb, #000 3.5%, transparent);\n  --cx-shadow-composer-focus: 0 0.25rem 1.25rem color-mix(in srgb, #000 7.5%, transparent);\n  --cx-radius-control: 4px;\n  --cx-radius-card: 6px;\n  --cx-radius-dock: 10px;\n}\n\n:root:not(.dark) {\n  --ui-text-primary: #0b0b0b;\n  --ui-text-secondary: #52514e;\n  --ui-text-tertiary: #898781;\n  --ui-text-quaternary: color-mix(in srgb, #0b0b0b 35%, transparent);\n  --conversation-scaffold-text: #898781;\n  --conversation-scaffold-meta: color-mix(in srgb, #0b0b0b 35%, transparent);\n\n  --ui-row-hover-background: color-mix(in srgb, #0b0b0b 4.5%, transparent);\n  --ui-row-active-background: color-mix(in srgb, #0b0b0b 7%, transparent);\n  --ui-control-hover-background: color-mix(in srgb, #0b0b0b 5%, transparent);\n  --ui-control-active-background: color-mix(in srgb, #0b0b0b 8%, transparent);\n\n  --ui-red: #d03b3b;\n  --ui-green: #1e9e3c;\n  --ui-yellow: #c98a00;\n  --ui-orange: #c5621b;\n  --ui-purple: #7161e0;\n  --ui-diff-add-border: #1e9e3c;\n  --ui-diff-add-background: color-mix(in srgb, #1e9e3c 14%, transparent);\n  --ui-diff-add-foreground: #157a2e;\n  --ui-diff-remove-border: #cd2054;\n  --ui-diff-remove-background: color-mix(in srgb, #cd2054 12%, transparent);\n  --ui-diff-remove-foreground: #a8173f;\n\n  --ui-inline-code-background: color-mix(in srgb, #0b0b0b 5%, transparent);\n  --ui-inline-code-foreground: #8e2626;\n  --ui-selection-background: color-mix(in srgb, #1f5fe0 20%, transparent);\n  --dt-scrollbar-thumb: rgb(30 30 29 / 35%);\n\n  --cx-warning: #734500;\n  --cx-warning-fill: #fab219;\n  --cx-warning-bg: #f9dca4;\n  --cx-danger: #8e2626;\n  --cx-success: #006300;\n  --cx-pro: #4a3aa7;\n  --cx-pro-fill: #7161e0;\n  --cx-git-add: #1e9e3c;\n  --cx-git-remove: #cd2054;\n}\n\n:root.dark {\n  --ui-text-primary: #f0efec;\n  --ui-text-secondary: #c3c2b7;\n  --ui-text-tertiary: #898781;\n  --ui-text-quaternary: color-mix(in srgb, #ffffff 35%, transparent);\n  --conversation-scaffold-text: #898781;\n  --conversation-scaffold-meta: color-mix(in srgb, #ffffff 35%, transparent);\n\n  --ui-row-hover-background: color-mix(in srgb, #ffffff 7.5%, transparent);\n  --ui-row-active-background: color-mix(in srgb, #ffffff 11%, transparent);\n  --ui-control-hover-background: color-mix(in srgb, #ffffff 7.5%, transparent);\n  --ui-control-active-background: color-mix(in srgb, #ffffff 12%, transparent);\n\n  --ui-red: #ec7e7e;\n  --ui-green: #32d74b;\n  --ui-yellow: #db9300;\n  --ui-orange: #fa832e;\n  --ui-purple: #a096eb;\n  --ui-diff-add-border: #32d74b;\n  --ui-diff-add-background: color-mix(in srgb, #32d74b 16%, transparent);\n  --ui-diff-add-foreground: color-mix(in srgb, #32d74b 70%, #fff);\n  --ui-diff-remove-border: #ff2c56;\n  --ui-diff-remove-background: color-mix(in srgb, #ff2c56 16%, transparent);\n  --ui-diff-remove-foreground: color-mix(in srgb, #ff2c56 62%, #fff);\n\n  --ui-inline-code-background: color-mix(in srgb, #ffffff 7%, transparent);\n  --ui-inline-code-foreground: #ec7e7e;\n  --ui-selection-background: color-mix(in srgb, #7aa2ff 28%, transparent);\n  --dt-scrollbar-thumb: rgb(225 224 217 / 35%);\n\n  --cx-hover: color-mix(in srgb, #ffffff 7.5%, transparent);\n  --cx-selected: color-mix(in srgb, #ffffff 15%, transparent);\n  --cx-edge: inset 0 0 0 1px var(--cx-line);\n  --cx-edge-strong: inset 0 0 0 1px var(--cx-line-strong);\n  --cx-shadow-popover: 0 8px 24px #0000003d, 0 2px 6px #00000029;\n  --cx-shadow-dialog: 0 4px 8px #0000003d, 0 12px 28px -2px #0000003d;\n\n  --cx-warning: #db9300;\n  --cx-warning-fill: #fab219;\n  --cx-warning-bg: #311a00;\n  --cx-danger: #ec7e7e;\n  --cx-success: #0ca30c;\n  --cx-pro: #a096eb;\n  --cx-pro-fill: #7161e0;\n  --cx-git-add: #32d74b;\n  --cx-git-remove: #ff2c56;\n}\n\n/* codex-ui \u7684\u6587\u5B57\u9AD8\u5149\uFF08base.css:1615 / tokens.css:963\uFF09\uFF1A3s \u4E00\u6B21\uFF0C\u9996\u5C3E\u5404\u505C 15%\u3002\n   \u8986\u76D6 Hermes \u7684 tw-shimmer\uFF0C\u8BA9\u5DE5\u4F5C\u884C\u3001\u8FD0\u884C\u4E2D\u5DE5\u5177\u884C\u7528\u540C\u4E00\u79CD\u5149\u3002 */\n@keyframes cx-shimmer {\n  0%,\n  15% {\n    background-position: 83.333% 0;\n    animation-timing-function: cubic-bezier(0.714, 0.121, 0.211, 0.888);\n  }\n  85%,\n  100% {\n    background-position: 16.667% 0;\n  }\n}\n\n@keyframes cx-breathe {\n  0%,\n  100% {\n    filter: brightness(0.96);\n    transform: scale(0.86);\n  }\n  50% {\n    filter: brightness(1.06);\n    transform: scale(1);\n  }\n}\n\n@keyframes cx-blink {\n  0%,\n  100% {\n    opacity: 0.3;\n  }\n  50% {\n    opacity: 1;\n  }\n}\n\n@media (prefers-reduced-motion: reduce) {\n  :root .shimmer,\n  :root .cx-shimmer,\n  :root [data-cx-breathe] {\n    animation: none !important;\n  }\n}\n";

// src/styles/transcript.css
var transcript_default = "/* \u2500\u2500 Claude UI \xB7 transcript \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n   codex-ui \u7684\u6D88\u606F\u6D41\uFF1A\u52A9\u624B\u6B63\u6587\u4E0D\u5957\u5BB9\u5668\uFF0C\u811A\u624B\u67B6\uFF08\u601D\u8003\u3001\u5DE5\u5177\uFF09\u538B\u6210\u4E00\u884C muted \u7070\u5B57\uFF0C\n   \u8FD0\u884C\u4E2D\u624D\u52A0 shimmer\uFF1B\u5C42\u6B21\u9760\u989C\u8272\u800C\u4E0D\u662F\u6574\u4F53\u53D8\u6DE1\u3002 */\n\n/* \u811A\u624B\u67B6\u4E0D\u518D\u6574\u4F53\u964D\u5230 0.67 \u4E0D\u900F\u660E\u5EA6\uFF0C\u6539\u7528 muted \u989C\u8272\u5206\u5C42\uFF0Chover \u63D0\u5230 secondary */\n:root [data-slot='aui_assistant-message-content'] [data-conversation-scaffold],\n:root [data-slot='aui_background-result'] [data-conversation-scaffold],\n:root [data-slot='aui_background-resume'] {\n  opacity: 1;\n}\n\n:root {\n  --disclosure-caret-rest: 0.55;\n}\n\n/* \u2500\u2500 \u6587\u5B57\u9AD8\u5149\uFF1Acodex-ui \u7684 3s \u626B\u5149\uFF0C\u66FF\u6362 Hermes \u7684 tw-shimmer \u2500\u2500 */\n:root .shimmer:not(.shimmer-bg),\n:root .cx-shimmer {\n  --cx-st-base: var(--ui-text-secondary);\n  --cx-st-peak: color-mix(in srgb, var(--ui-text-secondary) 30%, white);\n  color: var(--cx-st-base);\n  background: linear-gradient(120deg, var(--cx-st-base) 37.5%, var(--cx-st-peak) 50%, var(--cx-st-base) 62.5%) 83.333% 0 / 400% 100% no-repeat;\n  -webkit-background-clip: text;\n  background-clip: text;\n  -webkit-text-fill-color: transparent;\n  animation: cx-shimmer 3s linear infinite;\n}\n\n:root.dark .shimmer:not(.shimmer-bg),\n:root.dark .cx-shimmer {\n  --cx-st-base: var(--ui-text-secondary);\n  --cx-st-peak: var(--ui-text-primary);\n}\n\n/* \u2500\u2500 \u7528\u6237\u6D88\u606F\uFF1A5% \u58A8\u8272\u7684\u5B9E\u8272\u6C14\u6CE1\uFF08\u5B83\u662F sticky \u7684\uFF0C\u5FC5\u987B\u4E0D\u900F\u660E\uFF09\uFF0C\u65E0\u63CF\u8FB9 \u2500\u2500 */\n:root .composer-human-message {\n  border-color: transparent;\n  border-radius: 8px;\n}\n\n:root .composer-human-message:hover {\n  border-color: var(--cx-line);\n}\n\n/* \u2500\u2500 \u601D\u8003\u5757 \u2500\u2500 */\n:root [data-slot='aui_thinking-disclosure'] [data-slot='aui_thinking-body'],\n:root [data-slot='aui_thinking-disclosure'] [data-slot='aui_reasoning-text'] {\n  color: var(--ui-text-tertiary);\n  font-style: italic;\n}\n\n/* \u2500\u2500 \u5DE5\u5177\u884C\uFF1A\u4E00\u884C\u7070\u5B57\u300C\u52A8\u8BCD \xB7 \u8BE6\u60C5 \xB7 \u7ED3\u679C \u203A\u300D \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n/* \u53BB\u6389\u56FE\u6807\u683C\uFF08\u8FD0\u884C\u4E2D\u7684 spinner\u3001\u6210\u529F/\u5931\u8D25\u56FE\u6807\u90FD\u5728\u8FD9\u91CC\uFF09\uFF1Bcodex-ui \u7684\u884C\u662F\u7EAF\u6587\u5B57 */\n:root [data-slot='tool-block'][data-tool-row] [class~='size-3.5'][class~='place-items-center'] {\n  display: none;\n}\n\n/* \u6807\u9898\u9ED8\u8BA4 muted\uFF1Bhover \u5230 secondary */\n:root [data-slot='tool-block'] .group\\/disclosure-row,\n:root [data-slot='aui_thinking-disclosure'] .group\\/disclosure-row {\n  color: var(--conversation-scaffold-text);\n}\n\n:root [data-slot='tool-block'] .group\\/disclosure-row:hover [class*='text-(--conversation-scaffold-text)'],\n:root [data-slot='aui_thinking-disclosure'] .group\\/disclosure-row:hover [class*='text-(--conversation-scaffold-text)'] {\n  color: var(--ui-text-secondary);\n}\n\n/* \u7BAD\u5934\u632A\u5230\u884C\u5C3E\uFF1A\u6309\u94AE\u91CC\u7684\u539F\u7BAD\u5934\u9690\u85CF\uFF0C\u7531\u6574\u884C\u7684 ::after \u753B\uFF1B\u6309\u94AE\u7684 ::before \u6491\u6EE1\u6574\u884C\uFF0C\u6574\u884C\u90FD\u80FD\u70B9 */\n:root :is([data-slot='tool-block'], [data-slot='aui_thinking-disclosure'], [data-approval-activity]) .group\\/disclosure-row > button > span:last-child:has(> .codicon-chevron-right) {\n  display: none;\n}\n\n:root :is([data-slot='tool-block'], [data-slot='aui_thinking-disclosure'], [data-approval-activity]) .group\\/disclosure-row:has(> button[aria-expanded])::after {\n  content: '\u203A';\n  order: 50;\n  align-self: flex-start;\n  width: 0.75em;\n  margin-left: 0.3em;\n  line-height: var(--conversation-line-height);\n  text-align: center;\n  color: var(--ui-text-tertiary);\n  opacity: var(--disclosure-caret-rest);\n  transition:\n    transform var(--cx-dur-snap) var(--cx-ease-snap),\n    opacity var(--cx-dur-snap) ease-out;\n  pointer-events: none;\n}\n\n:root :is([data-slot='tool-block'], [data-slot='aui_thinking-disclosure'], [data-approval-activity]) .group\\/disclosure-row:hover::after {\n  opacity: 0.9;\n}\n\n:root :is([data-slot='tool-block'], [data-slot='aui_thinking-disclosure'], [data-approval-activity]) .group\\/disclosure-row:has(> button[aria-expanded='true'])::after {\n  transform: rotate(90deg);\n}\n\n:root :is([data-slot='tool-block'], [data-slot='aui_thinking-disclosure'], [data-approval-activity]) .group\\/disclosure-row > button[aria-expanded]::before {\n  content: '';\n  position: absolute;\n  inset: 0;\n}\n\n/* \u884C\u5C3E\u7684\u8BA1\u65F6\u3001\u8FDB\u5EA6\u3001\u65F6\u95F4\u6233\u7D27\u8DDF\u6807\u9898\uFF0C\u7528\u300C\xB7\u300D\u5206\u9694\uFF1B\u5173\u95ED\u6309\u94AE\u653E\u5230\u6700\u540E\uFF0C\u5E76\u538B\u5728\u6574\u884C\u70ED\u533A\u4E4B\u4E0A */\n:root :is([data-slot='tool-block'], [data-slot='aui_thinking-disclosure'], [data-approval-activity]) .group\\/disclosure-row > span[class~='ml-auto'] {\n  order: 60;\n  margin-left: auto;\n  position: relative;\n  z-index: 1;\n}\n\n:root :is([data-slot='tool-block'], [data-slot='aui_thinking-disclosure'], [data-approval-activity]) .group\\/disclosure-row > span:last-child:not([class~='ml-auto']) {\n  order: 40;\n  padding-left: 0;\n}\n\n:root :is([data-slot='tool-block'], [data-slot='aui_thinking-disclosure'], [data-approval-activity]) .group\\/disclosure-row > span:last-child:not([class~='ml-auto']) > span:not(:empty) {\n  margin-left: 0.4em;\n}\n\n:root :is([data-slot='tool-block'], [data-slot='aui_thinking-disclosure'], [data-approval-activity]) .group\\/disclosure-row > span:last-child:not([class~='ml-auto']) > span:not(:empty)::before,\n:root [data-slot='tool-block'] .group\\/disclosure-row > button [class~='tabular-nums']:not(:empty):not(:has(> [class*='text-emerald-'], > [class*='text-rose-']))::before {\n  content: '\xB7';\n  margin-right: 0.4em;\n  color: var(--ui-text-quaternary);\n}\n\n/* \u8FD0\u884C\u4E2D\uFF1A\u6574\u884C secondary + \u626B\u5149\uFF08\u539F\u751F\u53EA\u95EA\u52A8\u8BCD\uFF09 */\n:root [data-slot='tool-block'][data-tool-row]:has(.glyph-spinner) [class*='text-(--conversation-scaffold-meta)'],\n:root [data-slot='tool-block'][data-tool-summary] [class*='text-(--conversation-scaffold-text)']:has(.shimmer),\n:root [data-tool-summary]:has(.shimmer) [class*='text-(--conversation-scaffold-text)'] {\n  --cx-st-base: var(--ui-text-secondary);\n  --cx-st-peak: color-mix(in srgb, var(--ui-text-secondary) 30%, white);\n  color: var(--ui-text-secondary);\n  background: linear-gradient(120deg, var(--cx-st-base) 37.5%, var(--cx-st-peak) 50%, var(--cx-st-base) 62.5%) 83.333% 0 / 400% 100% no-repeat;\n  -webkit-background-clip: text;\n  background-clip: text;\n  -webkit-text-fill-color: transparent;\n  animation: cx-shimmer 3s linear infinite;\n}\n\n:root.dark [data-slot='tool-block'][data-tool-row]:has(.glyph-spinner) [class*='text-(--conversation-scaffold-meta)'],\n:root.dark [data-tool-summary]:has(.shimmer) [class*='text-(--conversation-scaffold-text)'] {\n  --cx-st-peak: var(--ui-text-primary);\n}\n\n:root [data-slot='tool-block'][data-tool-row]:has(.glyph-spinner) [class*='text-(--conversation-scaffold-meta)'] .shimmer,\n:root [data-tool-summary]:has(.shimmer) [class*='text-(--conversation-scaffold-text)'] .shimmer {\n  background: none;\n  -webkit-text-fill-color: inherit;\n  animation: none;\n}\n\n/* \u8FD0\u884C\u4E2D\u5408\u5E76\u6210\u4E00\u884C\uFF1A\u4E0D\u663E\u793A\u5355\u884C\u6EDA\u52A8\u6761\uFF0C\u7531\u6458\u8981\u884C\u627F\u62C5 */\n:root [data-tool-ticker] {\n  display: none;\n}\n\n/* \u5C55\u5F00\u540E\u7684\u5361\u7247\uFF1A\u5706\u89D2 6\u30011px \u58A8\u8272\u73AF\uFF0C\u767D/\u8FD1\u9ED1\u5361\u9762 */\n:root [data-slot='tool-block'][data-tool-row][data-tool-open] {\n  border-color: var(--cx-line);\n  border-radius: var(--cx-radius-card);\n  background: var(--cx-surface) !important;\n}\n\n:root [data-slot='tool-block'][data-tool-row][data-tool-open] > div:first-child {\n  border-color: var(--cx-line);\n}\n\n/* \u6587\u4EF6\u6539\u52A8\u7684 +N \u2212N\uFF1Acodex-ui \u7684\u5C0F\u5FBD\u7AE0 */\n:root [data-slot='tool-block'] [class~='font-mono'][class~='tabular-nums']:has(> [class*='text-emerald-']) {\n  gap: 3px;\n}\n\n:root [data-slot='tool-block'] [class~='font-mono'][class~='tabular-nums'] > :is([class*='text-emerald-'], [class*='text-rose-']) {\n  height: 16px;\n  padding: 0 4px;\n  border-radius: 4px;\n  font-family: var(--dt-font-sans);\n  font-size: 10px;\n  font-weight: 500;\n  line-height: 16px;\n}\n\n:root [data-slot='tool-block'] [class~='font-mono'][class~='tabular-nums'] > [class*='text-emerald-'] {\n  color: var(--cx-git-add);\n  background: color-mix(in srgb, var(--cx-git-add) 18%, transparent);\n}\n\n:root [data-slot='tool-block'] [class~='font-mono'][class~='tabular-nums'] > [class*='text-rose-'] {\n  color: var(--cx-git-remove);\n  background: color-mix(in srgb, var(--cx-git-remove) 16%, transparent);\n}\n\n/* \u2500\u2500 \u5DE5\u4F5C\u884C\uFF1A\u6CBF\u7528 Hermes \u7684 dither \u65B9\u5757\uFF0C\u67D3\u6210\u84DD\u8272\u5E76\u52A0 codex-ui \u7684\u547C\u5438 \u2500\u2500 */\n:root :is([data-slot='aui_response-loading'], [data-slot='aui_turn-activity']) .dither {\n  color: var(--ui-accent);\n  opacity: 1;\n  animation: cx-breathe 3s ease-in-out infinite;\n}\n\n:root :is([data-slot='aui_response-loading'], [data-slot='aui_turn-activity']) [class*='tabular-nums'] {\n  color: var(--ui-text-tertiary);\n  font-variant-numeric: tabular-nums;\n}\n\n/* \u2500\u2500 \u6B63\u6587\u6392\u7248 \u2500\u2500 */\n:root .aui-md :not(pre) > code {\n  border-radius: 0.4em;\n  box-shadow: inset 0 0 0 0.5px var(--cx-line);\n}\n\n:root .aui-md [data-slot='code-card'] {\n  border-radius: var(--cx-radius-card);\n  box-shadow: inset 0 0 0 1px var(--cx-line);\n}\n\n:root .aui-md blockquote {\n  border-color: var(--cx-line-strong);\n  color: var(--ui-text-secondary);\n  font-style: normal;\n}\n\n:root .aui-md blockquote p::before,\n:root .aui-md blockquote p::after {\n  content: none;\n}\n\n:root .aui-md-table {\n  border-color: var(--cx-line);\n  border-radius: var(--cx-radius-card);\n}\n\n:root .aui-md a:not([data-ref]) {\n  color: var(--ui-accent);\n  text-decoration-color: color-mix(in srgb, currentColor 40%, transparent);\n  text-underline-offset: 3px;\n}\n\n:root .aui-md a:not([data-ref]):hover {\n  text-decoration-color: currentColor;\n}\n";

// src/plugin.tsx
import { jsx as jsx6 } from "react/jsx-runtime";
var customCSS = [tokens_default, shell_default, transcript_default, composer_default, overlays_default, components_default, effort_default, quota_default].join("\n");
var plugin_default = {
  id: PLUGIN_ID,
  name: "Claude UI",
  description: "Hermes, dressed in codex-ui details: warm paper neutrals, one-line tool rows, docked cards, the effort slider, plan usage ring and a session panel.",
  register(ctx2) {
    setPluginContext(ctx2);
    ctx2.i18n?.register?.(BUNDLES);
    ctx2.register({ id: "theme", area: THEMES_AREA, data: buildTheme(customCSS) });
    ctx2.register({ id: "quota", area: COMPOSER_AREAS.actions, order: 10, render: () => /* @__PURE__ */ jsx6(QuotaControl, {}) });
    ctx2.register({ id: "effort", area: COMPOSER_AREAS.actions, order: 20, render: () => /* @__PURE__ */ jsx6(EffortControl, {}) });
    ctx2.register({ id: "todos", area: COMPOSER_AREAS.microActions, data: todoProvider });
    ctx2.register({ id: "rail-manager", area: TITLEBAR_AREAS.right, render: () => /* @__PURE__ */ jsx6(RailManager, {}) });
    bindQuota(ctx2);
    if (!ctx2.storage.get("switched", false)) {
      ctx2.storage.set("switched", true);
      requestTheme(THEME_NAME);
    }
  }
};
export {
  plugin_default as default
};
