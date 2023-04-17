import { AfterViewInit, Directive, Injector, Input, OnDestroy, OnInit, Optional } from '@angular/core';
import {AccountService, DateUtils, Department, Entity, EntityAsObjectOptions, FilesUtils, isNil, isNotNil, Person, toDateISOString, TranslateContextService} from '@sumaris-net/ngx-components';
import { DataEntity } from '../services/model/data-entity.model';
import { AppBaseReport, BaseReportOptions } from '@app/data/report/base-report.class';
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
import {Moment} from 'moment/moment';
import {NOT_MINIFY_OPTIONS} from '@app/core/services/model/referential.utils';
import {APP_BASE_HREF} from '@angular/common';

export interface DataEntityReportOptions extends BaseReportOptions{
  pathIdAttribute?: string,
  pathParentIdAttribute?: string,
}

export class ReportFileContent<T extends Entity<T> = Entity<any>, S = any> {
  // File metadata
  reportUrl: string;
  recorderPerson: Person;
  recorderDepartment: Department;
  creationDate: Moment;

  data: T;
  stats: Partial<S>;

  asObject(opts?: EntityAsObjectOptions) {
    const target: any = Object.assign({}, this);
    target.creationDate = toDateISOString(this.creationDate);
    target.recorderPerson = this.recorderPerson && this.recorderPerson.asObject(opts) || null;
    target.recorderDepartment = this.recorderDepartment && this.recorderDepartment.asObject({...opts, ...NOT_MINIFY_OPTIONS}) || null;
    target.data = this.data.asObject(opts);

    // Clean unused properties
    if (opts?.minify) {
      if (target.recorderDepartment) {
        delete target.recorderDepartment.creationDate;
        delete target.recorderDepartment.comments;
      }
    }

    return target;
  }
}

@Directive()
export abstract class AppDataEntityReport<
  T extends DataEntity<T, ID>,
  ID = number,
  S = any>
  extends AppBaseReport<T, S>
  implements OnInit, AfterViewInit, OnDestroy {

  protected readonly accountService: AccountService;
  protected readonly router: Router;
  protected readonly fileTransferService: FileTransferService;
  protected readonly translate: TranslateService;
  protected readonly translateContext: TranslateContextService;
  protected readonly baseHref: string;

  @Input() i18nPmfmPrefix = '';
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
    // TODO Ask if there is not better to handle this on AppBaseReport::start
    this.stats = this.stats
      ? this.stats
      : await this.computeStats(data);
    return data;
  };

  protected abstract load(id: ID, opts?: any): Promise<T>;

  protected async loadFromRoute(opts?: any): Promise<T> {
    console.debug(`[${this.constructor.name}.loadFromRoute]`);
    this.id = this.getIdFromPathIdAttribute(this._pathIdAttribute);

    if (isNil(this.id)) throw new Error(`[loadFromRoute] Cannot load the entity: No id found in the route!`);

    const state = this.router.getCurrentNavigation()?.extras?.state;
    if (state?.data) {
      const source = state?.data;
      const target = new this.dataType();
      target.fromObject(source);
      this.stats = state?.stats as S;
      return target;
    }
    else {
      return this.load(this.id, opts);
    }
  }

  protected abstract computeStats(data: T, opts?: {
    getSubCategory?: Function<any, string>;
    stats?: S;
    cache?: boolean;
  }): Promise<S>;


  protected async exportToJson(event?: Event) {

    const filename = this.getExportFileName('json');
    const encoding = this.getExportEncoding('json');
    const content  = await this.getReportFileContent();
    const jsonContent = content.asObject({minify: true});

    // Write to file
    FilesUtils.writeTextToFile(
      JSON.stringify(jsonContent), {
        type: 'application/json',
        filename,
        encoding
      }
    );
  }

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
    const filename = this.getExportFileName('json');
    const content  = await this.getReportFileContent();
    const json = content.asObject({ minify: true });
    const arrayUt8 = decodeUTF8(JSON.stringify(json));
    //const base64 = encodeBase64(arrayUt8);

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

    const shareUrl = `${this.baseHref.replace(/\/$/, '')}/share/${fileName.replace(/\.json$/, '')}`;
    return { url: shareUrl};
  }

  protected async getReportFileContent(): Promise<ReportFileContent> {
    // Wait data loaded
    await this.waitIdle({timeout: 5000});

    const content  = new ReportFileContent();
    // content.data = this.data;
    content.stats = this.stats;
    content.reportUrl = this.router.url;
    content.creationDate = DateUtils.moment();
    if (this.accountService.isLogin()) {
      content.recorderPerson = this.accountService.person;
      content.recorderDepartment = this.accountService.department;
    }

    return content;
  }

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
