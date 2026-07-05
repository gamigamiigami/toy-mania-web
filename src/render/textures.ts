import * as THREE from 'three';
import type { TargetStyle } from '../core/types';

/**
 * textures
 * 責務: Canvas 2D で描くオリジナルの的アート/看板をテクスチャ化する。
 *       画像素材を使わず、すべて手続き描画 (円・矩形・多角形) で生成する。
 */

const texCache = new Map<string, THREE.CanvasTexture>();

function makeCanvas(size = 256): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D context を取得できません');
  return [c, ctx];
}

function toTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function circle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  fill: string,
  stroke?: string,
  lw = 8,
): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

function ellipse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  fill: string,
  rot = 0,
): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

function poly(
  ctx: CanvasRenderingContext2D,
  pts: [number, number][],
  fill: string,
): void {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

/** 目 (黒目 + ハイライト)。 */
function eye(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  circle(ctx, x, y, r, '#20160e');
  circle(ctx, x + r * 0.3, y - r * 0.3, r * 0.32, '#ffffff');
}

const OUTLINE = '#31221468';

/** 同心円の的 (色は外→内)。 */
function drawRings(ctx: CanvasRenderingContext2D, colors: string[]): void {
  const n = colors.length;
  for (let i = 0; i < n; i++) {
    circle(ctx, 128, 128, 118 * (1 - i / n) + 8, colors[i]);
  }
  circle(ctx, 128, 128, 118, 'transparent', OUTLINE, 10);
}

/* ------------------------------ 各スタイル ------------------------------ */

function drawBullseye(ctx: CanvasRenderingContext2D): void {
  drawRings(ctx, ['#e84b3c', '#f6f1e3', '#e84b3c', '#f6f1e3', '#e84b3c']);
}

function drawWood(ctx: CanvasRenderingContext2D): void {
  drawRings(ctx, ['#8a5a2e', '#d8b478', '#8a5a2e', '#d8b478']);
  // 木目の筋。
  ctx.strokeStyle = 'rgba(70,40,15,0.25)';
  ctx.lineWidth = 4;
  for (const y of [70, 128, 186]) {
    ctx.beginPath();
    ctx.moveTo(40, y);
    ctx.quadraticCurveTo(128, y + 12, 216, y);
    ctx.stroke();
  }
}

function drawGrow(ctx: CanvasRenderingContext2D): void {
  drawRings(ctx, ['#ffb300', '#fff3c4', '#ff8f00', '#fff3c4', '#e84b3c']);
}

function drawPig(ctx: CanvasRenderingContext2D): void {
  const body = '#f2a3b3';
  ellipse(ctx, 128, 150, 96, 74, body); // 胴
  // 脚
  ctx.fillStyle = '#d9879a';
  ctx.fillRect(70, 200, 26, 40);
  ctx.fillRect(160, 200, 26, 40);
  circle(ctx, 128, 96, 58, body); // 顔
  // 耳
  poly(ctx, [[80, 66], [104, 42], [110, 78]], '#d9879a');
  poly(ctx, [[176, 66], [152, 42], [146, 78]], '#d9879a');
  ellipse(ctx, 128, 112, 26, 20, '#e2798f'); // 鼻
  circle(ctx, 118, 112, 5, '#8c3a50');
  circle(ctx, 138, 112, 5, '#8c3a50');
  eye(ctx, 100, 88, 9);
  eye(ctx, 156, 88, 9);
}

function drawSheep(ctx: CanvasRenderingContext2D): void {
  // もこもこ胴体 (円の集合)。
  ctx.fillStyle = '#f4efe6';
  for (const [x, y] of [
    [70, 140], [128, 120], [186, 140], [92, 186], [164, 186], [128, 196],
  ] as [number, number][]) {
    circle(ctx, x, y, 52, '#f4efe6');
  }
  ctx.fillStyle = '#9c8f80';
  ctx.fillRect(84, 214, 20, 34);
  ctx.fillRect(152, 214, 20, 34);
  ellipse(ctx, 128, 92, 40, 34, '#8d7f6f'); // 顔
  ellipse(ctx, 88, 92, 20, 12, '#7a6d5e', -0.5);
  ellipse(ctx, 168, 92, 20, 12, '#7a6d5e', 0.5);
  eye(ctx, 114, 88, 8);
  eye(ctx, 142, 88, 8);
}

function drawWeasel(ctx: CanvasRenderingContext2D): void {
  const body = '#a9733d';
  ellipse(ctx, 128, 170, 58, 74, body); // 胴 (縦長)
  circle(ctx, 128, 84, 50, body); // 頭
  poly(ctx, [[92, 52], [112, 22], [120, 60]], '#8a5a2e'); // 耳
  poly(ctx, [[164, 52], [144, 22], [136, 60]], '#8a5a2e');
  ellipse(ctx, 128, 150, 30, 48, '#e8d3ae'); // 腹
  ellipse(ctx, 128, 102, 18, 12, '#e8d3ae'); // 口元
  circle(ctx, 128, 96, 6, '#3a2415'); // 鼻
  eye(ctx, 108, 80, 8);
  eye(ctx, 148, 80, 8);
}

function drawBird(ctx: CanvasRenderingContext2D): void {
  const body = '#57b9e6';
  ellipse(ctx, 120, 128, 84, 56, body); // 胴
  circle(ctx, 196, 104, 34, body); // 頭
  poly(ctx, [[224, 100], [252, 110], [224, 122]], '#f2a531'); // くちばし
  poly(ctx, [[60, 118], [16, 84], [40, 140]], body); // 尾
  ellipse(ctx, 112, 116, 44, 24, '#3f97c4', -0.4); // 翼
  eye(ctx, 198, 98, 8);
  ellipse(ctx, 132, 156, 40, 18, '#bde3f5'); // 腹
}

function drawFox(ctx: CanvasRenderingContext2D): void {
  const body = '#e2823b';
  poly(ctx, [[128, 44], [196, 120], [172, 196], [84, 196], [60, 120]], body); // 顔
  poly(ctx, [[70, 96], [56, 24], [116, 62]], body); // 耳
  poly(ctx, [[186, 96], [200, 24], [140, 62]], body);
  poly(ctx, [[78, 88], [70, 46], [104, 70]], '#5d3a1a');
  poly(ctx, [[178, 88], [186, 46], [152, 70]], '#5d3a1a');
  poly(ctx, [[128, 210], [104, 168], [152, 168]], '#f7f0e3'); // 口元
  circle(ctx, 128, 176, 9, '#3a2415'); // 鼻
  eye(ctx, 100, 128, 9);
  eye(ctx, 156, 128, 9);
  // しっぽ
  ellipse(ctx, 208, 196, 34, 18, body, -0.7);
  ellipse(ctx, 226, 214, 14, 10, '#f7f0e3', -0.7);
}

function drawChicken(ctx: CanvasRenderingContext2D): void {
  const body = '#f8f4ea';
  ellipse(ctx, 120, 150, 82, 66, body); // 胴
  circle(ctx, 178, 84, 40, body); // 頭
  // トサカ
  for (const [x, y] of [[158, 44], [178, 36], [198, 44]] as [number, number][]) {
    circle(ctx, x, y, 14, '#e84b3c');
  }
  poly(ctx, [[212, 82], [244, 92], [212, 104]], '#f2a531'); // くちばし
  circle(ctx, 214, 106, 9, '#e84b3c'); // 肉ひげ
  eye(ctx, 184, 78, 8);
  ellipse(ctx, 104, 142, 44, 28, '#e3d9c4', -0.3); // 翼
  ctx.fillStyle = '#f2a531';
  ctx.fillRect(96, 208, 12, 34);
  ctx.fillRect(136, 208, 12, 34);
}

function drawAlien(ctx: CanvasRenderingContext2D): void {
  const body = '#6fd06a';
  // アンテナ
  ctx.strokeStyle = body;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(128, 64);
  ctx.lineTo(128, 26);
  ctx.stroke();
  circle(ctx, 128, 22, 12, '#bff29a');
  ellipse(ctx, 128, 150, 86, 92, body); // 胴体
  // 3つ目 (オリジナルの宇宙人風)
  eye(ctx, 92, 122, 13);
  eye(ctx, 128, 112, 15);
  eye(ctx, 164, 122, 13);
  // 口
  ctx.strokeStyle = '#2f7a2c';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(128, 170, 30, 0.2, Math.PI - 0.2);
  ctx.stroke();
  ellipse(ctx, 128, 226, 52, 16, '#57b055'); // 足元
}

function drawCore(ctx: CanvasRenderingContext2D): void {
  // ロボットの胸コア: 発光する六角形。
  circle(ctx, 128, 128, 116, '#4a5866');
  circle(ctx, 128, 128, 100, '#39434e');
  const pts: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    pts.push([128 + Math.cos(a) * 74, 128 + Math.sin(a) * 74]);
  }
  poly(ctx, pts, '#59f0ff');
  const pts2 = pts.map(
    ([x, y]) => [128 + (x - 128) * 0.55, 128 + (y - 128) * 0.55] as [number, number],
  );
  poly(ctx, pts2, '#d8fbff');
}

