import * as THREE from 'three';
import { WorldConfig } from '../config/GameConfig';
import type { TemplateName } from '../core/types';
import type { SceneState } from '../stage/StageTemplate';
import { facadeTexture, stripesTexture } from './textures';

/**
 * scenes
 * 責務: シーンID ごとの背景・建物 (装飾) を three.js プリミティブで組み立てる。
 *       画像素材は使わず、すべて手続き生成。座標は論理系 (z奥+) を
 *       z→-z 変換して配置する。
 */

export interface BuiltScene {
  group: THREE.Group;
  /** 空の色 (scene.background に設定)。 */
  sky: THREE.Color;
  /** 霧 (奥行きの手掛かり)。 */
  fog: THREE.Fog;
  /** 毎フレームの演出更新 (扉開閉・噴火・ロケットなど)。 */
  update(state: SceneState, time: number): void;
}

const FLOOR = WorldConfig.floorY;

/** 論理座標 (z奥+) で position をセットする。 */
function place(obj: THREE.Object3D, x: number, y: number, z: number): void {
  obj.position.set(x, y, -z);
}

function lambert(color: string): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ color });
}

function box(
  w: number,
  h: number,
  d: number,
  color: string,
): THREE.Mesh {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lambert(color));
}

/** 地面 (シーン共通)。 */
function ground(color: string): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 46),
    lambert(color),
  );
  mesh.rotation.x = -Math.PI / 2;
  place(mesh, 0, FLOOR, 12);
  return mesh;
}

/** 三角プリズム (屋根・テント用)。幅w 高さh 奥行d。 */
function prism(w: number, h: number, d: number, color: string): THREE.Mesh {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0);
  shape.lineTo(w / 2, 0);
  shape.lineTo(0, h);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false });
  geo.translate(0, 0, -d / 2);
  return new THREE.Mesh(geo, lambert(color));
}

/** 旗のガーランド (縁日感)。 */
function bunting(x1: number, x2: number, y: number, z: number): THREE.Group {
  const g = new THREE.Group();
  const colors = ['#e84b3c', '#ffd60a', '#57b9e6', '#6fd06a', '#f2a531'];
  const n = 9;
  for (let i = 0; i <= n; i++) {
    const p = i / n;
    const x = x1 + (x2 - x1) * p;
    const sag = Math.sin(p * Math.PI) * 0.5;
    const flag = new THREE.Mesh(
      new THREE.ConeGeometry(0.16, 0.4, 4),
      new THREE.MeshBasicMaterial({ color: colors[i % colors.length] }),
    );
    flag.rotation.z = Math.PI; // 逆さ三角
    place(flag, x, y - sag, z);
    g.add(flag);
  }
  return g;
}

/* ------------------------------ 各シーン ------------------------------ */

function buildPractice(): BuiltScene {
  const group = new THREE.Group();
  group.add(ground('#7a9a55'));
  // ストライプの縁日ブース背景。
  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 8),
    new THREE.MeshLambertMaterial({ map: stripesTexture('#d8453a', '#f4efe0', 10) }),
  );
  place(wall, 0, FLOOR + 4, 15);
  group.add(wall);
  // カウンター。
  const counter = box(14, 1.2, 1, '#8a5a2e');
  place(counter, 0, FLOOR + 0.6, 4.5);
  group.add(counter);
  group.add(bunting(-7, 7, 3.4, 13));
  return {
    group,
    sky: new THREE.Color('#9fd7ef'),
    fog: new THREE.Fog('#9fd7ef', 18, 40),
    update: () => {},
  };
}

