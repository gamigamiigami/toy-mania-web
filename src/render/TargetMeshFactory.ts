import * as THREE from 'three';
import { TargetType, type TargetStyle } from '../core/types';
import type { Target } from '../target/Target';
import { cutoutTexture, valueSpriteMaterial } from './textures';

/**
 * TargetMeshFactory
 * 責務: TargetStyle ごとの 3D オブジェクト生成と、フレームごとの状態同期。
 *       半径1を基準に作り、Target.radius でスケールする。
 *       破棄されたオブジェクトはスタイル別プールに戻して使い回す。
 */

/** 1ターゲット分の描画セット。 */
export interface TargetVisual {
  root: THREE.Group;
  style: TargetStyle;
  /** 得点表示スプライト (null = このスタイルでは出さない)。 */
  valueSprite: THREE.Sprite | null;
  lastValue: number;
  /** 色を付け替えられる本体マテリアル (風船など)。 */
  tintable: THREE.MeshLambertMaterial | null;
}

/** 風船の色パレット (通常/高得点/ボーナスで変える)。 */
const BALLOON_COLORS = ['#e84b3c', '#57b9e6', '#6fd06a', '#f2a531', '#b98ae0'];

function cutoutPlane(style: TargetStyle): THREE.Mesh {
  const mat = new THREE.MeshBasicMaterial({
    map: cutoutTexture(style),
    transparent: true,
    alphaTest: 0.35,
    side: THREE.DoubleSide,
  });
  const geo = new THREE.PlaneGeometry(2.3, 2.3);
  return new THREE.Mesh(geo, mat);
}

function buildBalloon(): { group: THREE.Group; tintable: THREE.MeshLambertMaterial } {
  const group = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: '#e84b3c' });
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 16), mat);
  body.scale.set(0.92, 1.05, 0.92);
  group.add(body);
  const knot = new THREE.Mesh(
    new THREE.ConeGeometry(0.2, 0.3, 8),
    mat,
  );
  knot.position.y = -1.1;
  group.add(knot);
  // 糸
  const lineMat = new THREE.LineBasicMaterial({ color: '#d8d0c0' });
  const lineGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, -1.2, 0),
    new THREE.Vector3(0.15, -2.2, 0),
  ]);
  group.add(new THREE.Line(lineGeo, lineMat));
  return { group, tintable: mat };
}

function buildPlate(): THREE.Group {
  const group = new THREE.Group();
  const face = new THREE.Mesh(
    new THREE.CircleGeometry(1, 32),
    new THREE.MeshBasicMaterial({ map: cutoutTexture('plateFace') }),
  );
  group.add(face);
  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 0.85, 0.16, 32),
    new THREE.MeshLambertMaterial({ color: '#dcd6c6' }),
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.z = -0.09;
  group.add(rim);
  return group;
}

function buildStack(): THREE.Group {
  // 皿の山: 積み上がった皿 (ボーナス)。
  const group = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: '#f4f1e8' });
  const rimMat = new THREE.MeshLambertMaterial({ color: '#4f7ec2' });
  const levels = 5;
  for (let i = 0; i < levels; i++) {
    const r = 1 - i * 0.13;
    const plate = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r * 0.85, 0.22, 24),
      i % 2 === 0 ? mat : rimMat,
    );
    plate.position.y = -0.9 + i * 0.32;
    group.add(plate);
  }
  return group;
}

function buildCart(): THREE.Group {
  // トロッコ: 台車 + 車輪 + 側面に的。
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.9, 1.0, 0.9),
    new THREE.MeshLambertMaterial({ color: '#7a4a22' }),
  );
  group.add(body);
  const wheelMat = new THREE.MeshLambertMaterial({ color: '#3a3a3a' });
  for (const x of [-0.65, 0.65]) {
    const w = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16),
      wheelMat,
    );
    w.rotation.x = Math.PI / 2;
    w.position.set(x, -0.62, 0.35);
    group.add(w);
  }
  const face = cutoutPlane('bullseye');
  face.scale.setScalar(0.55);
  face.position.set(0, 0.25, 0.47);
  group.add(face);
  return group;
}

