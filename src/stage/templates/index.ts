import type { GameBus } from '../../core/EventBus';
import type { TemplateName } from '../../core/types';
import type { StageTemplate } from '../StageTemplate';
import { HamAndEggs } from './HamAndEggs';
import { HorizontalSliders } from './HorizontalSliders';
import { PopupMatrix } from './PopupMatrix';
import { SequentialChains } from './SequentialChains';

/** テンプレート名から実体を生成するファクトリ (拡張点)。 */
export function createTemplate(
  name: TemplateName,
  bus: GameBus,
): StageTemplate {
  switch (name) {
    case 'matrix':
      return new PopupMatrix(bus);
    case 'chains':
      return new SequentialChains(bus);
    case 'hameggs':
      return new HamAndEggs(bus);
    case 'sliders':
    default:
      return new HorizontalSliders();
  }
}

/** UI 表示用のテンプレート一覧。 */
export const TEMPLATE_LIST: { name: TemplateName; label: string }[] = [
  { name: 'hameggs', label: 'Ham & Eggs' },
  { name: 'sliders', label: 'Sliders' },
  { name: 'matrix', label: 'Pop-up' },
  { name: 'chains', label: 'Chains' },
];
