// 努力强度滑块的充能场：codex-ui Composer.tsx 的 chargeField 与着色器（W22 Ultracode 的 WebGL2 场，
// c227f4d5e yK / bK / gK / rK）原样移植，只换了色系。纯 TS，不依赖任何模块。
//
// 3px 的方格排在 4px 的网格上。手柄停在某档时，每 0.3–0.75s 从它那里迸出一次脉冲，强度从到达起
// 1.6s 内蓄满；脉冲按曼哈顿距离带着参差的前沿向外跑，点亮一批新挑的格子，格子沿五级色阶冷却，
// 并把「充能底色」一起带过去。整片场 0.7s 淡入，熄灭后 0.85s 冷却。Claude 只给最高档充能，这里
// 每一档都充，场跟着手柄走，画布上的 CSS 滤镜（slider.tsx 的 EFFORT_CHARGE）给它上该档的颜色。
// 快速模式（rush）加上条纹：同样的格子排成单行，从手柄往「更快」那头飞。ultra（power）更猛：到达
// 时一道冲击波，停留时节拍更慢，脉冲更强更密，手柄旁还有一团炽热的核心，冲击波来时它会闪亮。

const rgb = (hex: number) => [(hex >> 16) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255]

// 色系以 Hermes 蓝（--ui-accent：亮色 #1f5fe0、暗色 #7aa2ff）为基色，运行时读取：亮色放进底色深端
// u_charge1，暗色放进热墨 u_fg（原版暗色在这里读 pro 紫的文字色）。其余常量是原版紫色场在 ultra 滤镜
// hue-rotate(22.9deg) saturate(.812) brightness(.991) 下的原像——蓝色场套上 ultra 的滤镜就回到原版
// 的 pro 紫：暗色逐项吻合，亮色只有底色深端直接用了 #1f5fe0，落在 #574FCF（原版 #8964C4）。
/** 各主题的墨色与色阶（c227f4d5e mK + hK），按 uniform 名存。 */
const CHARGE_LIGHT: Record<string, number | number[]> = {
  u_fg: rgb(0xffeef9),
  u_fg2: rgb(0xb1c8fe),
  u_charge0: [...rgb(0x649ae4), 1],
  u_tintA: [...rgb(0xa9dffe), 0.28],
  u_tintB: [...rgb(0xffbae5), 0.28],
  u_bedFill: 1,
  u_chargeMax: 0.92,
  u_chargeRamp: 0.5,
  u_inkFloor: 0.28,
  u_inkCeil: 1,
  u_energyGain: 1.18,
  u_maskEnd: 0.45,
}
const CHARGE_DARK: Record<string, number | number[]> = {
  u_fg2: [1, 1, 1],
  u_charge0: [...rgb(0x768bff), 1],
  u_charge1: [...rgb(0x3649ab), 1],
  u_tintA: [0, 0, 0, 0],
  u_tintB: [0, 0, 0, 0],
  u_bedFill: 0,
  u_chargeMax: 0.85,
  u_chargeRamp: 1.1,
  u_inkFloor: 0.08,
  u_inkCeil: 0.85,
  u_energyGain: 1,
  u_maskEnd: 0.6,
}

/** 任意 CSS 颜色串 → 0..1 的 sRGB：在 1×1 的 2D 画布上填一下再读回；认不出的值被忽略，留下 fallback。 */
function srgb(color: string, fallback: string): number[] {
  const ctx = new OffscreenCanvas(1, 1).getContext('2d')!
  ctx.fillStyle = fallback
  ctx.fillStyle = color
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
  return [r / 255, g / 255, b / 255]
}

