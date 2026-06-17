import type { TemplateName } from '../../core/types';
import type { StageTemplate } from '../StageTemplate';
import { PhotoFarm } from './PhotoFarm';

/** テンプレート名から実体を生成するファクトリ (拡張点)。 */
export function createTemplate(_name: TemplateName): StageTemplate {
  return new PhotoFarm();
}
