import { ChangeDetectionStrategy, Component, computed, EventEmitter, inject, Input, Output, signal, viewChildren } from '@angular/core';
import type { ElementRef } from '@angular/core';
import {
  CODE_HIGHLIGHT_THEME_OPTIONS,
  DEFAULT_LATEX_EXPORT_CONFIG,
  LATEX_ALIGNMENT_OPTIONS,
  LATEX_COLOR_MODE_OPTIONS,
  LATEX_FIGURE_PLACEMENT_OPTIONS,
  LATEX_FONT_SIZE_OPTIONS,
  LATEX_FONT_SIZES,
  type LatexAlignment,
  type LatexExportBooleanKey,
  type LatexExportConfig,
  type LatexExportNumberKey,
  type LatexExportTextKey,
  type LatexFontSize
} from '../../config/latex-export.config';
import { ARROW_TIP_OPTIONS } from '../../config/arrow-tip.config';
import { LINE_STROKE_STYLE_OPTIONS } from '../../config/line-stroke-style.config';
import { DEFAULT_EDITOR_SCALE, EDITOR_SCALE_MAX, EDITOR_SCALE_MIN } from '../../constants/editor.constants';
import { defaultPreferences } from '../../presets/presets';
import { EditorLanguageService } from '../../i18n/editor-language.service';
import { detectLanguage, getLanguageOptions, isLanguageCode } from '../../i18n/editor-page.i18n';
import { EditorTranslatePipe } from '../../i18n/editor-translate.pipe';
import { EditorStore } from '../../state/editor.store';
import { DEFAULT_EDITOR_GENERAL_CONFIG, EditorConfigurationService, type EditorGeneralConfig } from '../../state/editor-configuration.service';
import { CodeHighlightThemeService } from '../../state/code-highlight-theme.service';
import { AppThemeService } from '../../state/app-theme.service';
import { iconPaths } from '../../config/editor-icons';
import type { ArrowTipKind, EditorPreferences, LineStrokeStyle } from '../../models/tikz.models';
import type { PreferenceBooleanKey, PreferenceNumberKey, PreferenceTextKey } from '../editor-page/editor-page.types';
import { AppSelectComponent, type AppSelectOption } from '../../../../shared/app-select/app-select.component';
import { ToggleFieldComponent } from '../../../../shared/toggle-field/toggle-field.component';
import { RangeInputCardComponent } from '../range-input-card/range-input-card.component';
import { KeyboardShortcutCaptureComponent, type KeyboardShortcutAssignment } from '../keyboard-shortcut-capture/keyboard-shortcut-capture.component';
import { DEFAULT_KEYBOARD_SHORTCUTS, keyboardShortcutLabel, type KeyboardShortcutAction, type KeyboardShortcutConfig } from '../../utils/editor-keyboard.utils';
import { AiSettingsService, REMOTE_AI_MODEL_OPTIONS, WEB_LLM_MODEL_OPTIONS } from '../../ai/ai-settings.service';
import type { AiProviderType } from '../../ai/ai-provider-result.model';
import { EditorDevModeService } from '../../state/editor-dev-mode.service';
import { WebLlmLocalAiProvider } from '../../ai/web-llm-local-ai.provider';
import { BrowserLocalAiProvider } from '../../ai/browser-local-ai.provider';
import { AiSparklesIconComponent } from '../ai-sparkles-icon/ai-sparkles-icon.component';
import { BadgeComponent } from '../../../../shared/badge/badge.component';
import { REGEX } from '../../../../shared/regex/regex.utils';

export type ApplicationConfigurationTab = 'general' | 'scene' | 'latex' | 'ai';

type LabelKeyOption = {
  readonly value: string;
  readonly labelKey: string;
};

type ConfigurationTabDescriptor = {
  readonly id: ApplicationConfigurationTab;
  readonly labelKey: string;
  readonly iconPath?: string;
  readonly aiIcon?: boolean;
};

type ShortcutRow = {
  readonly action: KeyboardShortcutAction;
  readonly labelKey: string;
};

const PREVIEW_VIEWBOX_WIDTH = 300;
const PREVIEW_VIEWBOX_HEIGHT = 220;

