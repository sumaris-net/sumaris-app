import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Inject,
  Input,
  OnDestroy,
  OnInit,
  Output,
  Self,
  ViewChild,
} from '@angular/core';
import { APP_IMAGE_ATTACHMENT_SERVICE } from './image-attachment.service';
import { ImageAttachment, ImageAttachmentFilter } from './image-attachment.model';
import { BehaviorSubject, distinctUntilChanged, of, Subject, Subscription, tap } from 'rxjs';
import { ModalController } from '@ionic/angular';
import {
  AppImageGalleryComponent,
  EntitiesTableDataSource,
  EntityUtils,
  GalleryMode,
  IAppForm,
  Image,
  InMemoryEntitiesService,
  isNil,
  LocalSettingsService,
  toBoolean,
  waitForFalse,
  WaitForOptions,
  waitForTrue,
} from '@sumaris-net/ngx-components';
import { TableDataSource, TableElement } from '@e-is/ngx-material-table';
import { debounceTime, startWith, switchMap } from 'rxjs/operators';
import { environment } from '@environments/environment';
import { PredefinedColors } from '@ionic/core';
import { getMaxRankOrder } from '@app/data/services/model/model.utils';

@Component({
  selector: 'app-image-attachment-gallery',
  templateUrl: './image-attachment-gallery.component.html',
  styleUrls: ['./image-attachment-gallery.component.scss'],
  providers: [
    {
      provide: APP_IMAGE_ATTACHMENT_SERVICE,
      useFactory: () =>
        new InMemoryEntitiesService(ImageAttachment, ImageAttachmentFilter, {
          equals: ImageAttachment.equals,
          onSort: (data, sortBy = 'rankOrder', sortDirection) => EntityUtils.sort(data, sortBy, sortDirection),
        }),
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppImageAttachmentGallery implements OnInit, OnDestroy, IAppForm {
  private readonly _subscription = new Subscription();
  protected readonly dataSource: EntitiesTableDataSource<ImageAttachment, ImageAttachmentFilter>;

  protected _enabled = true;

  protected readonly readySubject = new BehaviorSubject<boolean>(false);
  protected readonly loadingSubject = new BehaviorSubject<boolean>(true);
  protected readonly dirtySubject = new BehaviorSubject<boolean>(false);
  protected readonly touchedSubject = new BehaviorSubject<boolean>(false);
  protected readonly destroySubject = new Subject<void>();
  readonly errorSubject = new BehaviorSubject<string>(undefined);

  get error(): string {
    return this.errorSubject.value;
  }

  get enabled(): boolean {
    return this._enabled;
  }

  @Input() debug: boolean;
  @Input() mobile: boolean;
  @Input() mode: GalleryMode;
  @Input() cardColor: PredefinedColors | string = 'light';
  @Input() readOnly = false;
  @Input() showToolbar: boolean;
  @Input() showFabButton: boolean;
  @Input() showAddCardButton: boolean;
  @Input() autoLoad = true;

  // FIXME: need to hidden buttons (in HTML), etc. when disabled
  @Input() set disabled(value: boolean) {
    if (value !== !this._enabled) {
      if (value) this.disable({ emitEvent: false });
      else this.enable({ emitEvent: false });
    }
  }

  get disabled(): boolean {
    return !this._enabled;
  }

  @Input()
  set value(value: ImageAttachment[]) {
    this.setValue(value);
  }

  get value(): ImageAttachment[] {
    return (this.dataService.value || []).map(ImageAttachment.fromObject);
  }

  get galleryDataSource(): TableDataSource<Image> {
    return this.dataSource as TableDataSource<Image>;
  }

  get loading(): boolean {
    return this.loadingSubject.value;
  }

  get loaded(): boolean {
    return !this.loadingSubject.value;
  }

  get valid() {
    return true;
  }

  get pending() {
    return false;
  }

  get invalid() {
    return !this.pending && !this.valid;
  }

  get touched(): boolean {
    return this.touchedSubject.value;
  }

  get untouched(): boolean {
    return !this.touched;
  }

  get dirty(): boolean {
    return this.dataService.dirty || this.dirtySubject.value;
  }

  disable(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    this._enabled = false;
    if (!opts || opts.emitEvent !== false) this.markForCheck();
  }

  enable(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    this._enabled = true;
    if (!opts || opts.emitEvent !== false) this.markForCheck();
  }

  ready(opts?: WaitForOptions): Promise<void> {
    return waitForTrue(this.readySubject, { stop: this.destroySubject, ...opts });
  }

  waitIdle(opts?: WaitForOptions): Promise<void> {
    if (!this.loadingSubject.value) return Promise.resolve();
    return waitForFalse(this.loadingSubject, { stop: this.destroySubject, ...opts });
  }

  markAsReady() {
    if (!this.readySubject.value) {
      this.readySubject.next(true);
    }
  }

  markAsDirty() {
    if (!this.dirtySubject.value) {
      this.dirtySubject.next(true);
    }
  }

  markAsPristine() {
    if (this.dirtySubject.value) {
      this.dirtySubject.next(false);
    }
  }

  /**
   * @deprecated prefer to use markAllAsTouched()
   * @param opts
   */
  markAsTouched(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    this.markAllAsTouched(opts);
  }

  markAllAsTouched(opts?: { emitEvent?: boolean }) {
    if (!this.touchedSubject.value) {
      this.touchedSubject.next(true);
    }
  }

  markAsUntouched(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    if (this.touchedSubject.value) {
      this.touchedSubject.next(false);
    }
  }

  markAsLoading(opts?: { emitEvent?: boolean }) {
    this.setLoading(true, opts);
  }

  markAsLoaded(opts?: { emitEvent?: boolean }) {
    this.setLoading(false, opts);
  }

  @Output() refresh = new EventEmitter<any>();

  @ViewChild('gallery', { static: true }) gallery: AppImageGalleryComponent<ImageAttachment>;

  constructor(
    protected modalCtrl: ModalController,
    protected settings: LocalSettingsService,
    protected cd: ChangeDetectorRef,
    @Self() @Inject(APP_IMAGE_ATTACHMENT_SERVICE) protected dataService: InMemoryEntitiesService<ImageAttachment, ImageAttachmentFilter>
  ) {
    this.dataSource = new EntitiesTableDataSource<ImageAttachment, ImageAttachmentFilter>(ImageAttachment, this.dataService, null, {
      prependNewElements: false,
    });
    this.debug = !environment.production;
  }

  ngOnInit() {
    // Set defaults
    this.mobile = toBoolean(this.mobile, this.settings.mobile);
    this.showToolbar = toBoolean(this.showToolbar, !this.mobile);

    // Call datasource refresh, on each refresh events
    this.registerSubscription(
      this.refresh
        .pipe(
          startWith<any, any>((this.autoLoad ? {} : 'skip') as any),
          switchMap((event) => {
            if (event === 'skip') {
              return of(undefined);
            }
            //if (this.debug)
            console.debug('[image-attachment-gallery] Calling dataSource.watchAll()...');
            return this.dataSource.watchAll(0, 100, null, null, null);
          })
        )
        .subscribe()
    );

    // Propage loading from datasource
    this.registerSubscription(
      this.dataSource.loadingSubject
        .pipe(
          distinctUntilChanged(),

          // If changed to True: propagate as soon as possible
          tap((loading) => loading && this.setLoading(true)),

          // If changed to False: wait 250ms before propagate (to make sure the spinner has been displayed)
          debounceTime(250),
          tap((loading) => !loading && this.setLoading(false))
        )
        .subscribe()
    );
  }

  ngOnDestroy() {
    this._subscription.unsubscribe();
  }

  setValue(value: ImageAttachment[]) {
    // DEBUG
    if (this.debug) console.debug(`[image-gallery] Setting ${value?.length || 0} image(s): `);

    const targets = value.map(ImageAttachment.fromObject);
    // Fill rankOrder (keep original order) - need by the equals() function
    ImageAttachment.fillRankOrder(targets);

    this.dataService.setValue(targets);
  }

  async onAfterAddRows(rows: TableElement<ImageAttachment>[]) {
    this.markAllAsTouched();

    // Fill rankOrder
    let rankOrder = getMaxRankOrder(this.dataSource.getData()) + 1;
    (rows || []).forEach((row) => {
      const data = row.currentData;
      if (isNil(data.rankOrder)) {
        data.rankOrder = rankOrder++;
        row.currentData = data;
      }
    });
    await this.save();

    this.markAsDirty();
  }

  protected resetError(opts?: { emitEvent?: boolean }) {
    this.setError(undefined, opts);
  }

  protected setError(value: string, opts?: { emitEvent?: boolean }) {
    if (this.errorSubject.value !== value) {
      this.errorSubject.next(value);
      if (!opts || opts.emitEvent !== false) {
        this.markForCheck();
      }
    }
  }

  async onAfterEditRow(row: TableElement<ImageAttachment>) {
    this.markAllAsTouched();

    // DEBUG
    //console.debug('[image-attachment-gallery] Edit image', row.currentData);

    // Copy title into comments
    //row.currentData.comments = row.currentData.title;
    //await this.save();
    this.markAsDirty();
  }

  save(): Promise<boolean> {
    return this.dataSource.save();
  }

  markForCheck() {
    this.cd.markForCheck();
  }

  protected registerSubscription(sub: Subscription) {
    this._subscription.add(sub);
  }

  protected unregisterSubscription(sub: Subscription) {
    this._subscription.remove(sub);
  }

  private setLoading(value: boolean, opts?: { emitEvent?: boolean }) {
    if (!this.loadingSubject.closed && this.loadingSubject.value !== value) {
      this.loadingSubject.next(value);

      if (!opts || opts.emitEvent !== false) {
        this.markForCheck();
      }
    }
  }
}
