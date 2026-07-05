import * as THREE from 'three';
import { CameraConfig, WorldConfig } from '../config/GameConfig';
import { TargetState } from '../core/types';
import type { StageTemplate } from '../stage/StageTemplate';
import type { Projectile } from '../weapon/Projectile';
import type { ProjectileSystem } from '../weapon/ProjectileSystem';
import type { WeaponKind } from '../weapon/WeaponSpec';
import { buildStageScene, type BuiltScene } from './scenes';
import { TargetMeshFactory, type TargetVisual } from './TargetMeshFactory';

/**
 * ThreeRenderer
 * 責務: 論理状態 (Target / Projectile / SceneState) を three.js のシーンへ
 *       毎フレーム同期して WebGL 描画する薄い層。ゲームロジックは持たない。
 *       論理座標 (z奥+) は z→-z 変換して配置する。
 */
export class ThreeRenderer {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly factory = new TargetMeshFactory();

  /** ターゲット → 描画セットの対応。 */
  private targetVisuals = new Map<object, TargetVisual>();
  /** 弾 → メッシュの対応 + 武器種別プール。 */
  private projVisuals = new Map<object, THREE.Object3D>();
  private projPools = new Map<WeaponKind, THREE.Object3D[]>();

  private built: BuiltScene | null = null;
  private accent: THREE.DirectionalLight;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(CameraConfig.width, CameraConfig.height, false);
    this.camera = new THREE.PerspectiveCamera(
      WorldConfig.fovVDeg,
      CameraConfig.width / CameraConfig.height,
      0.1,
      80,
    );
    // カメラは原点。three の既定 (-z向き) をそのまま使い、論理zを反転して配置する。
    this.camera.position.set(0, 0, 0);

    this.scene.add(new THREE.AmbientLight('#ffffff', 0.75));
    const sun = new THREE.DirectionalLight('#fff4e0', 1.6);
    sun.position.set(4, 8, 2);
    this.scene.add(sun);
    this.accent = new THREE.DirectionalLight('#ffffff', 0.5);
    this.accent.position.set(-6, 3, -4);
    this.scene.add(this.accent);
  }

  /** ステージ切替: 装飾を作り直し、的・弾のプールをリセットする。 */
  setStage(template: StageTemplate): void {
    if (this.built) {
      this.scene.remove(this.built.group);
      disposeGroup(this.built.group);
      this.built = null;
    }
    for (const vis of this.targetVisuals.values()) this.factory.release(vis);
    this.targetVisuals.clear();
    this.factory.clear();
    for (const mesh of this.projVisuals.values()) mesh.removeFromParent();
    this.projVisuals.clear();
    for (const pool of this.projPools.values()) {
      for (const m of pool) m.removeFromParent();
    }
    this.projPools.clear();

    this.built = buildStageScene(template.sceneId);
    this.scene.add(this.built.group);
    this.scene.background = this.built.sky;
    this.scene.fog = this.built.fog;
  }

  /** 毎フレーム: 論理状態をシーンへ同期して描画。 */
  render(template: StageTemplate, projectiles: ProjectileSystem, timeSec: number): void {
    this.syncTargets(template, timeSec);
    this.syncProjectiles(projectiles);
    this.built?.update(template.getSceneState?.() ?? {}, timeSec);
    this.renderer.render(this.scene, this.camera);
  }

  private syncTargets(template: StageTemplate, timeSec: number): void {
    const seen = new Set<object>();
    for (const t of template.getTargets()) {
      seen.add(t);
      let vis = this.targetVisuals.get(t);
      if (!vis) {
        vis = this.factory.acquire(t, this.scene);
        this.targetVisuals.set(t, vis);
      }
      vis.root.position.set(t.position.x, t.position.y, -t.position.z);

      // スケール: 半径 × 出現アニメ (+成長ターゲットの鼓動)。
      const sy = t.spawnScaleY();
      let s = t.radius;
      if (t.style === 'grow') s *= 1 + Math.sin(timeSec * 6) * 0.05;
      const hitBoost = t.state === TargetState.Hit ? 1.25 : 1;
      vis.root.scale.set(s * hitBoost, s * sy * hitBoost, s * hitBoost);

      this.factory.syncValue(vis, t);
    }
    // 消えた的をプールへ戻す。
    for (const [t, vis] of this.targetVisuals) {
      if (!seen.has(t)) {
        this.factory.release(vis);
        this.targetVisuals.delete(t);
      }
    }
  }

  private syncProjectiles(projectiles: ProjectileSystem): void {
    const seen = new Set<object>();
    for (const p of projectiles.getProjectiles()) {
      seen.add(p);
      let obj = this.projVisuals.get(p);
      if (!obj) {
        obj = this.acquireProjectile(p);
        this.projVisuals.set(p, obj);
      }
      obj.position.set(p.position.x, p.position.y, -p.position.z);

      const kind = p.spec.kind;
      if (kind === 'dart' || kind === 'suction') {
        // 進行方向へ向ける。
        const v = p.getVelocity();
        const dir = new THREE.Vector3(v.x, v.y, -v.z).normalize();
        obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
      } else if (kind === 'ring') {
        // 水平姿勢でくるくる回る。
        obj.rotation.set(Math.PI / 2.4, 0, p.spin);
      } else {
        obj.rotation.set(p.spin * 0.4, p.spin * 0.3, 0);
      }
    }
    for (const [p, obj] of this.projVisuals) {
      if (!seen.has(p)) {
        obj.visible = false;
        obj.removeFromParent();
        const kind = (p as Projectile).spec.kind;
        let pool = this.projPools.get(kind);
        if (!pool) {
          pool = [];
          this.projPools.set(kind, pool);
        }
        pool.push(obj);
        this.projVisuals.delete(p);
      }
    }
  }

  private acquireProjectile(p: Projectile): THREE.Object3D {
    const pool = this.projPools.get(p.spec.kind);
    let obj = pool?.pop();
    if (!obj) obj = buildProjectileMesh(p.spec.kind);
    obj.visible = true;
    // 大きさは武器半径に合わせる (単位半径1で作成)。
    obj.scale.setScalar(p.radius);
    this.scene.add(obj);
    return obj;
  }
}