@Component({
  selector: 'app-configuration-dialog',
  standalone: true,
  imports: [
    AppSelectComponent,
    ToggleFieldComponent,
    RangeInputCardComponent,
    KeyboardShortcutCaptureComponent,
    EditorTranslatePipe,
    AiSparklesIconComponent,
    BadgeComponent
  ],
  templateUrl: './app-configuration-dialog.component.html',
  styleUrl: './app-configuration-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-theme]': 'preferences().theme'
  }
})
export class AppConfigurationDialogComponent {
  private readonly store = inject(EditorStore);
  private readonly configuration = inject(EditorConfigurationService);
  private readonly languageService = inject(EditorLanguageService);
  private readonly codeHighlightThemeService = inject(CodeHighlightThemeService);
  private readonly appThemeService = inject(AppThemeService);
  private readonly aiSettingsService = inject(AiSettingsService);
  private readonly devModeService = inject(EditorDevModeService);
  private readonly webLlmProvider = inject(WebLlmLocalAiProvider);
  private readonly browserLocalProvider = inject(BrowserLocalAiProvider);

  private readonly tabButtons = viewChildren<ElementRef<HTMLButtonElement>>('configurationTab');

  @Input({ required: true }) set open(value: boolean) {
    this.isOpen.set(value);
    if (value) {
      const tab = this.availableInitialTab(this.initialTabValue);
      this.activeTab.set(tab);
      this.prepareAlignmentSwitch(tab);
    } else {
      this.alignmentSwitchReady.set(false);
    }
  }

  @Input() set initialTab(value: ApplicationConfigurationTab) {
    this.initialTabValue = value;
    if (this.isOpen()) {
      const tab = this.availableInitialTab(value);
      this.activeTab.set(tab);
      this.prepareAlignmentSwitch(tab);
    }
  }

  @Input({ required: true }) suggestedCaption = '';
  @Input({ required: true }) suggestedLabel = '';

  @Output() readonly closeDialog = new EventEmitter<void>();

  readonly isOpen = signal(false);
  readonly activeTab = signal<ApplicationConfigurationTab>('general');
  readonly preferences = this.store.preferences;
  readonly latexExportConfig = this.configuration.latexExportConfig;
  readonly generalConfig = this.configuration.generalConfig;
  readonly codeTheme = this.configuration.codeHighlightTheme;
  readonly aiSettings = this.aiSettingsService.settings;
  readonly localAiStatus = this.webLlmProvider.status;
  readonly showDevAiConfiguration = this.devModeService.enabled;
  readonly language = this.languageService.language;
  readonly resetConfirmationOpen = signal(false);
  readonly shortcutsDialogOpen = signal(false);
  readonly shortcutResetConfirmationOpen = signal(false);
  readonly editableShortcuts = signal<KeyboardShortcutConfig>(DEFAULT_KEYBOARD_SHORTCUTS);
  readonly alignmentSwitchReady = signal(false);