function buildEggFarm(): BuiltScene {
  const group = new THREE.Group();
  group.add(ground('#79a24f'));

  // 納屋: 本体 + 屋根 + 開閉する観音扉。
  const barn = new THREE.Group();
  const body = box(4.4, 3.0, 2.4, '#b5462f');
  body.position.y = 1.5;
  barn.add(body);
  const roof = prism(5.0, 1.6, 2.8, '#e8e2d2');
  roof.position.y = 3.0;
  barn.add(roof);
  // 扉の枠 (暗がり)。
  const doorway = box(2.0, 1.9, 0.1, '#17100a');
  doorway.position.set(0, 0.95, 1.2);
  barn.add(doorway);
  const doorL = box(0.95, 1.85, 0.08, '#e8e2d2');
  doorL.position.set(-0.5, 0.95, 1.3);
  const doorR = doorL.clone();
  doorR.position.x = 0.5;
  barn.add(doorL, doorR);
  place(barn, 0, FLOOR, 12.6);
  group.add(barn);

  // 風車: 塔 + 回転する羽根。
  const mill = new THREE.Group();
  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.45, 4.2, 8),
    lambert('#cfd6de'),
  );
  tower.position.y = 2.1;
  mill.add(tower);
  const blades = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const blade = box(0.3, 1.9, 0.06, '#eef3f9');
    blade.position.y = 1.0;
    const arm = new THREE.Group();
    arm.add(blade);
    arm.rotation.z = (i * Math.PI) / 2;
    blades.add(arm);
  }
  blades.position.set(0, 4.3, 0.3);
  mill.add(blades);
  place(mill, -4.4, FLOOR, 13.5);
  group.add(mill);

  // サイロ。
  const silo = new THREE.Group();
  const siloBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 0.9, 3.6, 12),
    lambert('#9aa3ad'),
  );
  siloBody.position.y = 1.8;
  silo.add(siloBody);
  const siloTop = new THREE.Mesh(
    new THREE.SphereGeometry(0.9, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    lambert('#6b7682'),
  );
  siloTop.position.y = 3.6;
  silo.add(siloTop);
  place(silo, 4.6, FLOOR, 13.5);
  group.add(silo);

  // 柵 (イタチが隠れる手前のライン)。
  const fence = new THREE.Group();
  for (let x = -5; x <= 5; x += 1.25) {
    const post = box(0.14, 1.1, 0.14, '#e8eef5');
    post.position.set(x, 0.55, 0);
    fence.add(post);
  }
  for (const y of [0.45, 0.85]) {
    const rail = box(10.5, 0.1, 0.1, '#e8eef5');
    rail.position.set(0, y, 0);
    fence.add(rail);
  }
  place(fence, 0, FLOOR, 6.9);
  group.add(fence);

  return {
    group,
    sky: new THREE.Color('#a8ddf2'),
    fog: new THREE.Fog('#a8ddf2', 18, 42),
    update: (state) => {
      // 扉: doorOpen 0..1 で左右へスライド。
      const open = state.doorOpen ?? 0;
      doorL.position.x = -0.5 - open * 0.95;
      doorR.position.x = 0.5 + open * 0.95;
      // 風車の回転。
      blades.rotation.z = state.windmill ?? 0;
    },
  };
}

function buildBalloon(): BuiltScene {
  const group = new THREE.Group();
  group.add(ground('#8a6a4a'));

  // 火山: すぼまった円錐 + 火口の発光。
  const volcano = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 4.4, 4.6, 12),
    lambert('#6e4a33'),
  );
  place(volcano, 0, FLOOR + 2.3, 12.5);
  group.add(volcano);
  const crater = new THREE.Mesh(
    new THREE.CylinderGeometry(1.5, 1.0, 0.5, 12),
    new THREE.MeshBasicMaterial({ color: '#ff5a1f' }),
  );
  place(crater, 0, FLOOR + 4.6, 12.5);
  group.add(crater);
  const glow = new THREE.PointLight('#ff5a1f', 0, 14);
  place(glow, 0, FLOOR + 5.4, 12.5);
  group.add(glow);

  // 岩。
  for (const [x, z, s] of [
    [-4.2, 9, 0.8], [4.4, 10, 1.0], [-3.0, 13.5, 1.2], [3.4, 14, 0.9],
  ] as [number, number, number][]) {
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(s),
      lambert('#7d6a58'),
    );
    place(rock, x, FLOOR + s * 0.5, z);
    group.add(rock);
  }

  return {
    group,
    sky: new THREE.Color('#f2b26b'),
    fog: new THREE.Fog('#f2b26b', 18, 42),
    update: (state, time) => {
      // 噴火中は火口が明滅し、光が強くなる。
      const e = state.eruption ?? 0;
      glow.intensity = e * (14 + Math.sin(time * 20) * 5);
      crater.scale.setScalar(1 + e * 0.3 + e * Math.sin(time * 14) * 0.08);
    },
  };
}

