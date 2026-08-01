import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { DiagramArtworkKind } from '../../../../shared/diagram-artwork/diagram-artwork.component';
import { AiSparklesIconComponent } from '../../../editor/components/ai-sparkles-icon/ai-sparkles-icon.component';

@Component({
  selector: 'app-guide-step-mark',
  imports: [AiSparklesIconComponent],
  templateUrl: './guide-step-mark.component.html',
  styleUrl: './guide-step-mark.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GuideStepMarkComponent {
  readonly kind = input.required<DiagramArtworkKind>();
  readonly label = input.required<string>();
}