  readonly tabs: readonly ConfigurationTabDescriptor[] = [
    { id: 'general', labelKey: 'settingsTabGeneral', iconPath: iconPaths.settings },
    { id: 'scene', labelKey: 'settingsTabScene', iconPath: iconPaths.scene },
    { id: 'latex', labelKey: 'settingsTabLatex', iconPath: iconPaths.latex },
    { id: 'ai', labelKey: 'ai.settingsTitle', aiIcon: true }
  ];
  readonly visibleTabs = computed<readonly ConfigurationTabDescriptor[]>(() => this.tabs.filter((tab) => tab.id !== 'ai' || this.showDevAiConfiguration()));
  readonly placementOptions = LATEX_FIGURE_PLACEMENT_OPTIONS;
  readonly alignmentOptions = LATEX_ALIGNMENT_OPTIONS;
  readonly fontSizeOptions = LATEX_FONT_SIZE_OPTIONS;
  readonly colorModeOptions = LATEX_COLOR_MODE_OPTIONS;
  readonly codeThemeOptions = CODE_HIGHLIGHT_THEME_OPTIONS;
  readonly lineStrokeStyleOptions = LINE_STROKE_STYLE_OPTIONS;
  readonly arrowTipOptions = ARROW_TIP_OPTIONS;
  readonly minZoomPercent = Math.round((EDITOR_SCALE_MIN / DEFAULT_EDITOR_SCALE) * 100);
  readonly maxZoomPercent = Math.round((EDITOR_SCALE_MAX / DEFAULT_EDITOR_SCALE) * 100);
  readonly shortcutSettingsIconPath = iconPaths.keyboard;
  readonly devModeIconPath = iconPaths.code;
  readonly aiProviderTypeOptions = computed<readonly AppSelectOption[]>(() => {
    const localUnavailable = this.localProviderUnavailable();
    const webLlmUnavailable = this.webLlmUnavailable();
    const localTone = this.localAiStatusTone();
    const webLlmTone = this.webLlmStatusTone(this.aiSettings().webLlmModel);
    return [
      {
        value: 'local',
        label: this.t('ai.providerLocal'),
        longLabel: this.t('ai.providerLocal'),
        statusTone: localTone,
        statusLabel: localUnavailable ? this.t('ai.unavailable') : this.statusLabel(localTone),
        danger: localUnavailable
      },
      {
        value: 'webllm',
        label: this.t('ai.providerWebLlm'),
        longLabel: this.t('ai.providerWebLlm'),
        statusTone: webLlmTone,
        statusLabel: webLlmUnavailable ? this.t('ai.unavailable') : this.statusLabel(webLlmTone),
        danger: webLlmUnavailable
      },
      {
        value: 'remote',
        label: this.t('ai.providerRemote'),
        longLabel: this.t('ai.providerRemote'),
        statusTone: 'available',
        statusLabel: this.statusLabel('available')
      }
    ];
  });
  readonly webLlmModelOptions = computed<readonly AppSelectOption[]>(() =>
    WEB_LLM_MODEL_OPTIONS.map((model) => {
      const danger = this.webLlmModelUnavailable(model);
      const statusTone = this.webLlmStatusTone(model);
      return {
        value: model,
        label: model,
        longLabel: model,
        statusTone,
        statusLabel: danger ? this.t('ai.unavailable') : this.statusLabel(statusTone),
        danger
      };
    })
  );
  readonly remoteModelOptions = computed<readonly AppSelectOption[]>(() =>
    REMOTE_AI_MODEL_OPTIONS.map((model) => ({
      value: model,
      label: model,
      longLabel: model,
      statusTone: 'available',
      statusLabel: this.statusLabel('available')
    }))
  );
  readonly shortcutRows: readonly ShortcutRow[] = [
    { action: 'figureSearch', labelKey: 'shortcutAction.figureSearch' },
    { action: 'openImport', labelKey: 'shortcutAction.openImport' },
    { action: 'openSettings', labelKey: 'shortcutAction.openSettings' },
    { action: 'selectTool', labelKey: 'shortcutAction.selectTool' },
    { action: 'pencilTool', labelKey: 'shortcutAction.pencilTool' },
    { action: 'segmentTool', labelKey: 'shortcutAction.segmentTool' },
    { action: 'arrowTool', labelKey: 'shortcutAction.arrowTool' },
    { action: 'boxTool', labelKey: 'shortcutAction.boxTool' },
    { action: 'circleTool', labelKey: 'shortcutAction.circleTool' },
    { action: 'labelTool', labelKey: 'shortcutAction.labelTool' },
    { action: 'undo', labelKey: 'undo' },
    { action: 'redo', labelKey: 'redo' },
    { action: 'copy', labelKey: 'copy' },
    { action: 'cut', labelKey: 'cut' },
    { action: 'paste', labelKey: 'paste' },
    { action: 'delete', labelKey: 'delete' },
    { action: 'zoomIn', labelKey: 'zoomIn' },
    { action: 'zoomOut', labelKey: 'zoomOut' }
  ];
  readonly highlightedCodeThemePreview = this.codeHighlightThemeService.highlightedPreviewSource;
  readonly codeThemeStyle = computed(() => this.codeHighlightThemeService.cssVariableStyle(this.codeTheme()));
  readonly languageOptions = computed(() => getLanguageOptions(this.language()));
  readonly languageSelectOptions = computed<readonly AppSelectOption[]>(() =>
    this.languageOptions().map((option) => ({
      value: option.value,
      label: option.longLabel,
      longLabel: option.longLabel,
      flagSrc: option.flagSrc
    }))
  );
  readonly zoomPercent = computed(() => Math.round((this.preferences().scale / DEFAULT_EDITOR_SCALE) * 100));
  readonly showWhiteCanvasInDarkModeOption = computed(() => this.preferences().theme === 'dark');
  readonly settingsAreDefault = computed(
    () =>
      this.preferencesEqual(this.preferences(), defaultPreferences) &&
      this.latexExportConfigEqual(this.latexExportConfig(), DEFAULT_LATEX_EXPORT_CONFIG) &&
      this.generalConfigEqual(this.generalConfig()) &&
      (!this.showDevAiConfiguration() || this.aiSettingsService.isDefault()) &&
      this.codeTheme() === 'aurora' &&
      this.language() === detectLanguage()
  );
  readonly themeOptions = computed<readonly AppSelectOption[]>(() => this.appThemeService.options((key) => this.t(key)));
  readonly codeThemeSelectOptions = computed<readonly AppSelectOption[]>(() => this.translatedSelectOptions(this.codeThemeOptions));
  readonly lineStrokeStyleSelectOptions = computed<readonly AppSelectOption[]>(() =>
    this.lineStrokeStyleOptions.map((style) => ({
      value: style.id,
      label: this.t(style.labelKey),
      iconPath: style.iconPath
    }))
  );
  readonly arrowTipSelectOptions = computed<readonly AppSelectOption[]>(() =>
    this.arrowTipOptions.map((arrowType) => ({
      value: arrowType.id,
      label: this.t(arrowType.labelKey),
      iconPath: arrowType.iconPath,
      iconFilled: arrowType.filled
    }))
  );
  readonly shortcutsAreDefault = computed(() => this.shortcutConfigEqual(this.editableShortcuts(), DEFAULT_KEYBOARD_SHORTCUTS));
  readonly shortcutAssignments = computed<readonly KeyboardShortcutAssignment[]>(() =>
    this.shortcutRows.map((row) => ({
      id: row.action,
      label: this.t(row.labelKey),
      shortcut: this.editableShortcuts()[row.action]
    }))
  );
  private initialTabValue: ApplicationConfigurationTab = 'general';

