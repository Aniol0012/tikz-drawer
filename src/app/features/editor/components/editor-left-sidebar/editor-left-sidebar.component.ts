import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-editor-left-sidebar',
  templateUrl: './editor-left-sidebar.component.html',
  styleUrl: './editor-left-sidebar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditorLeftSidebarComponent {}
