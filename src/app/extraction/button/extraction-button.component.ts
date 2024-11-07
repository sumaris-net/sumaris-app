import { ChangeDetectionStrategy, Component, EventEmitter, inject, Input, Output, TemplateRef, ViewChild } from '@angular/core';
import { isNotEmptyArray, NetworkService, StatusIds } from '@sumaris-net/ngx-components';
import { Observable } from 'rxjs';
import { ExtractionCategoryType, ExtractionType } from '../../extraction/type/extraction-type.model';
import { filter, switchMap, tap } from 'rxjs/operators';
import { ExtractionTypeFilter } from '../../extraction/type/extraction-type.filter';
import { ExtractionTypeService } from '../../extraction/type/extraction-type.service';
import { RxState } from '@rx-angular/state';
import { MatMenuTrigger } from '@angular/material/menu';
import { RxStateProperty } from '@app/shared/state/state.decorator';

interface EntityExtractionMenuState {
  programLabels: string[];
  isSpatial: boolean;
  category: ExtractionCategoryType;
}

export declare type AppEntityExtractionButtonStyle = 'mat-icon-button' | 'mat-menu-item';

@Component({
  selector: 'app-extraction-button',
  templateUrl: 'extraction-button.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppExtractionButton extends RxState<EntityExtractionMenuState> {
  protected readonly extractionTypeService = inject(ExtractionTypeService);
  protected readonly network = inject(NetworkService);
  protected readonly types$: Observable<ExtractionType[]>;

  @Input() disabled = false;
  @Input() disabledDownloadAsType = false;
  @Input() title = 'COMMON.BTN_DOWNLOAD';
  @Input() label = 'COMMON.BTN_DOWNLOAD_DOTS';
  @Input() typesTitle = 'EXTRACTION.TYPES_MENU.LIVE_DIVIDER';
  @Input() icon = null;
  @Input() matIcon = 'download';
  @Input() style: AppEntityExtractionButtonStyle = 'mat-icon-button';
  @Input() debug: boolean = false;

  @Input() @RxStateProperty() programLabels: string[];

  @Input() set programLabel(value: string) {
    this.set('programLabels', (_) => (value ? [value] : null));
  }

  get programLabel(): string {
    return this.get('programLabels')?.[0];
  }

  @Input() @RxStateProperty() isSpatial: boolean;
  @Input() @RxStateProperty() category: ExtractionCategoryType;

  @Output() downloadAsJson = new EventEmitter<UIEvent>();
  @Output() downloadAsType = new EventEmitter<ExtractionType>();

  @ViewChild('typesTemplate') typesTemplate: TemplateRef<any>;

  constructor() {
    super();
    this.set({
      isSpatial: false,
      category: 'LIVE',
    });

    // Extraction types
    this.types$ = this.select(['programLabels', 'isSpatial', 'category'], (res) => res).pipe(
      // DEBUG
      tap(
        ({ programLabels }) =>
          this.debug && console.debug(`[entity-extraction-button] Watching extraction types {programLabels: [${programLabels?.join(', ')}]}...`)
      ),

      filter(({ programLabels }) => isNotEmptyArray(programLabels)),

      // DEBUG
      tap(
        ({ programLabels }) =>
          this.debug && console.debug(`[entity-extraction-button] Watching extraction types {programLabels: [${programLabels.join(', ')}]}...`)
      ),

      // Load extraction types, from program's formats
      switchMap(({ programLabels, isSpatial, category }) =>
        this.extractionTypeService.watchAllByProgramLabels(
          programLabels,
          <ExtractionTypeFilter>{
            statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
            isSpatial,
            category,
          },
          { fetchPolicy: 'cache-first' }
        )
      )
    );
  }
}
