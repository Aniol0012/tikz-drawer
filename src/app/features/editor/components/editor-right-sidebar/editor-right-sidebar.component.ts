import type { ElementRef } from '@angular/core';
import { ChangeDetectionStrategy, Component, input, viewChild } from '@angular/core';
import type { EditorPageComponent } from '../editor-page/editor-page.component';
import { iconPaths } from '../../config/editor-icons';
import { AiSparklesIconComponent } from '../ai-sparkles-icon/ai-sparkles-icon.component';
import { SceneIconComponent } from '../scene-icon/scene-icon.component';

@Component({
  selector: 'app-editor-right-sidebar',
  imports: [AiSparklesIconComponent, SceneIconComponent],
  templateUrl: './editor-right-sidebar.component.html',
  styleUrl: './editor-right-sidebar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'right-sidebar',
    '[class.is-collapsed]': 'collapsed()'
  }
})
export class EditorRightSidebarComponent {
  readonly editor = input.required<EditorPageComponent>();
  readonly collapsed = input(false);
  readonly overlayLayout = input(false);

  readonly sidebarScroll = viewChild<ElementRef<HTMLElement>>('sidebarScroll');
  readonly iconMap = iconPaths;

  readonly showSidebarContent = () => !this.collapsed();
}
