import type { TemplateName } from '../../core/types';
import type { StageTemplate } from '../StageTemplate';
import { CurveCourse } from './CurveCourse';
import { Gallery } from './Gallery';
import { MoleGrid } from './MoleGrid';
import { OrbitTower } from './OrbitTower';

/** テンプレート名から実体を生成するファクトリ (拡張点)。 */
export function createTemplate(name: TemplateName): StageTemplate {
  switch (name) {
    case 'orbit':
      return new OrbitTower();
    case 'curve':
      return new CurveCourse();
    case 'mole':
      return new MoleGrid();
    case 'gallery':
    default:
      return new Gallery();
  }
}