function buildPlates(): BuiltScene {
  const group = new THREE.Group();
  group.add(ground('#b09a6a'));

  // 棚 (皿が乗る2段) — 皿の下端に合わせて板を置く。
  for (const [y, z, w] of [
    [-0.32, 8, 10.5], [1.06, 10.5, 9],
  ] as [number, number, number][]) {
    const shelf = box(w, 0.18, 1.1, '#7a4a22');
    place(shelf, 0, y, z);
    group.add(shelf);
    for (const x of [-w / 2 + 0.4, w / 2 - 0.4]) {
      const leg = box(0.24, y - FLOOR, 0.24, '#5d3a1a');
      place(leg, x, (y + FLOOR) / 2, z);
      group.add(leg);
    }
  }

  // ベルトコンベア。
  const belt = box(12, 0.3, 1.2, '#4a4a4a');
  place(belt, 0, -1.85, 6.5);
  group.add(belt);
  const beltFrame = box(12, 0.14, 1.3, '#2e2e2e');
  place(beltFrame, 0, -2.05, 6.5);
  group.add(beltFrame);

  // テント (キャンプ感)。
  const tent = prism(3.6, 2.6, 3, '#5f7247');
  place(tent, -4.6, FLOOR, 12);
  group.add(tent);
  const tent2 = prism(3.0, 2.2, 2.6, '#6d8253');
  place(tent2, 4.8, FLOOR, 12.5);
  group.add(tent2);

  // 土のう。
  for (const [x, z] of [[-2.5, 5.2], [2.5, 5.2], [0, 4.8]] as [number, number][]) {
    const bag = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.32, 0.6, 4, 8),
      lambert('#9c8a5f'),
    );
    bag.rotation.z = Math.PI / 2;
    place(bag, x, FLOOR + 0.32, z);
    group.add(bag);
  }

  return {
    group,
    sky: new THREE.Color('#cfe3c2'),
    fog: new THREE.Fog('#cfe3c2', 18, 42),
    update: () => {},
  };
}

function buildRings(): BuiltScene {
  const group = new THREE.Group();
  group.add(ground('#3d3f5e'));

  // 星空 (Points)。
  const starGeo = new THREE.BufferGeometry();
  const starPos: number[] = [];
  for (let i = 0; i < 260; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 18 + Math.random() * 18;
    starPos.push(
      Math.cos(a) * r,
      Math.random() * 16 - 1,
      -(8 + Math.random() * 30),
    );
  }
  starGeo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(starPos, 3),
  );
  const stars = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({ color: '#ffffff', size: 0.12 }),
  );
  group.add(stars);

  // 中央ロケット (発射演出で上昇する)。
  const rocket = new THREE.Group();
  const bodyMat = lambert('#d8dde6');
  const rocketBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.75, 0.85, 3.4, 16),
    bodyMat,
  );
  rocketBody.position.y = 2.4;
  rocket.add(rocketBody);
  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(0.78, 1.4, 16),
    lambert('#e84b3c'),
  );
  nose.position.y = 4.8;
  rocket.add(nose);
  for (let i = 0; i < 3; i++) {
    const fin = prism(0.9, 1.2, 0.12, '#e84b3c');
    const arm = new THREE.Group();
    fin.position.set(0, 0.4, 0.95);
    arm.add(fin);
    arm.rotation.y = (i / 3) * Math.PI * 2;
    arm.position.y = 0.4;
    rocket.add(arm);
  }
  // 噴射炎 (発射中のみ可視)。
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.5, 1.6, 12),
    new THREE.MeshBasicMaterial({ color: '#ffb300' }),
  );
  flame.rotation.x = Math.PI;
  flame.position.y = -0.2;
  flame.visible = false;
  rocket.add(flame);
  place(rocket, 0, FLOOR, 10);
  group.add(rocket);

  // 発射台。
  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(1.8, 2.1, 0.5, 16),
    lambert('#5a6472'),
  );
  place(pad, 0, FLOOR + 0.25, 10);
  group.add(pad);

  return {
    group,
    sky: new THREE.Color('#141a33'),
    fog: new THREE.Fog('#141a33', 20, 46),
    update: (state, time) => {
      // rocketLift 0..1: 打ち上がって戻る (0.5 で頂点)。
      const lift = state.rocketLift ?? 0;
      const h = Math.sin(Math.min(1, lift) * Math.PI) * 9;
      rocket.position.y = FLOOR + h;
      flame.visible = lift > 0;
      flame.scale.y = 1 + Math.sin(time * 30) * 0.2;
    },
  };
}

