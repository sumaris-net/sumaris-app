import {AfterViewInit, Directive, Injector, Input, OnDestroy, OnInit, Optional} from '@angular/core';
import {AccountService, DateUtils, EntityAsObjectOptions, isNil, isNotNil, TextPopover, Toasts, toDateISOString, TranslateContextService} from '@sumaris-net/ngx-components';
import {DataEntity} from '../services/model/data-entity.model';
import {AppBaseReport, BaseReportOptions, IReportStats} from '@app/data/report/base-report.class';
import {Function} from '@app/shared/functions';
import {Router} from '@angular/router';
import {decodeUTF8} from 'tweetnacl-util';
import {v4 as uuidv4} from 'uuid';
import {filter, first, map, takeUntil} from 'rxjs/operators';
import {HttpEventType} from '@angular/common/http';
import {Share} from '@capacitor/share';
import {Popovers} from '@app/shared/popover/popover.utils';
import {PopoverController, ToastController} from '@ionic/angular';
import {FileTransferService} from '@app/shared/service/file-transfer.service';
import {TranslateService} from '@ngx-translate/core';
import {APP_BASE_HREF} from '@angular/common';
import {SharedElement} from '@app/social/share/shared-page.model';
import {Clipboard, ContextService} from '@app/shared/context.service';
import {hasFlag} from '@app/shared/flags.utils';
import {returnDownBack} from 'ionicons/icons';

export const ReportDataPasteFlags = Object.freeze({
  NONE: 0,
  DATA: 1,
  STATS: 2,
  I18N_CONTEXT: 4,

  // ALL FLAGS
  ALL: (1+2+4),
});


export interface DataEntityReportOptions extends BaseReportOptions{
  pathIdAttribute?: string,
  pathParentIdAttribute?: string,
}

