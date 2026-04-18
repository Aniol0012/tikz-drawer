import { ChangeDetectionStrategy, Component, ElementRef, input, viewChild } from '@angular/core';
import type { EditorPageComponent } from '../editor-page/editor-page.component';

@Component({
  selector: 'app-editor-right-sidebar',
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

  readonly showSidebarContent = () => !(this.overlayLayout() && this.collapsed());
}