const CHARGE_VERTEX = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
uniform vec2 u_resolution;
void main() {
  v_uv = (a_position * 0.5 + 0.5) * u_resolution;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`

/** c227f4d5e rK 原样，注释精简。 */
const CHARGE_FRAGMENT = `#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec3 u_fg;  // 热墨
uniform vec3 u_fg2; // 冷墨，总比底色亮
uniform float u_seed;
// 脉冲环：各自发出的时刻（u_time 时钟）、原点（px）和强度 0..1。
const int MAX_BURSTS = 8;
uniform float u_burstTime[MAX_BURSTS];
uniform vec2 u_burstCenter[MAX_BURSTS];
uniform float u_burstGain[MAX_BURSTS];
uniform float u_fade; // 总包络，在量化前乘上
uniform float u_pos;  // 手柄位置（占轨道的比例）
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
uniform float u_maskEnd; // yK 的画布遮罩：在手柄跨度的这一段里由透明到不透明
// 快速模式的条纹环：各自出发的时刻（u_time 时钟）；原点 x（px）、所在行、速度（px/s）、强度。
const int MAX_STREAKS = 12;
uniform float u_streakTime[MAX_STREAKS];
uniform vec4 u_streak[MAX_STREAKS];
// ultra 的冲击波环：原点 x（px）、出发时刻（u_time 时钟）、强度、速度（格/s），从中线出发。
const int MAX_SHOCKS = 2;
uniform vec4 u_shock[MAX_SHOCKS];
uniform float u_core; // ultra 的核心，其余档为 0：停留时保持，脉冲让它闪烁，冲击波让它闪亮
uniform float u_knob; // 手柄宽度（px），让核心贴着它的近边
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
  // 整行铺满条高，格子保持正方。
  float pitch = u_resolution.y / max(round(u_resolution.y / CELL_PITCH), 1.0);
  float cellScale = pitch / CELL_PITCH;
  vec2 cell = floor(v_uv / pitch);
  vec2 cellCenter = (cell + 0.5) * pitch;

  // 抗锯齿的圆角矩形格子遮罩。
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
    // 充能底色随前沿到达，脉冲活着就一直在。
    charged = max(charged, smoothstep(0.0, 0.15, t) * reach);
    if (t < 0.0) continue;
    // 每次脉冲重新挑要点亮的格子。
    float rank = hash21(cell + 7.3 + u_seed + u_burstTime[i]);
    if (rank > mix(DENSITY_LO, DENSITY_HI, k)) continue;
    float head = HEAD_GAIN * exp(-t * HEAD_DECAY);
    float body = BODY_GAIN * exp(-t * mix(BODY_LO, BODY_HI, k));
    energy += (head + body) * mix(AMP_LO, 1.0, k) * falloff * reach * vary;
  }

  // 快速模式：条纹头经过时点亮所在行的格子，它们沿同样的五级冷却，跑得越快尾巴越长。
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

  // ultra 的冲击波：从手柄出发、贯穿整条高度的前沿，扫过每个够得着的格子；一道炽热的墙，身后的辉光
  // 慢慢冷却，经过处的底色被充能（最后一秒里放手，交给脉冲接管）。
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

  // 每格亮度在两种身份间漂移；一道微弱的波从右往左流过。
  float lumA = hash21(cell + 8.8 + u_seed);
  float lumB = hash21(cell + 88.8 + u_seed);
  float lumDrift = 0.5 + 0.5 * sin(u_time * 0.35 + lumA * 6.2832);
  float lum = pow(mix(lumA, lumB, lumDrift), 1.9);
  float stream = 0.9 + 0.16 * sin(u_time * 1.3 + cell.x * 0.45 + lumB * 2.0);
  float e = clamp(energy, 0.0, 1.0) * u_fade * mix(0.16, 1.0, lum) * stream * u_energyGain;
  e = max(e, min(dash, 1.0) * u_fade * mix(0.7, 1.0, lum));
  e = max(e, min(shock, 1.0) * u_fade * mix(0.85, 1.0, lum));

  // ultra 的核心：贴着手柄的格子在燃烧，紧挨着最热，往外一级级冷却（离中线稍远的冷得早些），
  // 核心闪亮时伸得更远。
  if (u_core > 0.0) {
    float d = (u_pos * u_resolution.x - u_knob - cellCenter.x) / pitch + abs(cellCenter.y - u_resolution.y * 0.5) / pitch * 0.5;
    float core = u_core * exp(-max(d, 0.0) / mix(2.0, 5.0, u_core));
    e = max(e, min(core, 1.0) * u_fade * mix(0.75, 1.0, lum));
  }

  // 充能底色：从左缘到手柄的渐变，越近手柄越深。
  float g = clamp(v_uv.x / max(u_pos * u_resolution.x, 1.0), 0.0, 1.0);
  vec3 chargeColor = mix(u_charge0.rgb, u_charge1.rgb, g);
  float bedMask = mix(u_bedFill, 1.0, cellMask);
  float chargeA = u_chargeMax * pow(g, u_chargeRamp) * charged * u_fade * bedMask * mix(u_charge0.a, u_charge1.a, g);

  // 五个离散的级，绝不是渐变；只有最高一级会呼吸。
  float lv = step(0.04, e) + step(0.2, e) + step(0.4, e) + step(0.6, e) + step(0.8, e);
  float alpha = lv <= 0.0 ? 0.0 : mix(u_inkFloor, u_inkCeil, (lv - 1.0) / 4.0);
  if (lv >= 5.0) {
    float period = BREATH_BASE + BREATH_VARY * hash21(cell + 3.1 + u_seed);
    float phase = hash21(cell + 5.5 + u_seed) * 6.2832;
    alpha *= 1.0 - BREATH_DIP * 0.5 * (1.0 + sin(u_time * 6.2832 / period + phase));
  }

  // 能量盖在充能上，预乘 alpha；少数格子偏向两种色调。
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
}`

/**
 * c227f4d5e gK，在手柄所在处充能。press(true) 开始迸发脉冲，press(false) 让场冷却；aim(stop, power)
 * 把它带到另一档，ultra 档为 power；rush(on) 放出快速模式的条纹；dispose() 停帧并释放 WebGL context。
 * 只在有东西可见时跑帧。没有 WebGL2 时返回 null（轨道只留充能底板）。
 */
export function chargeField(el: HTMLCanvasElement, handle: HTMLElement, stop: number, powered: boolean, rushing: boolean) {
  const gl = el.getContext('webgl2', { alpha: true, antialias: false, depth: false, stencil: false })
  if (!gl) return null
  const program = gl.createProgram()
  const shaders = (
    [
      [gl.VERTEX_SHADER, CHARGE_VERTEX],
      [gl.FRAGMENT_SHADER, CHARGE_FRAGMENT],
    ] as const
  ).map(([type, source]) => {
    const shader = gl.createShader(type)!
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    gl.attachShader(program, shader)
    return shader
  })
  gl.linkProgram(program)
  for (const shader of shaders) gl.deleteShader(shader)
  const buffer = gl.createBuffer()
  const locations: Record<string, WebGLUniformLocation | null> = {}
  const u = (name: string) => (locations[name] ??= gl.getUniformLocation(program, name))
  const parallel = gl.getExtension('KHR_parallel_shader_compile')

  const dpr = devicePixelRatio || 1
  const width = Math.max(1, el.clientWidth)
  const height = Math.max(1, el.clientHeight)
  el.width = Math.round(width * dpr)
  el.height = Math.round(height * dpr)

  const BURSTS = 8
  const times = new Float32Array(BURSTS).fill(-1e3)
  const centers = new Float32Array(BURSTS * 2)
  const gains = new Float32Array(BURSTS)
  let slot = 0
  let clock = 0 // 着色器时间（s），只在跑帧时前进
  let last = -1
  let fade = 0
  let held = 0
  let lastBurst = -Infinity
  let lastBurstAt = -Infinity
  let gap = 0.45
  let pressed = false
  let ready = false
  let running = false
  let frame = 0

  // 手柄远边占轨道的比例（gK 的 u_pos，最高档为 1）：rest 是停在该档时的位置，here 是此刻的位置，
  // 滑行途中或朝指针探身时都算。脉冲从这里出发，底色和遮罩一直铺到这里。
  const rest = () => (stop * (width - handle.offsetWidth) + handle.offsetWidth) / width
  const here = () => {
    const knob = handle.getBoundingClientRect()
    return ((knob.left + knob.right + handle.offsetWidth) / 2 - el.getBoundingClientRect().left) / width
  }
  // se(1, t)：最高档在蓄力进度 t 处的脉冲强度。ultra 蓄得更快（1s）且能到满强度，脉冲也更密。
  const strength = (t: number) => Math.min((powered ? 1 : 0.85) * (0.45 + 0.55 * t), 1)
  const built = () => Math.min(held / (powered ? 1 : 1.6), 1)
  // ultra 的核心（u_core）：停留时保持在一个下限，脉冲让它闪烁，每道冲击波让它闪亮。
  let surge = 0
  // ultra 的冲击波，两道一环：到达时那道快；停留时每 1.4–1.8s 一拍较弱的，比快速模式的条纹更沉更慢
  // （那时已蓄满），两者一眼分得开。
  const shocks = new Float32Array([0, -1e3, 0, 1, 0, -1e3, 0, 1])
  let shockSlot = 0
  let lastShock = -Infinity
  let nextBeat = 0
  const shock = (x: number, gain: number, speed: number) => {
    shocks.set([x * width, clock, gain, speed], shockSlot * 4)
    shockSlot = (shockSlot + 1) % 2
    gl.uniform4fv(u('u_shock[0]'), shocks)
    lastShock = clock
    nextBeat = clock + 1.4 + Math.random() * 0.4
    surge = Math.max(surge, 0.6 + 0.4 * gain)
    wake()
  }
  const burst = (gain: number, x: number) => {
    if (powered) surge = Math.max(surge, 0.5 + 0.15 * Math.min(gain, 1))
    times[slot] = clock
    centers[slot * 2] = x * width
    centers[slot * 2 + 1] = height * (0.35 + Math.random() * 0.3)
    gains[slot] = gain
    slot = (slot + 1) % BURSTS
    gl.uniform1fv(u('u_burstTime[0]'), times)
    gl.uniform2fv(u('u_burstCenter[0]'), centers)
    gl.uniform1fv(u('u_burstGain[0]'), gains)
    lastBurst = clock
    lastBurstAt = performance.now()
    wake()
  }
  // 快速模式的条纹，和脉冲一样是一个环：每条从手柄出发，换一行（不与上一条同行），蓄得越满越快越密。
  const STREAKS = 12
  const streakTimes = new Float32Array(STREAKS).fill(-1e3)
  const streaks = new Float32Array(STREAKS * 4)
  const rows = Math.max(Math.round(height / 4), 1)
  let streakSlot = 0
  let lastStreak = -Infinity
  let streakGap = 0
  let row = -1
  const streak = (k: number, x: number, delay = 0) => {
    row = (row + 1 + Math.floor(Math.random() * Math.max(rows - 1, 1))) % rows
    streakTimes[streakSlot] = clock + delay
    streaks.set([x * width, row, (200 + 160 * k) * (0.85 + Math.random() * 0.3), 1 + Math.random() * 0.3], streakSlot * 4)
    streakSlot = (streakSlot + 1) % STREAKS
    gl.uniform1fv(u('u_streakTime[0]'), streakTimes)
    gl.uniform4fv(u('u_streak[0]'), streaks)
    lastStreak = clock + delay
    wake()
  }
  const tick = (now: number) => {
    const dt = last < 0 ? 0 : Math.max(0, (now - last) / 1000)
    clock += dt
    last = now
    fade = pressed ? Math.min(fade + dt / 0.7, 1) : Math.max(fade - dt / 0.85, 0)
    held = pressed ? held + dt : 0
    const pos = here()
    if (pressed && clock - lastBurst > gap) {
      gap = (0.3 + Math.random() * 0.45) * (powered ? 0.7 : 1)
      burst(strength(built()) * (0.85 + Math.random() * 0.3), pos + (Math.random() - 0.5) * 0.08)
    }
    if (pressed && rushing && clock - lastStreak > streakGap) {
      const k = built()
      streakGap = (0.22 - 0.1 * k) * (0.6 + Math.random() * 0.8)
      streak(k, pos)
    }
    if (pressed && powered && clock > nextBeat) shock(pos, 0.6, 45)
    const eased = fade * fade * (3 - 2 * fade)
    surge = Math.max(surge * Math.exp(-dt * 1.5), powered && pressed ? 0.5 : 0)
    gl.uniform1f(u('u_core'), surge)
    gl.uniform1f(u('u_pos'), pos)
    gl.uniform1f(u('u_fade'), eased)
    gl.uniform1f(u('u_time'), clock)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.drawArrays(gl.TRIANGLES, 0, 6)
    running = pressed || (clock - lastBurst < 5 && fade > 0)
    if (running) frame = requestAnimationFrame(tick)
  }
  const wake = () => {
    if (running) return
    running = true
    last = -1
    frame = requestAnimationFrame(tick)
  }
  const start = () => {
    const style = getComputedStyle(el)
    const dark = style.colorScheme.includes('dark')
    const accent = srgb(style.getPropertyValue('--ui-accent'), dark ? '#7aa2ff' : '#1f5fe0')
    const ink = dark ? { ...CHARGE_DARK, u_fg: accent } : { ...CHARGE_LIGHT, u_charge1: [...accent, 1] }
    for (const [name, value] of Object.entries(ink)) {
      if (typeof value === 'number') gl.uniform1f(u(name), value)
      else if (value.length === 3) gl.uniform3fv(u(name), value)
      else gl.uniform4fv(u(name), value)
    }
    // 歇过一阵后再按下，重掷种子：新的抖动，新挑的格子。
    if (performance.now() - lastBurstAt > 5000 && fade <= 0) {
      times.fill(-1e3)
      gl.uniform1f(u('u_seed'), Math.random() * 512)
    }
    held = 0
    // 一打开就在 ultra 上时，等场亮起来再开始打拍子。
    nextBeat = clock + 1.2
    burst(strength(0), rest())
  }
  const init = () => {
    gl.useProgram(program)
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, 'a_position')
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
    gl.viewport(0, 0, el.width, el.height)
    gl.clearColor(0, 0, 0, 0)
    gl.uniform2f(u('u_resolution'), width, height)
    gl.uniform1fv(u('u_burstTime[0]'), times)
    gl.uniform4fv(u('u_shock[0]'), shocks)
    gl.uniform1f(u('u_knob'), handle.offsetWidth)
    ready = true
    if (pressed) start()
  }
  // KHR_parallel_shader_compile 在主线程外链接，打开弹层不会卡在这里。
  const link = () => {
    if (parallel && !gl.getProgramParameter(program, parallel.COMPLETION_STATUS_KHR)) frame = requestAnimationFrame(link)
    else if (gl.getProgramParameter(program, gl.LINK_STATUS)) init()
  }
  link()

  return {
    press(on: boolean) {
      if (on === pressed) return
      pressed = on
      if (ready) {
        if (on) start()
        else wake()
      }
    },
    aim(next: number, power: boolean) {
      if (next === stop && power === powered) return
      const arriving = power && !powered
      stop = next
      powered = power
      // 每次到达都像 yK 的最高档那样充能：那里一次脉冲，重新蓄力。ultra 还会发出冲击波，
      // 拖动来回越过它也至多 0.8s 一道。
      if (ready && pressed) {
        held = 0
        burst(strength(0), rest())
        if (arriving && clock - lastShock > 0.8) shock(rest(), 1, 70)
      }
    },
    rush(on: boolean) {
      if (on === rushing) return
      rushing = on
      // 打开时立刻放出一串；关掉时已经出发的条纹跑完为止。
      if (on && ready && pressed) for (let i = 0; i < 4; i++) streak(1, here(), i * 0.05)
    },
    dispose() {
      cancelAnimationFrame(frame)
      gl.deleteProgram(program)
      gl.deleteBuffer(buffer)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    },
  }
}
