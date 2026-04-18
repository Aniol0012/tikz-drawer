import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-editor-left-sidebar',
  templateUrl: './editor-left-sidebar.component.html',
  styleUrl: './editor-left-sidebar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'left-sidebar',
    '[class.is-overlay-layout]': 'overlayLayout()',
    '[class.is-overlay-panel-open]': 'overlayLayout() && overlayPanelOpen()',
    '[class.is-collapsed]': 'collapsed()'
  }
})
export class EditorLeftSidebarComponent {
  readonly overlayLayout = input(false);
  readonly overlayPanelOpen = input(false);
  readonly collapsed = input(false);
}