function drawStar(ctx: CanvasRenderingContext2D): void {
  const pts: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? 118 : 52;
    pts.push([128 + Math.cos(a) * r, 128 + Math.sin(a) * r]);
  }
  poly(ctx, pts, '#ffd60a');
  const pts2 = pts.map(
    ([x, y]) => [128 + (x - 128) * 0.55, 128 + (y - 128) * 0.55] as [number, number],
  );
  poly(ctx, pts2, '#fff3c4');
}

function drawBat(ctx: CanvasRenderingContext2D): void {
  const body = '#5d4a8a';
  // 翼 (ギザギザ)
  poly(
    ctx,
    [
      [128, 120], [52, 76], [20, 128], [58, 128], [44, 172], [92, 152],
    ],
    body,
  );
  poly(
    ctx,
    [
      [128, 120], [204, 76], [236, 128], [198, 128], [212, 172], [164, 152],
    ],
    body,
  );
  ellipse(ctx, 128, 136, 34, 44, '#463670'); // 胴
  circle(ctx, 128, 96, 30, '#463670'); // 頭
  poly(ctx, [[106, 78], [96, 46], [122, 66]], '#463670'); // 耳
  poly(ctx, [[150, 78], [160, 46], [134, 66]], '#463670');
  eye(ctx, 116, 94, 7);
  eye(ctx, 140, 94, 7);
}