  t(key: string): string {
    return this.languageService.t(key);
  }

  selectTab(tab: ApplicationConfigurationTab, focus = false): void {
    this.activeTab.set(tab);
    this.prepareAlignmentSwitch(tab);
    this.resetConfirmationOpen.set(false);
    this.shortcutsDialogOpen.set(false);
    this.shortcutResetConfirmationOpen.set(false);
    if (focus) {
      queueMicrotask(() => this.focusActiveTab());
    }
  }

  onTabKeydown(event: KeyboardEvent, tab: ApplicationConfigurationTab): void {
    const tabs = this.visibleTabs();
    const currentIndex = tabs.findIndex((entry) => entry.id === tab);
    if (currentIndex < 0) {
      return;
    }

    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        this.selectTab(tabs[(currentIndex - 1 + tabs.length) % tabs.length].id, true);
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        this.selectTab(tabs[(currentIndex + 1) % tabs.length].id, true);
        break;
      case 'Home':
        event.preventDefault();
        this.selectTab(tabs[0].id, true);
        break;
      case 'End':
        event.preventDefault();
        this.selectTab(tabs[tabs.length - 1].id, true);
        break;
    }
  }

  activeTabIndex(): number {
    return Math.max(
      0,
      this.visibleTabs().findIndex((tab) => tab.id === this.activeTab())
    );
  }

  private availableInitialTab(tab: ApplicationConfigurationTab): ApplicationConfigurationTab {
    return this.visibleTabs().some((entry) => entry.id === tab) ? tab : 'general';
  }

  onDialogKeydown(event: KeyboardEvent): void {
    event.stopPropagation();
    if (event.key === 'Escape') {
      event.preventDefault();
      if (this.shortcutsDialogOpen()) {
        if (this.shortcutResetConfirmationOpen()) {
          this.shortcutResetConfirmationOpen.set(false);
        } else {
          this.shortcutsDialogOpen.set(false);
        }
        return;
      }
      if (this.resetConfirmationOpen()) {
        this.resetConfirmationOpen.set(false);
        return;
      }
      this.closeDialog.emit();
    }
  }

  setTheme(value: string): void {
    const theme = this.appThemeService.normalize(value, this.preferences().theme);
    if (theme !== this.preferences().theme) {
      this.patchPreferences({ theme });
    }
  }

  setLanguage(value: string): void {
    if (isLanguageCode(value)) {
      this.languageService.setLanguage(value);
    }
  }

  updateGeneralBoolean(key: 'showHelpTooltips' | 'whiteCanvasInDarkMode', checked: boolean): void {
    this.configuration.patchGeneralConfig({ [key]: checked });
  }

  updateAiTemperature(event: Event): void {
    const temperature = Number((event.target as HTMLInputElement).value);
    this.aiSettingsService.patchSettings({ temperature });
  }

  updateAiMaxTokens(event: Event): void {
    const maxTokens = Number((event.target as HTMLInputElement).value);
    this.aiSettingsService.patchSettings({ maxTokens });
  }

  updateAiWebLlmTimeout(event: Event): void {
    this.aiSettingsService.patchSettings({ webLlmTimeoutMs: Number((event.target as HTMLInputElement).value) * 1000 });
  }

  updateAiAutomaticWebLlmTimeout(event: Event): void {
    this.aiSettingsService.patchSettings({ automaticWebLlmTimeoutMs: Number((event.target as HTMLInputElement).value) * 1000 });
  }

  updateAiAllowRemoteFallback(checked: boolean): void {
    this.aiSettingsService.patchSettings({ allowRemoteFallback: checked });
  }

  updateAiDebugLogs(checked: boolean): void {
    this.aiSettingsService.patchSettings({ debugLogs: checked });
  }

  setAiProviderType(value: string): void {
    if (value === 'local' || value === 'webllm' || value === 'remote') {
      this.aiSettingsService.patchSettings({ providerType: value satisfies AiProviderType });
    }
  }

  setAiWebLlmModel(value: string): void {
    if (WEB_LLM_MODEL_OPTIONS.includes(value as (typeof WEB_LLM_MODEL_OPTIONS)[number])) {
      this.aiSettingsService.patchSettings({ webLlmModel: value });
    }
  }

  setAiRemoteModel(value: string): void {
    if (REMOTE_AI_MODEL_OPTIONS.includes(value as (typeof REMOTE_AI_MODEL_OPTIONS)[number])) {
      this.aiSettingsService.patchSettings({ remoteModel: value });
    }
  }

  aiLocalStatusLabel(): string {
    if (!this.localAiStatus().supported) {
      return this.t('ai.localUnavailable');
    }

    if (this.webLlmProvider.isReady(this.aiSettings().webLlmModel)) {
      return this.t('ai.localReady');
    }

    if (this.webLlmProvider.isLoading(this.aiSettings().webLlmModel)) {
      return this.t('ai.localLoading');
    }

    if (this.localAiStatus().loadingState === 'failed') {
      return this.t('ai.localUnavailable');
    }

    return this.t('ai.localNotLoaded');
  }

  private localProviderUnavailable(): boolean {
    return !this.browserLocalProvider.supported() && this.webLlmUnavailable();
  }

  webLlmUnavailable(): boolean {
    return !this.localAiStatus().supported || this.localAiStatus().loadingState === 'failed';
  }

  private webLlmModelUnavailable(model: string): boolean {
    if (!this.localAiStatus().supported) {
      return true;
    }

    return this.aiSettings().webLlmModel === model && this.localAiStatus().loadingState === 'failed';
  }

  private localAiStatusTone(): AppSelectOption['statusTone'] {
    if (!this.localAiStatus().supported) {
      return 'unavailable';
    }

    if (this.webLlmProvider.isReady(this.aiSettings().webLlmModel)) {
      return 'ready';
    }

    if (this.webLlmProvider.isLoading(this.aiSettings().webLlmModel)) {
      return 'loading';
    }

    return 'available';
  }

  private webLlmStatusTone(model: string): AppSelectOption['statusTone'] {
    if (!this.localAiStatus().supported) {
      return 'unavailable';
    }

    if (this.webLlmProvider.isReady(model)) {
      return 'ready';
    }

    if (this.webLlmProvider.isLoading(model)) {
      return 'loading';
    }

    return 'available';
  }

  statusLabel(statusTone: AppSelectOption['statusTone']): string {
    switch (statusTone) {
      case 'ready':
        return this.t('ai.statusReady');
      case 'loading':
        return this.t('ai.statusLoading');
      case 'unavailable':
        return this.t('ai.statusUnavailable');
      case 'available':
      default:
        return this.t('ai.statusAvailable');
    }
  }

  openShortcutSettings(): void {
    this.editableShortcuts.set({ ...this.generalConfig().keyboardShortcuts });
    this.shortcutsDialogOpen.set(true);
    this.resetConfirmationOpen.set(false);
    this.shortcutResetConfirmationOpen.set(false);
  }

  closeShortcutSettings(): void {
    this.shortcutsDialogOpen.set(false);
    this.shortcutResetConfirmationOpen.set(false);
  }

  updateShortcut(action: KeyboardShortcutAction, shortcut: string, conflictingAction?: string): void {
    this.editableShortcuts.update((shortcuts) => ({
      ...shortcuts,
      ...(this.isShortcutAction(conflictingAction) ? { [conflictingAction]: '' } : {}),
      [action]: shortcut
    }));
  }

  requestResetShortcutsToDefaults(): void {
    if (!this.shortcutsAreDefault()) {
      this.shortcutResetConfirmationOpen.set(true);
    }
  }

  cancelResetShortcutsToDefaults(): void {
    this.shortcutResetConfirmationOpen.set(false);
  }

  confirmResetShortcutsToDefaults(): void {
    this.editableShortcuts.set({ ...DEFAULT_KEYBOARD_SHORTCUTS });
    this.shortcutResetConfirmationOpen.set(false);
  }

  saveShortcutSettings(): void {
    this.configuration.setKeyboardShortcuts(this.editableShortcuts());
    this.shortcutsDialogOpen.set(false);
  }

  shortcutLabel(shortcut: string): string {
    return shortcut.trim() ? keyboardShortcutLabel(shortcut, this.isMacPlatform()) : this.t('unassignedShortcut');
  }

  updatePreferenceText(key: PreferenceTextKey, event: Event): void {
    this.patchPreferences({ [key]: (event.target as HTMLInputElement).value } as Partial<EditorPreferences>);
  }

  updateZoomPercent(event: Event): void {
    const percent = Number((event.target as HTMLInputElement).value);
    if (!Number.isFinite(percent)) {
      return;
    }

    const clampedPercent = Math.min(this.maxZoomPercent, Math.max(this.minZoomPercent, percent));
    this.patchPreferences({ scale: (DEFAULT_EDITOR_SCALE * clampedPercent) / 100 });
  }

  updatePreferenceNumber(key: PreferenceNumberKey, event: Event, minimumValue: number, maximumValue?: number): void {
    const rawValue = Number((event.target as HTMLInputElement).value);
    if (!Number.isFinite(rawValue)) {
      return;
    }
    const clampedValue = maximumValue === undefined ? Math.max(minimumValue, rawValue) : Math.min(maximumValue, Math.max(minimumValue, rawValue));
    this.patchPreferences({ [key]: clampedValue } as Partial<EditorPreferences>);
  }

  updatePreferenceBoolean(key: PreferenceBooleanKey, checked: boolean): void {
    this.patchPreferences({ [key]: checked } as Partial<EditorPreferences>);
  }

  updateLatexExportText(key: LatexExportTextKey, event: Event): void {
    this.patchLatexExportConfig({
      [key]: (event.target as HTMLInputElement | HTMLSelectElement).value
    } as Partial<LatexExportConfig>);
  }

  setLatexExportText(key: LatexExportTextKey, value: string): void {
    this.patchLatexExportConfig({
      [key]: value
    } as Partial<LatexExportConfig>);
  }

  updateLatexExportNumber(key: LatexExportNumberKey, event: Event, min: number, max: number): void {
    const inputValue = Number.parseFloat((event.target as HTMLInputElement).value);
    if (!Number.isFinite(inputValue)) {
      return;
    }

    this.patchLatexExportConfig({
      [key]: Math.min(max, Math.max(min, inputValue))
    } as Partial<LatexExportConfig>);
  }

  updateLatexExportBoolean(key: LatexExportBooleanKey, checked: boolean): void {
    this.patchLatexExportConfig({
      [key]: checked
    } as Partial<LatexExportConfig>);
  }

  setLatexAlignment(alignment: LatexAlignment): void {
    this.patchLatexExportConfig({ alignment });
  }

  setLatexFontSize(fontSize: string): void {
    if (LATEX_FONT_SIZES.includes(fontSize as LatexFontSize)) {
      this.patchLatexExportConfig({ fontSize: fontSize as LatexFontSize });
    }
  }

  setCodeHighlightTheme(theme: string): void {
    this.configuration.setCodeHighlightTheme(theme);
  }

  setDefaultLineStrokeStyle(style: string): void {
    if (this.lineStrokeStyleOptions.some((option) => option.id === style)) {
      this.patchPreferences({ defaultLineStrokeStyle: style as LineStrokeStyle });
    }
  }

  setDefaultArrowType(arrowType: string): void {
    if (this.arrowTipOptions.some((option) => option.id === arrowType)) {
      this.patchPreferences({ defaultArrowType: arrowType as ArrowTipKind });
    }
  }

  translatedSelectOptions(options: readonly LabelKeyOption[]): readonly AppSelectOption[] {
    return options.map((option) => ({
      value: option.value,
      label: this.t(option.labelKey)
    }));
  }

  fontSizeSelectOptions(): readonly AppSelectOption[] {
    return this.fontSizeOptions.map((fontSize) => ({
      value: fontSize,
      label: fontSize
    }));
  }

  previewStrokeDasharray(): string | null {
    switch (this.preferences().defaultLineStrokeStyle) {
      case 'dashed':
        return '8 5';
      case 'dotted':
        return '1 5';
      case 'dash-dotted':
        return '8 4 1 4';
      case 'loosely-dashed':
        return '12 7';
      case 'solid':
        return null;
    }
  }

  previewStrokeWidth(): number {
    return Math.min(6, Math.max(1, 1 + Math.sqrt(this.preferences().defaultStrokeWidth) * 1.25));
  }

  previewArrowMarkerSize(): number {
    return Math.min(18, Math.max(9, 7 + this.preferences().defaultArrowScale * 3));
  }

  previewArrowPath(): string {
    const size = this.previewArrowMarkerSize();
    const half = size / 2;
    const inset = Math.max(2, size * 0.22);
    const radius = Math.max(2.4, size * 0.26);

    switch (this.preferences().defaultArrowType) {
      case 'triangle':
      case 'latex':
        return `M${inset},1 L${size - 1},${half} L${inset},${size - 1} Z`;
      case 'stealth':
        return `M1,1 L${size - 1},${half} L1,${size - 1} Q${size * 0.35},${half} 1,1 Z`;
      case 'diamond':
        return `M1,${half} L${half},1 L${size - 1},${half} L${half},${size - 1} Z`;
      case 'circle':
        return `M${half - radius},${half} a${radius},${radius} 0 1 0 ${radius * 2},0 a${radius},${radius} 0 1 0 ${-radius * 2},0`;
      case 'bar':
        return `M${half},${size * 0.14} L${half},${size * 0.86}`;
      case 'hooks':
        return `M${size - 1},${half} C${size * 0.5},${half} ${size * 0.42},${size * 0.16} ${size * 0.18},${size * 0.2} M${size - 1},${half} C${size * 0.5},${half} ${size * 0.42},${size * 0.84} ${size * 0.18},${size * 0.8}`;
      case 'bracket':
        return `M${size - 1},${size * 0.18} H${size * 0.36} V${size * 0.82} H${size - 1}`;
      case 'kite':
        return `M1,${half} L${size * 0.48},1 L${size - 1},${half} L${size * 0.48},${size - 1} Z`;
      case 'square':
        return `M${size * 0.25},${size * 0.25} H${size * 0.82} V${size * 0.75} H${size * 0.25} Z`;
      case 'parenthesis':
        return `M${size * 0.68},${size * 0.12} C${size * 0.36},${size * 0.28} ${size * 0.36},${size * 0.72} ${size * 0.68},${size * 0.88}`;
      case 'straight-barb':
        return `M1,1 L${size - 1},${half} L1,${size - 1}`;
    }
  }

  previewArrowFill(): string {
    switch (this.preferences().defaultArrowType) {
      case 'latex':
      case 'triangle':
      case 'stealth':
      case 'kite':
      case 'square':
        return this.preferences().defaultStroke;
      case 'diamond':
      case 'circle':
      case 'bar':
      case 'hooks':
      case 'bracket':
      case 'parenthesis':
      case 'straight-barb':
        return 'none';
    }
  }

  previewArrowStroke(): string {
    switch (this.preferences().defaultArrowType) {
      case 'latex':
      case 'triangle':
      case 'stealth':
      case 'kite':
      case 'square':
        return 'none';
      case 'diamond':
      case 'circle':
      case 'bar':
      case 'hooks':
      case 'bracket':
      case 'parenthesis':
      case 'straight-barb':
        return this.preferences().defaultStroke;
    }
  }

  previewArrowStrokeWidth(): number {
    return Math.max(1.2, this.previewStrokeWidth() * 0.8);
  }

  previewTextFontSize(): number {
    return Math.max(9, this.preferences().defaultTextFontSize * 24);
  }

  previewCornerRadius(): number {
    return Math.min(18, this.preferences().defaultCornerRadius * 8);
  }

  previewGridSize(): number {
    const zoomRatio = this.preferences().scale / DEFAULT_EDITOR_SCALE;
    return Math.max(6, 14 * zoomRatio);
  }

  previewViewBox(): string {
    const zoomRatio = this.preferences().scale / DEFAULT_EDITOR_SCALE;
    const width = PREVIEW_VIEWBOX_WIDTH / zoomRatio;
    const height = PREVIEW_VIEWBOX_HEIGHT / zoomRatio;
    const left = PREVIEW_VIEWBOX_WIDTH / 2 - width / 2;
    const top = PREVIEW_VIEWBOX_HEIGHT / 2 - height / 2;
    return `${left} ${top} ${width} ${height}`;
  }

  applySuggestedCaptionAndLabel(): void {
    this.patchLatexExportConfig({
      caption: this.suggestedCaption,
      label: this.suggestedLabel
    });
  }

  requestResetToDefaults(): void {
    if (!this.settingsAreDefault()) {
      this.resetConfirmationOpen.set(true);
    }
  }

  cancelResetToDefaults(): void {
    this.resetConfirmationOpen.set(false);
  }

  confirmResetToDefaults(): void {
    this.store.patchPreferences(defaultPreferences);
    this.configuration.resetToDefaults();
    this.aiSettingsService.resetToDefaults();
    this.languageService.setLanguage(detectLanguage());
    this.resetConfirmationOpen.set(false);
    this.shortcutsDialogOpen.set(false);
    this.shortcutResetConfirmationOpen.set(false);
  }

  private patchPreferences(patch: Partial<EditorPreferences>): void {
    this.store.patchPreferences(patch);
  }

  private prepareAlignmentSwitch(tab: ApplicationConfigurationTab): void {
    if (tab !== 'latex') {
      this.alignmentSwitchReady.set(false);
      return;
    }

    this.alignmentSwitchReady.set(false);
    const scheduleReady =
      typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame
        : (callback: FrameRequestCallback): number => {
            globalThis.setTimeout(() => callback(Date.now()), 0);
            return 0;
          };

    scheduleReady(() => this.alignmentSwitchReady.set(this.activeTab() === 'latex'));
  }

  patchLatexExportConfig(patch: Partial<LatexExportConfig>): void {
    this.configuration.patchLatexExportConfig(patch);
  }

  private focusActiveTab(): void {
    this.tabButtons()
      .find((tab) => tab.nativeElement.dataset['tab'] === this.activeTab())
      ?.nativeElement.focus();
  }

  private preferencesEqual(current: EditorPreferences, expected: EditorPreferences): boolean {
    return (
      current.theme === expected.theme &&
      current.snapToGrid === expected.snapToGrid &&
      current.showGrid === expected.showGrid &&
      current.showAxes === expected.showAxes &&
      current.scale === expected.scale &&
      current.snapStep === expected.snapStep &&
      current.defaultStroke === expected.defaultStroke &&
      current.defaultFill === expected.defaultFill &&
      current.defaultStrokeWidth === expected.defaultStrokeWidth &&
      current.defaultArrowScale === expected.defaultArrowScale &&
      current.defaultArrowType === expected.defaultArrowType &&
      current.defaultLineStrokeStyle === expected.defaultLineStrokeStyle &&
      current.defaultCornerRadius === expected.defaultCornerRadius &&
      current.defaultTextColor === expected.defaultTextColor &&
      current.defaultTextFontSize === expected.defaultTextFontSize
    );
  }

  private latexExportConfigEqual(current: LatexExportConfig, expected: LatexExportConfig): boolean {
    return (
      current.colorMode === expected.colorMode &&
      current.wrapInFigure === expected.wrapInFigure &&
      current.figurePlacement === expected.figurePlacement &&
      current.alignment === expected.alignment &&
      current.scaleToWidth === expected.scaleToWidth &&
      current.includeFrame === expected.includeFrame &&
      current.maxWidthPercent === expected.maxWidthPercent &&
      current.standaloneBorderMm === expected.standaloneBorderMm &&
      current.fontSize === expected.fontSize &&
      current.includeCaption === expected.includeCaption &&
      current.caption === expected.caption &&
      current.includeLabel === expected.includeLabel &&
      current.label === expected.label
    );
  }

  private generalConfigEqual(current: EditorGeneralConfig): boolean {
    return (
      current.showHelpTooltips === DEFAULT_EDITOR_GENERAL_CONFIG.showHelpTooltips &&
      current.whiteCanvasInDarkMode === DEFAULT_EDITOR_GENERAL_CONFIG.whiteCanvasInDarkMode &&
      this.shortcutConfigEqual(current.keyboardShortcuts, DEFAULT_EDITOR_GENERAL_CONFIG.keyboardShortcuts)
    );
  }

  private shortcutConfigEqual(current: KeyboardShortcutConfig, expected: KeyboardShortcutConfig): boolean {
    return (Object.keys(DEFAULT_KEYBOARD_SHORTCUTS) as KeyboardShortcutAction[]).every((action) => current[action] === expected[action]);
  }

  private isShortcutAction(action: string | undefined): action is KeyboardShortcutAction {
    return !!action && Object.prototype.hasOwnProperty.call(DEFAULT_KEYBOARD_SHORTCUTS, action);
  }

  isMacPlatform(): boolean {
    return typeof navigator !== 'undefined' && REGEX.editor.macPlatform.test(navigator.platform);
  }
}
