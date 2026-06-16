import { AssetConfig } from '../config/GameConfig';

/**
 * Assets
 * 責務: 画像アセット(背景・的シート)の読み込みと提供。
 *       読み込み前/失敗時は ready=false のままで、描画側はフォールバックする。
 */
export class Assets {
  readonly background = new Image();
  readonly targets = new Image();
  backgroundReady = false;
  targetsReady = false;

  load(): void {
    const base = import.meta.env.BASE_URL;
    this.background.onload = () => (this.backgroundReady = true);
    this.background.src = base + AssetConfig.backgroundPath;
    this.targets.onload = () => (this.targetsReady = true);
    this.targets.src = base + AssetConfig.targetsPath;
  }
}
