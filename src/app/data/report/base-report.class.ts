import { AfterViewInit, ChangeDetectorRef, Directive, EventEmitter, Injector, Input, OnDestroy, OnInit, Optional, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { IRevealExtendedOptions, RevealComponent } from '@app/shared/report/reveal/reveal.component';
import { environment } from '@environments/environment';
import { TranslateService } from '@ngx-translate/core';
// import { setTimeout } from '@rx-angular/cdk/zone-less/browser';
import {
  AccountService,
  AppErrorWithDetails,
  DateFormatService,
  DateUtils,
  EntityAsObjectOptions,
  firstFalsePromise,
  isNil,
  isNilOrBlank,
  isNotNil,
  isNotNilOrBlank,
  isNumber,
  JsonUtils,
  LatLongPattern,
  LocalSettingsService,
  MenuService,
  NetworkService,
  PlatformService,
  Toasts,
  toDateISOString,
  TranslateContextService,
  WaitForOptions,
  waitForTrue,
} from '@sumaris-net/ngx-components';
import { BehaviorSubject, lastValueFrom, Subject } from 'rxjs';
import { ModalController, PopoverController, ToastController } from '@ionic/angular';
import { Share } from '@capacitor/share';
import { Popovers } from '@app/shared/popover/popover.utils';
import { SharedElement } from '@app/social/share/shared-page.model';
import { v4 as uuidv4 } from 'uuid';
import { filter, first, map, takeUntil } from 'rxjs/operators';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { FileTransferService } from '@app/shared/service/file-transfer.service';
import { APP_BASE_HREF } from '@angular/common';
import { Clipboard, ContextService } from '@app/shared/context.service';
import { instanceOf } from 'graphql/jsutils/instanceOf';
import { Function } from '@app/shared/functions';
import { hasFlag } from '@app/shared/flags.utils';
import { SharedResourceUtils } from '@app/social/share/shared-resource.utils';
import { Program } from '@app/referential/services/model/program.model';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { Clipboard as CapacitorClipboard } from '@capacitor/clipboard';

export const ReportDataPasteFlags = Object.freeze({
  NONE: 0,
  DATA: 1,
  STATS: 2,
  I18N_CONTEXT: 4,

  // ALL FLAGS
  ALL: 1 + 2 + 4,
});

export interface BaseReportOptions {
  pathIdAttribute?: string;
  pathParentIdAttribute?: string;
  i18nPrefix?: string;
  i18nPmfmPrefix?: string;
}

export interface IReportData {
  fromObject?: (source: any) => void;
  asObject?: (opts?: EntityAsObjectOptions) => any;
}

export class BaseReportStats {
  program: Program;

  fromObject(source: any) {
    this.program = Program.fromObject(source.program);
  }

  asObject(opts?: EntityAsObjectOptions): any {
    return {
      program: this.program?.asObject(opts),
    };
  }
}

export interface IReportI18nContext {
  prefix: string;
  suffix: string;
  pmfmPrefix?: string;
}

export interface IComputeStatsOpts<S> {
  getSubCategory?: Function<any, string>;
  stats?: S;
  cache?: boolean;
}

@Directive()
export abstract class AppBaseReport<
    T extends IReportData,
    ID = number,
    S extends BaseReportStats = BaseReportStats,
    O extends BaseReportOptions = BaseReportOptions,
  >
  implements OnInit, AfterViewInit, OnDestroy
{
  private _printing = false;

  protected logPrefix = 'base-report';
  protected readonly route: ActivatedRoute;
  protected readonly cd: ChangeDetectorRef;
  protected readonly dateFormat: DateFormatService;
  protected readonly settings: LocalSettingsService;
  protected readonly modalCtrl: ModalController;

  protected readonly injector: Injector;
  protected readonly platform: PlatformService;
  protected readonly translate: TranslateService;
  protected readonly programRefService: ProgramRefService;
  protected readonly fileTransferService: FileTransferService;
  protected readonly baseHref: string;
  protected readonly translateContext: TranslateContextService;
  protected readonly context: ContextService;

  protected readonly router: Router;
  protected readonly destroySubject = new Subject<void>();
  protected readonly readySubject = new BehaviorSubject<boolean>(false);
  protected readonly loadingSubject = new BehaviorSubject<boolean>(true);
  protected readonly toastController: ToastController;
  protected readonly network: NetworkService;

  protected _autoLoad = true;
  protected _autoLoadDelay = 0;
  protected _pathIdAttribute: string;
  protected _pathParentIdAttribute: string;
  protected _stats: S = null;
  protected uuid: string = null;

  protected onRefresh = new EventEmitter<void>();

  error: string;
  revealOptions: Partial<IRevealExtendedOptions>;
  i18nContext: IReportI18nContext = null;

  $defaultBackHref = new BehaviorSubject<string>('');
  $title = new BehaviorSubject<string>('');

  @Input() mobile: boolean;
  @Input() modal: boolean;
  @Input() showError = true;
  @Input() showToolbar = true;
  @Input() debug = !environment.production;

  @Input() data: T;
  @Input() set stats(value) {
    if (isNil(value)) return;
    if (instanceOf(value, this.statsType)) this._stats = value;
    else this._stats = this.statsFromObject(value);
  }
  get stats(): S {
    return this._stats;
  }

  get embedded(): boolean {
    return this.reveal?.embedded || false;
  }

  @Input() i18nContextSuffix: string;

  @ViewChild(RevealComponent, { static: false }) protected reveal: RevealComponent;

  get loaded(): boolean {
    return !this.loadingSubject.value;
  }
  get loading(): boolean {
    return this.loadingSubject.value;
  }

  get modalName(): string {
    return this.constructor.name;
  }

  get latLongFormat(): LatLongPattern {
    return this.settings?.latLongFormat;
  }

  get shareUrlBase(): string {
    let peerUrl = this.settings.settings?.peerUrl;

    if (isNilOrBlank(peerUrl)) {
      // Fallback to current website (but NOT if in App)
      if (this.isApp()) {
        throw new Error('Cannot shared report when not connected to any node. Please check your settings');
      }

      // Fallback to the current web site
      peerUrl = this.baseHref;
    }

    return `${peerUrl.replace(/\/$/, '')}/share/`;
  }

  get isPrinting(): boolean {
    return this._printing;
  }

  protected constructor(
    injector: Injector,
    protected dataType: new () => T,
    protected statsType: new () => S,
    @Optional() protected options?: O
  ) {
    this.injector = injector;
    this.baseHref = injector.get(APP_BASE_HREF);
    this.translateContext = injector.get(TranslateContextService);
    this.cd = injector.get(ChangeDetectorRef);
    this.route = injector.get(ActivatedRoute);
    this.router = injector.get(Router);
    this.dateFormat = injector.get(DateFormatService);
    this.settings = injector.get(LocalSettingsService);
    this.modalCtrl = injector.get(ModalController);
    this.toastController = injector.get(ToastController);
    this.fileTransferService = injector.get(FileTransferService);
    this.context = injector.get(ContextService);
    this.network = injector.get(NetworkService);

    this.platform = injector.get(PlatformService);
    this.translate = injector.get(TranslateService);
    this.programRefService = injector.get(ProgramRefService);

    this.mobile = this.settings.mobile;
    this.uuid = this.route.snapshot.queryParamMap.get('uuid');

    this._pathParentIdAttribute = options?.pathParentIdAttribute;
    // NOTE: In route.snapshot data is optional. On which case it may be not set ???
    this._pathIdAttribute = this.route.snapshot.data?.pathIdParam || options?.pathIdAttribute || 'id';

    this.onRefresh.pipe(filter((_) => this.loaded)).subscribe(() => this.reload({ cache: false }));

    this.debug = !environment.production;
  }

  ngOnInit() {
    // TODO : FIXME
    // this.modal = isNotNil(this.modal) ? this.modal : !!(await this.modalCtrl.getTop());
    if (this.embedded) {
      this.showToolbar = false;
    }
  }

  ngAfterViewInit() {
    if (this._autoLoad) {
      setTimeout(() => this.start(), this._autoLoadDelay);
    }
  }

  ngOnDestroy() {
    this.destroySubject.next();
  }

  async start(opts?: any) {
    await this.platform.ready();

    // Disable the menu if user is not authenticated (public shared report)
    const accountService = this.injector.get(AccountService);
    await accountService.ready();
    if (!accountService.isAuth()) {
      const menu = this.injector.get(MenuService);
      menu.enable(false);
    }

    this.markAsReady();
    try {
      // Load or fill this.data, this.stats and this.i18nContext
      await this.ngOnStart(opts);

      if (isNilOrBlank(this.uuid)) this.$defaultBackHref.next(this.computeDefaultBackHref(this.data, this.stats));
      this.$title.next(await this.computeTitle(this.data, this.stats));
      this.revealOptions = this.computeSlidesOptions(this.data, this.stats);

      this.markAsLoaded();

      // Update the view: initialize reveal
      await this.updateView();
    } catch (err) {
      console.error(err);
      this.setError(err);
      this.markAsLoaded();
    }
  }

  async reload(opts?: any) {
    if (!this.loaded) return; // skip

    this.markAsLoading();
    this.cd.detectChanges();

    setTimeout(() => {
      this.data = undefined;
      this.stats = undefined;
      this.i18nContext = undefined;

      this.start(opts);
    }, 500);
  }

  cancel() {
    if (this.modal) {
      this.modalCtrl.dismiss();
    }
  }

  async ngOnStart(opts?: any) {
    if (this.debug) {
      if (isNotNil(this.data)) console.debug(`[${this.logPrefix}] data present on starting`, this.data);
      if (isNotNil(this.stats)) console.debug(`[${this.logPrefix}] stats present on starting`, this.stats);
      if (isNotNil(this.i18nContext)) console.debug(`[${this.logPrefix}] i18nContext present on starting`, this.i18nContext);
    }

    // If data is not filled by input, fill it with the clipboard
    let clipboard: Clipboard<any>;
    if (isNotNil(this.context.clipboard)) {
      clipboard = this.context.clipboard;
    } else if (isNotNilOrBlank(this.uuid)) {
      if (this.debug) console.debug(`[${this.logPrefix}] fill clipboard by downloading shared resource`);
      const http = this.injector.get(HttpClient);
      const peerUrl = this.settings.settings.peerUrl;
      const sharedElement = await SharedResourceUtils.downloadByUuid(http, peerUrl, this.uuid);

      clipboard = sharedElement.content;
    }

    if (hasFlag(clipboard?.pasteFlags, ReportDataPasteFlags.DATA) && isNotNil(clipboard?.data?.data)) {
      const consumed = await this.loadFromClipboard(clipboard);
      if (consumed) this.context.resetValue('clipboard');
    }
  }

  protected abstract loadFromRoute(opts?: any): Promise<T>;

  protected async loadFromClipboard(clipboard: Clipboard, opts?: any): Promise<boolean> {
    if (this.debug) console.debug(`[${this.logPrefix}] loadFromClipboard`, clipboard);

    let consumed = false;

    if (isNil(this.data) && hasFlag(clipboard.pasteFlags, ReportDataPasteFlags.DATA) && isNotNil(clipboard.data.data)) {
      this.data = this.dataFromObject(clipboard.data.data);
      consumed = true;
      if (this.debug) console.debug(`[${this.logPrefix}] data loaded from clipboard`, this.data);
    }

    if (isNotNil(this.data) && isNil(this.stats) && hasFlag(clipboard.pasteFlags, ReportDataPasteFlags.STATS) && isNotNil(clipboard.data.stats)) {
      this.stats = this.statsFromObject(clipboard.data.stats);
      consumed = true;
      if (this.debug) console.debug(`[${this.logPrefix}] stats loaded from clipboard`, this.stats);
    }

    if (hasFlag(clipboard.pasteFlags, ReportDataPasteFlags.I18N_CONTEXT) && isNotNil(clipboard.data.i18nContext)) {
      this.i18nContext = {
        ...this.i18nContext,
        ...clipboard.data.i18nContext,
        pmfmPrefix: this.options?.i18nPmfmPrefix,
      };
      consumed = true;
      if (this.debug) console.debug(`[${this.logPrefix}] i18nContext loaded from clipboard`, this.i18nContext);
    }

    return consumed;
  }

  // NOTE : Can have parent. Can take param from interface ?
  protected abstract computeTitle(data: T, stats: S): Promise<string>;

  protected abstract computeStats(data: T, opts?: IComputeStatsOpts<S>): Promise<S>;

  // NOTE : Can have parent. Can take param from interface ?
  protected abstract computeDefaultBackHref(data: T, stats: S): string;

  protected computeI18nContext(stats: BaseReportStats): IReportI18nContext {
    if (this.debug) console.debug(`[${this.logPrefix}] computeI18nContext]`);
    const suffix = isNilOrBlank(this.i18nContextSuffix) ? stats.program?.getProperty(ProgramProperties.I18N_SUFFIX) || '' : this.i18nContextSuffix;

    return {
      prefix: this.options?.i18nPrefix || '',
      suffix: suffix === 'legacy' ? '' : suffix,
      pmfmPrefix: this.options?.i18nPmfmPrefix || '',
    };
  }

  computePrintHref(data: T, stats: S): URL {
    if (this.uuid) return new URL(`${this.baseHref}/${this.computeShareBasePath()}?uuid=${this.uuid}`);
    else return new URL(window.location.origin + this.computeDefaultBackHref(data, stats).replace(/\?.*$/, '') + '/report');
  }

  protected abstract computeShareBasePath(): string;

  protected computeSlidesOptions(data: T, stats: S): Partial<IRevealExtendedOptions> {
    if (this.debug) console.debug(`[${this.logPrefix}] computeSlidesOptions`);
    const mobile = this.settings.mobile;
    return {
      // Custom reveal options
      autoInitialize: false,
      autoPrint: false,
      // Reveal options
      pdfMaxPagesPerSlide: 1,
      disableLayout: mobile,
      touch: mobile,
      printUrl: this.computePrintHref(data, stats),
    };
  }

  protected getIdFromPathIdAttribute<R>(pathIdAttribute: string): R {
    const route = this.route.snapshot;
    const id = route.params[pathIdAttribute] as R;
    if (isNotNil(id)) {
      if (typeof id === 'string' && isNumber(id)) {
        return +id as any as R;
      }
      return id;
    }
    return undefined;
  }

  async updateView() {
    this.cd.detectChanges();
    await firstFalsePromise(this.loadingSubject, { stop: this.destroySubject });
    if (!this.embedded) await this.reveal.initialize();
  }

  markAsReady() {
    if (!this.readySubject.value) {
      this.readySubject.next(true);
    }
  }

  protected isApp() {
    return this.mobile && this.platform.isApp();
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

  protected markAsLoading(opts = { emitEvent: true }) {
    if (!this.loadingSubject.value) {
      this.loadingSubject.next(true);
      if (opts.emitEvent !== false) this.markForCheck();
    }
  }

  protected markAsLoaded(opts = { emitEvent: true }) {
    if (this.loadingSubject.value) {
      this.loadingSubject.next(false);
      if (opts.emitEvent !== false) this.markForCheck();
    }
  }

  async waitIdle(opts: WaitForOptions) {
    console.debug(`[${this.constructor.name}]`);
    if (this.loaded) return;
    await firstFalsePromise(this.loadingSubject, { stop: this.destroySubject, ...opts });
  }

  async ready(opts?: WaitForOptions): Promise<void> {
    if (this.readySubject.value) return;
    await waitForTrue(this.readySubject, opts);
  }

  setError(
    err: string | AppErrorWithDetails,
    opts?: {
      detailsCssClass?: string;
      emitEvent?: boolean;
    }
  ) {
    if (!err) {
      this.error = undefined;
    } else if (typeof err === 'string') {
      this.error = err as string;
    } else {
      // NOTE: Case when `|| err` is possible ?
      let userMessage: string = (err.message && this.translate.instant(err.message)) || err;
      // NOTE: replace || by && ???
      const detailMessage: string = !err.details || typeof err.message === 'string' ? (err.details as string) : err.details.message;
      // NOTE: !isNotNilOrBlank ??? (invert the test)
      if (isNotNilOrBlank(detailMessage)) {
        const cssClass = opts?.detailsCssClass || 'hidden-xs hidden-sm';
        userMessage += `<br/><small class="${cssClass}" title="${detailMessage}">`;
        userMessage += detailMessage.length < 70 ? detailMessage : detailMessage.substring(0, 67) + '...';
        userMessage += '</small>';
      }
      this.error = userMessage;
      if (!opts || opts.emitEvent !== false) this.markForCheck();
    }
  }

  abstract dataAsObject(source: T, opts?: EntityAsObjectOptions): any;

  dataFromObject(source: any): T {
    if (this.dataType) {
      const data = new this.dataType();
      data.fromObject(source);
      return data;
    }
    return source as T;
  }

  statsAsObject(source: S, opts?: EntityAsObjectOptions): any {
    return source.asObject(opts);
  }

  statsFromObject(source: any): S {
    const stats = new this.statsType();
    stats.fromObject(source);
    return stats;
  }

  protected async showSharePopover(event?: UIEvent) {
    if (isNilOrBlank(this.uuid)) {
      try {
        this.uuid = await this.uploadReportFile();
      } catch (err) {
        console.error(err);
        await Toasts.show(this.toastController, this.translate, {
          message: err.message,
          type: 'error',
        });
        return;
      }
    }

    const shareUrl = this.shareUrlBase + this.uuid;

    // Use Capacitor plugin
    if (this.isApp()) {
      await Share.share({
        dialogTitle: this.translate.instant('COMMON.SHARE.DIALOG_TITLE'),
        title: this.$title.value,
        text: this.translate.instant('COMMON.SHARE.LINK'),
        url: shareUrl,
      });
    } else {
      await Popovers.showText(
        this.injector.get(PopoverController),
        event,
        {
          text: shareUrl,
          title: '',
          editing: false,
          autofocus: false,
          multiline: true,
          autoHeight: true,
          placeholder: this.translate.instant('COMMON.REPORT.SHARE_LINK_PLACEHOLDER'),
          maxLength: null,
          showFooter: false,
          headerColor: 'secondary',

          headerButtons: [
            {
              icon: 'copy',
              text: 'COMMON.BTN_COPY',
              fill: 'outline',
              side: 'end',
              handler: async (value: string) => {
                await CapacitorClipboard.write({
                  string: value,
                });

                await Toasts.show(this.toastController, this.translate, {
                  type: 'info',
                  message: 'INFO.COPY_SUCCEED',
                });

                return false; // Avoid dismiss
              },
            },
          ],
        } as any,
        {
          backdropDismiss: true,
        } as any
      );
    }
  }

  protected async uploadReportFile(): Promise<string> {
    // Wait data loaded
    await this.waitIdle({ timeout: 5000 });

    const uploadFileName = this.getExportFileName('json');

    const sharedElement: SharedElement = {
      uuid: uuidv4(),
      shareLink: '',
      path: this.computeShareBasePath(),
      queryParams: {},
      creationDate: toDateISOString(DateUtils.moment()),
      content: {
        // TODO Type data ?
        data: {
          data: this.dataAsObject(this.data),
          stats: this.statsAsObject(this.stats),
          i18nContext: this.i18nContext,
        },
        // eslint-disable-next-line no-bitwise
        pasteFlags: ReportDataPasteFlags.DATA | ReportDataPasteFlags.STATS | ReportDataPasteFlags.I18N_CONTEXT,
      },
    };

    const file = JsonUtils.writeToFile(sharedElement, { filename: uploadFileName });

    const { fileName, message } = await lastValueFrom(
      this.fileTransferService
        .uploadResource(file, {
          resourceType: 'report',
          resourceId: sharedElement.uuid + '.json',
          reportProgress: false,
        })
        .pipe(
          map((event) => {
            if (event.type === HttpEventType.Response) {
              return event.body;
            }
          }),
          filter((body) => !!body),
          first(),
          takeUntil(this.destroySubject)
        )
    );

    if (message !== 'OK' || !fileName) {
      throw new Error('Failed to upload report data!');
    }

    await this.fileTransferService.shareAsPublic(fileName);

    // return the UUID
    return fileName.replace(/\.json$/, '');
  }

  protected getExportEncoding(format = 'json'): string {
    const key = `FILE.${format.toUpperCase()}.ENCODING`;
    const encoding = this.translate.instant(key);
    if (encoding !== key) return encoding;
    return 'UTF-8'; // Default encoding
  }

  protected getExportFileName(format = 'json', params?: any): string {
    const key = `${this.i18nContext.prefix}EXPORT_${format.toUpperCase()}_FILENAME`;
    const filename = this.translateContext.instant(key, this.i18nContext.suffix, params || { title: this.$title.value });
    if (filename !== key) return filename;
    return `export.${format}`; // Default filename
  }

  private isPrintingPDF(): boolean {
    if (this._printing) return true;
    const query = window.location.search || '?';
    return query.indexOf('print-pdf') !== -1;
  }

  private async print() {
    if (this._printing) return true; // Skip is already printing
    this._printing = true;
    await this.ready();
    this.reveal?.print();
  }
}
