import type { TemplateName } from '../../core/types';
import type { StageTemplate } from '../StageTemplate';
import { BalloonDarts } from './BalloonDarts';
import { BonusRound } from './BonusRound';
import { EggFarm } from './EggFarm';
import { GalleryDarts } from './GalleryDarts';
import { PlateCamp } from './PlateCamp';
import { PracticePie } from './PracticePie';
import { RingToss } from './RingToss';

/** テンプレート名から実体を生成するファクトリ (拡張点)。 */
export function createTemplate(name: TemplateName): StageTemplate {
  switch (name) {
    case 'eggfarm':
      return new EggFarm();
    case 'balloon':
      return new BalloonDarts();
    case 'plates':
      return new PlateCamp();
    case 'rings':
      return new RingToss();
    case 'gallery':
      return new GalleryDarts();
    case 'bonus':
      return new BonusRound();
    case 'practice':
    default:
      return new PracticePie();
  }
}