function drawPlateFace(ctx: CanvasRenderingContext2D): void {
  circle(ctx, 128, 128, 118, '#f4f1e8');
  circle(ctx, 128, 128, 118, 'transparent', '#cfc9b8', 6);
  circle(ctx, 128, 128, 96, 'transparent', '#4f7ec2', 10);
  circle(ctx, 128, 128, 58, 'transparent', '#4f7ec2', 6);
  circle(ctx, 128, 128, 20, '#4f7ec2');
}

const drawers: Record<string, (ctx: CanvasRenderingContext2D) => void> = {
  bullseye: drawBullseye,
  wood: drawWood,
  grow: drawGrow,
  pig: drawPig,
  sheep: drawSheep,
  weasel: drawWeasel,
  bird: drawBird,
  fox: drawFox,
  chicken: drawChicken,
  alien: drawAlien,
  core: drawCore,
  star: drawStar,
  bat: drawBat,
  plateFace: drawPlateFace,
};

/** 的スタイル(板系)の切り抜きテクスチャ。 */
export function cutoutTexture(style: TargetStyle | 'plateFace'): THREE.CanvasTexture {
  const key = `cutout:${style}`;
  const cached = texCache.get(key);
  if (cached) return cached;
  const [canvas, ctx] = makeCanvas(256);
  (drawers[style] ?? drawBullseye)(ctx);
  const tex = toTexture(canvas);
  texCache.set(key, tex);
  return tex;
}

/** ストライプ看板 (縁日ブースの背景)。 */
export function stripesTexture(a: string, b: string, stripes = 8): THREE.CanvasTexture {
  const key = `stripes:${a}:${b}:${stripes}`;
  const cached = texCache.get(key);
  if (cached) return cached;
  const [canvas, ctx] = makeCanvas(256);
  const w = 256 / stripes;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? a : b;
    ctx.fillRect(i * w, 0, w, 256);
  }
  const tex = toTexture(canvas);
  texCache.set(key, tex);
  return tex;
}

/** 西部の建物ファサード (窓・ドア付き)。 */
export function facadeTexture(base: string, sign: string): THREE.CanvasTexture {
  const key = `facade:${base}:${sign}`;
  const cached = texCache.get(key);
  if (cached) return cached;
  const [canvas, ctx] = makeCanvas(256);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);
  // 板の継ぎ目
  ctx.strokeStyle = 'rgba(40,22,8,0.35)';
  ctx.lineWidth = 3;
  for (let y = 24; y < 256; y += 28) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }
  // 看板
  ctx.fillStyle = sign;
  ctx.fillRect(28, 16, 200, 44);
  ctx.strokeStyle = '#3a2415';
  ctx.lineWidth = 4;
  ctx.strokeRect(28, 16, 200, 44);
  // 窓
  ctx.fillStyle = '#241a10';
  ctx.fillRect(40, 92, 56, 72);
  ctx.fillRect(160, 92, 56, 72);
  ctx.strokeRect(40, 92, 56, 72);
  ctx.strokeRect(160, 92, 56, 72);
  // ドア
  ctx.fillRect(104, 150, 48, 106);
  ctx.strokeRect(104, 150, 48, 106);
  const tex = toTexture(canvas);
  texCache.set(key, tex);
  return tex;
}

/* ------------------------- 得点スプライト ------------------------- */

const valueMatCache = new Map<string, THREE.SpriteMaterial>();

/**
 * 得点数字のスプライトマテリアル (本家のように的へ点数を表示する)。
 * 値ごとにキャッシュして使い回す。
 */
export function valueSpriteMaterial(value: number): THREE.SpriteMaterial {
  const big = value >= 1000;
  const key = `v:${value}`;
  const cached = valueMatCache.get(key);
  if (cached) return cached;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D context を取得できません');
  ctx.font = 'bold 88px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 14;
  ctx.strokeStyle = 'rgba(20,10,0,0.9)';
  ctx.fillStyle = big ? '#ffd60a' : '#ffffff';
  ctx.strokeText(String(value), 128, 64);
  ctx.fillText(String(value), 128, 64);
  const tex = toTexture(c);
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: false,
  });
  valueMatCache.set(key, mat);
  return mat;
}