/** スタイルから新しいオブジェクトを組み立てる。 */
function build(style: TargetStyle): {
  group: THREE.Group;
  tintable: THREE.MeshLambertMaterial | null;
} {
  switch (style) {
    case 'balloon':
    case 'lava': {
      const { group, tintable } = buildBalloon();
      return { group, tintable };
    }
    case 'plate':
      return { group: buildPlate(), tintable: null };
    case 'stack':
      return { group: buildStack(), tintable: null };
    case 'cart':
      return { group: buildCart(), tintable: null };
    default: {
      // 板の切り抜き的 (カーニバルの木板ターゲット)。
      const group = new THREE.Group();
      group.add(cutoutPlane(style));
      return { group, tintable: null };
    }
  }
}

/** 得点表示を出すか (低得点の的は数字を出さず視線誘導を高得点へ)。 */
function showsValue(t: Target): boolean {
  return t.scoreValue >= 500 || t.style === 'grow';
}

export class TargetMeshFactory {
  private pools = new Map<TargetStyle, TargetVisual[]>();

  /** プールから取得 or 新規作成し、シーンに載せられる状態にして返す。 */
  acquire(t: Target, parent: THREE.Object3D): TargetVisual {
    const pool = this.pools.get(t.style);
    let vis = pool?.pop();
    if (!vis) {
      const { group, tintable } = build(t.style);
      vis = {
        root: group,
        style: t.style,
        valueSprite: null,
        lastValue: -1,
        tintable,
      };
    }
    vis.root.visible = true;
    parent.add(vis.root);

    // 風船の色付け: 種類で色を変える (ボーナス=赤金 / 高得点=金 / 通常=ランダム)。
    if (vis.tintable) {
      if (t.style === 'lava') vis.tintable.color.set('#ff5a1f');
      else if (t.type === TargetType.Bonus) vis.tintable.color.set('#ff2d55');
      else if (t.type === TargetType.HighValue) vis.tintable.color.set('#ffd60a');
      else {
        vis.tintable.color.set(
          BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)],
        );
      }
    }

    this.syncValue(vis, t);
    return vis;
  }

  /** シーンから外してプールへ戻す。 */
  release(vis: TargetVisual): void {
    vis.root.visible = false;
    vis.root.parent?.remove(vis.root);
    let pool = this.pools.get(vis.style);
    if (!pool) {
      pool = [];
      this.pools.set(vis.style, pool);
    }
    pool.push(vis);
  }

  /** 得点スプライトを現在の値に合わせる (成長ターゲットは値が変わる)。 */
  syncValue(vis: TargetVisual, t: Target): void {
    if (!showsValue(t)) {
      if (vis.valueSprite) vis.valueSprite.visible = false;
      vis.lastValue = -1;
      return;
    }
    if (vis.lastValue === t.scoreValue && vis.valueSprite) {
      vis.valueSprite.visible = true;
      return;
    }
    if (!vis.valueSprite) {
      vis.valueSprite = new THREE.Sprite(valueSpriteMaterial(t.scoreValue));
      vis.valueSprite.position.set(0, -1.45, 0.2);
      vis.valueSprite.scale.set(1.6, 0.8, 1);
      vis.root.add(vis.valueSprite);
    } else {
      vis.valueSprite.material = valueSpriteMaterial(t.scoreValue);
      vis.valueSprite.visible = true;
    }
    vis.lastValue = t.scoreValue;
  }

  /** 全プールを破棄 (ステージ切替時)。 */
  clear(): void {
    for (const pool of this.pools.values()) {
      for (const vis of pool) vis.root.removeFromParent();
    }
    this.pools.clear();
  }
}
