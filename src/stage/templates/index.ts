import type { TemplateName } from '../../core/types';
import type { StageTemplate } from '../StageTemplate';
import { CurveCourse } from './CurveCourse';
import { Gallery } from './Gallery';
import { MoleGrid } from './MoleGrid';
import { OrbitTower } from './OrbitTower';
import { Tiers } from './Tiers';

/** テンプレート名から実体を生成するファクトリ (拡張点)。 */
export function createTemplate(name: TemplateName): StageTemplate {
  switch (name) {
    case 'gallery':
      return new Gallery();
    case 'orbit':
      return new OrbitTower();
    case 'curve':
      return new CurveCourse();
    case 'mole':
      return new MoleGrid();
    case 'tiers':
    default:
      return new Tiers();
  }
}
