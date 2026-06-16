import type { Vec3 } from '../core/types';

/**
 * SceneProp
 * 責務: 背景・建物などの「シーン装飾」を表すデータ。
 *       3Dワールド上の接地位置(base)とワールドサイズを持ち、
 *       Renderer がビルボードとして透視投影で描く。
 *       的(Target)ではないので当たり判定は持たない。
 */
export type SceneProp =
  | { kind: 'hill'; base: Vec3; width: number; height: number; color: string }
  | { kind: 'barn'; base: Vec3; width: number; height: number; doorOpen: number }
  | { kind: 'silo'; base: Vec3; width: number; height: number }
  | { kind: 'fence'; base: Vec3; width: number; height: number; foreground: boolean }
  | { kind: 'cactus'; base: Vec3; width: number; height: number }
  | { kind: 'pond'; base: Vec3; width: number; height: number }
  | { kind: 'windmill'; base: Vec3; width: number; height: number; angle: number };