/** 武器種別の弾メッシュを組み立てる (単位半径1)。 */
function buildProjectileMesh(kind: WeaponKind): THREE.Object3D {
  const g = new THREE.Group();
  switch (kind) {
    case 'pie': {
      // パイ: クリーム + 皿。
      const tin = new THREE.Mesh(
        new THREE.CylinderGeometry(1, 0.85, 0.35, 16),
        new THREE.MeshLambertMaterial({ color: '#c9c2b2' }),
      );
      g.add(tin);
      const cream = new THREE.Mesh(
        new THREE.SphereGeometry(0.85, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshLambertMaterial({ color: '#f6e3b4' }),
      );
      cream.position.y = 0.15;
      g.add(cream);
      break;
    }
    case 'egg': {
      const egg = new THREE.Mesh(
        new THREE.SphereGeometry(1, 16, 12),
        new THREE.MeshLambertMaterial({ color: '#fff6e0' }),
      );
      egg.scale.set(0.8, 1.05, 0.8);
      g.add(egg);
      break;
    }
    case 'ball': {
      const ball = new THREE.Mesh(
        new THREE.SphereGeometry(1, 16, 12),
        new THREE.MeshLambertMaterial({ color: '#f2f2f2' }),
      );
      g.add(ball);
      const seam = new THREE.Mesh(
        new THREE.TorusGeometry(1.0, 0.05, 6, 24),
        new THREE.MeshBasicMaterial({ color: '#d33a2c' }),
      );
      seam.rotation.y = 0.6;
      g.add(seam);
      break;
    }
    case 'ring': {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1, 0.22, 10, 24),
        new THREE.MeshLambertMaterial({ color: '#30d1ff' }),
      );
      g.add(ring);
      break;
    }
    case 'dart':
    case 'suction': {
      // +z (進行方向) に先端を向けて組む。
      const isSuction = kind === 'suction';
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 1.6, 8),
        new THREE.MeshLambertMaterial({
          color: isSuction ? '#3a7bd5' : '#c9c2b2',
        }),
      );
      shaft.rotation.x = Math.PI / 2;
      g.add(shaft);
      const tip = new THREE.Mesh(
        isSuction
          ? new THREE.CylinderGeometry(0.55, 0.25, 0.5, 10)
          : new THREE.ConeGeometry(0.3, 0.7, 8),
        new THREE.MeshLambertMaterial({
          color: isSuction ? '#ff9f0a' : '#8a8f98',
        }),
      );
      tip.rotation.x = isSuction ? -Math.PI / 2 : Math.PI / 2;
      tip.position.z = 0.95;
      g.add(tip);
      // 羽根。
      const finMat = new THREE.MeshBasicMaterial({
        color: isSuction ? '#ffd60a' : '#e84b3c',
        side: THREE.DoubleSide,
      });
      for (let i = 0; i < 3; i++) {
        const fin = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), finMat);
        fin.position.z = -0.75;
        fin.rotation.z = (i / 3) * Math.PI * 2;
        fin.position.x = Math.cos((i / 3) * Math.PI * 2) * 0.25;
        fin.position.y = Math.sin((i / 3) * Math.PI * 2) * 0.25;
        g.add(fin);
      }
      break;
    }
  }
  return g;
}

/** グループ配下のジオメトリ/マテリアルを破棄する (テクスチャはキャッシュ共有のため残す)。 */
function disposeGroup(group: THREE.Object3D): void {
  group.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else if (mat) mat.dispose();
  });
}