@Directive()
export abstract class AppDataEntityReport<
  T extends DataEntity<T, ID>,
  ID = number,
  S extends IReportStats = IReportStats>
  extends AppBaseReport<T, ID, S>
  implements OnInit, AfterViewInit, OnDestroy {

  protected logPrefix = 'data-entity-report';

  protected readonly accountService: AccountService;
  protected readonly router: Router;
  protected readonly fileTransferService: FileTransferService;
  protected readonly translate: TranslateService;
  protected readonly translateContext: TranslateContextService;
  protected readonly baseHref: string;
  protected readonly context: ContextService;
  protected readonly toastController: ToastController;

  @Input() id: ID;

  protected constructor(
    protected injector: Injector,
    protected dataType: new() => T,
    @Optional() options?: DataEntityReportOptions,
  ) {
    super(injector, options);

    this.router = injector.get(Router);
    this.fileTransferService = injector.get(FileTransferService);
    this.translate = injector.get(TranslateService);
    this.translateContext = injector.get(TranslateContextService);
    this.accountService = injector.get(AccountService);
    this.context = injector.get(ContextService);
    this.toastController = injector.get(ToastController);

    this.baseHref = injector.get(APP_BASE_HREF);

    this.revealOptions = {
      autoInitialize: false,
      disableLayout: this.mobile,
      touch: this.mobile
    }
  }

  async ngOnStart(opts?: any): Promise<T> {
    // If data is not filled by input, fill it with the clipboard
    if (isNotNil(this.context.clipboard))
      this.loadFromClipboard(this.context.clipboard);

    // If data is not filled by the input or by the clipboad , fill it by loading and computing

    if (isNil(this.data))
      if (isNotNil(this.id)) this.data = await this.load(this.id, opts)
      else this.data = await this.loadFromRoute(opts);

    if (isNil(this.stats))
      this.stats = await this.computeStats(this.data, opts);

    // TODO How to setup this
    if (isNotNil(this.i18nContext))
      this.i18nContext.suffix = this.stats.i18nSuffix === 'legacy' ? '' : this.stats.i18nSuffix;

    return this.data;
  };

  protected async loadFromRoute(opts?: any): Promise<T> {
    if (this.debug) console.debug(`[${this.logPrefix}.loadFromRoute]`);
    this.id = this.getIdFromPathIdAttribute(this._pathIdAttribute);
    if (isNil(this.id)) throw new Error(`Cannot load the entity: No id found in the route!`);
    return this.load(this.id, opts);
  }

  protected async load(id: ID, opts?: any): Promise<T> {
    if (this.debug) console.debug(`[${this.logPrefix}.load]`, arguments);
    return  await this.loadData(id, opts);
  }

  // TODO This method sill useful ?
  protected abstract loadData(id: ID, opts?: any): Promise<T>;

  protected abstract computeStats(data: T, opts?: {
    getSubCategory?: Function<any, string>;
    stats?: S; // TODO : Check in which case this may be used
    cache?: boolean;
  }): Promise<S>;

  protected abstract fillParent(data:T);

  protected async loadFromClipboard(clipboard: Clipboard, opts?: any): Promise<void> {
    if (this.debug) console.debug(`[${this.logPrefix}] Loading data from clipboard:`, clipboard);

    if (isNil(this.data) && hasFlag(clipboard.pasteFlags, ReportDataPasteFlags.DATA) && isNotNil(clipboard.data.data))
      this.data = this.dataFromObject(clipboard.data.data);

    if (isNil(this.stats) && hasFlag(clipboard.pasteFlags, ReportDataPasteFlags.STATS) && isNotNil(clipboard.data.stats))
        this.stats = this.statsFromObject(clipboard.data.stats);

    if (isNil(this.i18nContext) && hasFlag(clipboard.pasteFlags, ReportDataPasteFlags.I18N_CONTEXT) && isNotNil(clipboard.data.i18nContext))
      this.i18nContext = clipboard.data.i18nContext;

    // Clean the clipboard
    // TODO How to handle case when when the clip boaard is filled from another source than SharePage
    this.context.clipboard = undefined;
  }

  protected abstract dataFromObject(source:object): T;

  protected abstract statsFromObject(source:any): S;

  protected async showSharePopover(event?: UIEvent) {

    let url;
    try {
      url = await this.uploadReportFile();
    } catch (err) {
      Toasts.show(this.toastController, this.translate, {
        message: err.message,
        type: 'error',
      });
      return;
    }

    // Use Capacitor plugin
    if (this.mobile && this.platform.isCapacitor()) {
      await Share.share({
        title: this.$title.value,
        text: 'Really awesome thing you need to see right meow',
        url,
        dialogTitle: this.translate.instant('COMMON.SHARE.DIALOG_TITLE'),
      });
    }
    else {
      await Popovers.showText(
        this.injector.get(PopoverController),
        event,
        {
          text: url,
          editing: false,
          autofocus: false,
          multiline: false
        }
      )
    }
  }

  protected async uploadReportFile(): Promise<string> {
    // Wait data loaded
    await this.waitIdle({timeout: 5000});

    const filename = this.getExportFileName('json');
    const sharedElement:SharedElement = {
      uuid: '',
      shareLink: '',
      path: this.router.url,
      queryParams: {},
      creationDate: toDateISOString(DateUtils.moment()),
      content: {
        // TODO Type data ?
        data: {
          data: this.dataAsObject(this.data),
          stats: this.statsAsObject(this.stats),
          i18nContext: this.i18nContext,
        },
        pasteFlags: ReportDataPasteFlags.DATA | ReportDataPasteFlags.STATS | ReportDataPasteFlags.I18N_CONTEXT
      }
    }

    const arrayUt8 = decodeUTF8(JSON.stringify(sharedElement));
    const blob = new Blob([arrayUt8], {type: "application/json"});
    blob['lastModifiedDate'] = (new Date()).toISOString();
    blob['name'] = filename;

    const { fileName, message } = await this.fileTransferService.uploadResource(<File>blob, {
      resourceType: 'report',
      resourceId: uuidv4() + '.json',
      reportProgress: false
    }).pipe(
      map(event => {
        if (event.type === HttpEventType.Response) {
          return event.body;
        }
      }),
      filter(body => !!body),
      first(),
      takeUntil(this.destroySubject)
    ).toPromise();

    if (message !== "OK" || !fileName) {
      throw new Error('Failed to upload report data!');
    }

    // TODO handle errors
    await this.fileTransferService.shareAsPublic(fileName).then();

    return `${this.baseHref.replace(/\/$/, '')}/share/${fileName.replace(/\.json$/, '')}`;
  }

  protected dataAsObject(source: T, opts?: EntityAsObjectOptions): any {
    if (typeof source?.asObject === 'function') return source.asObject(opts);
    const data = new this.dataType();
    data.fromObject(source);
    return data.asObject(opts);
  }

  protected abstract statsAsObject(source: S, opts?: EntityAsObjectOptions): any;

  protected getExportEncoding(format = 'json'): string {
    const key = `FILE.${format.toUpperCase()}.ENCODING`;
    const encoding = this.translate.instant(key);
    if (encoding !== key) return encoding;
    return 'UTF-8'; // Default encoding
  }

  protected getExportFileName(format = 'json', params?: any): string {
    const key = `${this.i18nContext.prefix}EXPORT_${format.toUpperCase()}_FILENAME`;
    const filename = this.translateContext.instant(
      key,
      this.i18nContext.suffix,
      params || {title: this.$title.value})
    if (filename !== key) return filename;
    return `export.${format}`; // Default filename
  }

  // protected async exportToJson(event?: Event) {
  //
  //   const filename = this.getExportFileName('json');
  //   const encoding = this.getExportEncoding('json');
  //   const content  = await this.getReportFileContent();
  //   const jsonContent = content.asObject({minify: true});
  //
  //   // Write to file
  //   FilesUtils.writeTextToFile(
  //     JSON.stringify(jsonContent), {
  //       type: 'application/json',
  //       filename,
  //       encoding
  //     }
  //   );
  // }

  // protected async getReportFileContent(): Promise<ReportFileContent> {
  //   // Wait data loaded
  //   await this.waitIdle({timeout: 5000});
  //
  //   const content  = new ReportFileContent();
  //   // content.data = this.data;
  //   content.stats = this.stats;
  //   content.reportUrl = this.router.url;
  //   content.creationDate = DateUtils.moment();
  //   if (this.accountService.isLogin()) {
  //     content.recorderPerson = this.accountService.person;
  //     content.recorderDepartment = this.accountService.department;
  //   }
  //
  //   return content;
  // }
}