/** 西部の町並み (gallery / bonus 共用)。 */
function westTown(group: THREE.Group): void {
  group.add(ground('#c2955c'));
  const facades: [number, number, number, string, string][] = [
    [-3.6, 12.5, 3.4, '#8a5a2e', '#e8c26a'],
    [0, 13, 4.0, '#a9733d', '#e84b3c'],
    [3.6, 12.5, 3.4, '#7a4a22', '#57b9e6'],
  ];
  for (const [x, z, w, base, sign] of facades) {
    const f = new THREE.Mesh(
      new THREE.BoxGeometry(w, 4.2, 0.5),
      new THREE.MeshLambertMaterial({ map: facadeTexture(base, sign) }),
    );
    place(f, x, FLOOR + 2.1, z);
    group.add(f);
  }
  // トロッコのレール (2本の帯)。
  for (const z of [8, 12, 13.5]) {
    for (const dy of [0, 0.18]) {
      const rail = box(13, 0.06, 0.1, '#4a3a2a');
      place(rail, 0, FLOOR + 0.03 + dy * 0, z + dy);
      group.add(rail);
    }
  }
  // サボテン。
  for (const [x, z] of [[-5, 9], [5.2, 10]] as [number, number][]) {
    const c = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.28, 1.4, 4, 8),
      lambert('#3a8f4f'),
    );
    place(c, x, FLOOR + 1.0, z);
    group.add(c);
  }
}

function buildGallery(): BuiltScene {
  const group = new THREE.Group();
  westTown(group);
  group.add(bunting(-5, 5, 3.6, 11));
  return {
    group,
    sky: new THREE.Color('#f2a26b'),
    fog: new THREE.Fog('#f2a26b', 18, 42),
    update: () => {},
  };
}

function buildBonus(): BuiltScene {
  const group = new THREE.Group();
  westTown(group);
  // 夜のフィナーレ: 電飾 (点滅する電球の列)。
  const bulbs: THREE.Mesh[] = [];
  const bulbColors = ['#ffd60a', '#e84b3c', '#57b9e6', '#6fd06a'];
  for (let i = 0; i <= 16; i++) {
    const p = i / 16;
    const x = -6 + 12 * p;
    const sag = Math.sin(p * Math.PI) * 0.6;
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 8),
      new THREE.MeshBasicMaterial({ color: bulbColors[i % bulbColors.length] }),
    );
    place(bulb, x, 3.4 - sag, 11.5);
    group.add(bulb);
    bulbs.push(bulb);
  }
  return {
    group,
    sky: new THREE.Color('#1b1430'),
    fog: new THREE.Fog('#1b1430', 20, 44),
    update: (_state, time) => {
      // 電球を交互に明滅させる。
      bulbs.forEach((b, i) => {
        b.visible = Math.floor(time * 4 + i) % 2 === 0;
      });
    },
  };
}

/** シーンIDから装飾を組み立てる。 */
export function buildStageScene(id: TemplateName): BuiltScene {
  switch (id) {
    case 'eggfarm':
      return buildEggFarm();
    case 'balloon':
      return buildBalloon();
    case 'plates':
      return buildPlates();
    case 'rings':
      return buildRings();
    case 'gallery':
      return buildGallery();
    case 'bonus':
      return buildBonus();
    case 'practice':
    default:
      return buildPractice();
  }
}
