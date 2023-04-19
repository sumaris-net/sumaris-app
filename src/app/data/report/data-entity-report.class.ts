import {AfterViewInit, Directive, Injector, Input, OnDestroy, OnInit, Optional} from '@angular/core';
import {AccountService, DateUtils, EntityAsObjectOptions, isNil, isNotNil, toDateISOString, TranslateContextService} from '@sumaris-net/ngx-components';
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
import {PopoverController} from '@ionic/angular';
import {FileTransferService} from '@app/shared/service/file-transfer.service';
import {TranslateService} from '@ngx-translate/core';
import {APP_BASE_HREF} from '@angular/common';
import {SharedElement} from '@app/social/share/shared-page.model';
import {Clipboard, ContextService} from '@app/shared/context.service';
import {hasFlag} from '@app/shared/flags.utils';

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

    this.baseHref = injector.get(APP_BASE_HREF);

    this.revealOptions = {
      autoInitialize: false,
      disableLayout: this.mobile,
      touch: this.mobile
    }
  }

  async ngOnStart(opts?: any): Promise<T> {
    const data = isNotNil(this.data)
      ? this.data
      : isNotNil(this.id)
        ? await this.load(this.id, opts)
        : await this.loadFromRoute(opts);

    return data;
  };

  protected async loadFromRoute(opts?: any): Promise<T> {
    console.debug(`[${this.constructor.name}.loadFromRoute]`);
    this.id = this.getIdFromPathIdAttribute(this._pathIdAttribute);

    if (isNil(this.id)) throw new Error(`Cannot load the entity: No id found in the route!`);

    const clipboard = this.context.clipboard;
    if (clipboard?.data && hasFlag(clipboard.pasteFlags, ReportDataPasteFlags.DATA)) {
      return this.loadFromClipboard(clipboard);
    } else {
      return this.load(this.id, opts);
    }
  }

  protected async load(id: ID, opts?: any): Promise<T> {
    if (this.debug) console.debug(`[${this.logPrefix}.load]`, arguments);

    // Load data
    const data = await this.loadData(id, opts);

    // Compute stats
    this.stats = await this.computeStats(data, opts);

    return data;
  }

  protected abstract loadData(id: ID, opts?: any): Promise<T>;

  protected abstract computeStats(data: T, opts?: {
    getSubCategory?: Function<any, string>;
    stats?: S;
    cache?: boolean;
  }): Promise<S>;

  protected async loadFromClipboard(clipboard: Clipboard, opts?: any): Promise<T> {
    if (this.debug) console.debug(`[data-entity-report] Loading data from clipboard:`, clipboard);

    const source = clipboard.data.data;
    const target = new this.dataType();
    target.fromObject(source);
    if (hasFlag(clipboard.pasteFlags, ReportDataPasteFlags.STATS)) {
      this.stats = clipboard.data.stats as S;
    }
    if (hasFlag(clipboard.pasteFlags, ReportDataPasteFlags.I18N_CONTEXT)) {
      this.i18nContext = clipboard.data.i18nContext;
    }
    return target;
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

  protected async showSharePopover(event?: UIEvent) {

    const {url} = await this.uploadReportFile();

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

  protected async uploadReportFile(): Promise<{url: string}> {
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
        data: {
          data: this.asObject(this.data),
          // TODO
          // stats: this.asStatsObject(this.stats),
        },
        pasteFlags: ReportDataPasteFlags.DATA | ReportDataPasteFlags.STATS
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
      console.error('Failed to upload report data!');
      // TODO throw error ?
      return;
    }

    // TODO handle errors
    const shareResult = this.fileTransferService.shareAsPublic(fileName)

    const shareUrl = `${this.baseHref.replace(/\/$/, '')}/share/${fileName.replace(/\.json$/, '')}`;
    return { url: shareUrl};
  }

  protected asObject(source: T, opts?: EntityAsObjectOptions): any {
    if (typeof source?.asObject === 'function') {
      return source.asObject(opts);
    }
    const data = new this.dataType();
    data.fromObject(source);
    return data.asObject(opts);
  }

  // protected asStatsObject(source: S, opts?: EntityAsObjectOptions): any {
  //   if (typeof source?.asObject === 'function') {
  //     return source.asObject(opts);
  //   }
  //   const stats = new this.statsType();
  //   stats.fromObject(source);
  //   return stats.asObject(opts);
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

}
