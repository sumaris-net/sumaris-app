import { Directive, Injector, Input } from '@angular/core';
import { CsvUtils, FileEvent, FileResponse, FilesUtils, isNotNil, Property, ShowToastOptions, Toasts } from '@sumaris-net/ngx-components';
import { TranslateService } from '@ngx-translate/core';
import { PopoverController, ToastController } from '@ionic/angular';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { HttpEventType } from '@angular/common/http';

export declare type ReferentialImportPolicy = 'insert-update' | 'insert-only' | 'update-only' | 'delete-only';

@Directive()
export class PropertiesFileService {
  private readonly logPrefix = '[properties-file-service] ';
  private readonly translate: TranslateService;
  private readonly toastController: ToastController;
  private readonly popoverController: PopoverController;

  @Input() i18nColumnPrefix: string;
  @Input() importPolicy: ReferentialImportPolicy = 'insert-update';

  constructor(injector: Injector) {
    this.translate = injector.get(TranslateService);
    this.toastController = injector.get(ToastController);
    this.popoverController = injector.get(PopoverController);
  }

  exportToCsv(data: Property[], opts?: { context?: any }) {
    // Prepare CSV options
    const separator = CsvUtils.getLocalizedSeparator(this.translate);
    const encoding = CsvUtils.getLocalizedEncoding(this.translate);
    const translations = this.translate.instant(
      ['FILE.PROPERTIES.CSV_FILENAME', 'FILE.PROPERTIES.LABEL_HEADER', 'FILE.PROPERTIES.VALUE_HEADER', 'FILE.PROPERTIES.DESCRIPTION_HEADER'],
      opts?.context
    );
    const filename = translations['FILE.PROPERTIES.CSV_FILENAME'];
    const headers = [
      translations['FILE.PROPERTIES.LABEL_HEADER'],
      translations['FILE.PROPERTIES.VALUE_HEADER'],
      translations['FILE.PROPERTIES.DESCRIPTION_HEADER'],
    ];

    // Convert into CSV
    CsvUtils.exportToFile(data, { filename, headers, separator, encoding });
  }

  async uploadPropertiesFromCsv(event?: Event) {
    let properties: Property[];

    try {
      const { data } = await FilesUtils.showUploadPopover(this.popoverController, event, {
        uniqueFile: true,
        fileExtension: '.csv',
        uploadFn: (file) => this.readPropertiesCsvFile(file),
      });

      properties = (data || []).flatMap((file) => file.response?.body || []);
    } catch (err) {
      const message = (err && err.message) || err;
      this.showToast({
        type: 'error',
        message: 'FILE.PROPERTIES.ERROR.IMPORT_ERROR',
        messageParams: { error: message },
        showCloseButton: true,
        duration: -1,
      });
      return;
    }

    return properties;
  }

  protected readPropertiesCsvFile(file: File): Observable<FileEvent<Property[]>> {
    console.info(this.logPrefix + `Reading properties CSV file ${file.name}...`);

    const separator = CsvUtils.getLocalizedSeparator(this.translate);
    const encoding = CsvUtils.getLocalizedEncoding(this.translate);

    return CsvUtils.parseFile(file, { encoding, separator }).pipe(
      map((event) => {
        if (event.type === HttpEventType.UploadProgress) {
          const loaded = Math.round(event.loaded * 0.8);
          return { ...event, loaded };
        } else if (event instanceof FileResponse) {
          const properties = this.parsePropertiesCsvRows(event.body, separator);
          return new FileResponse({ body: properties });
        }
        // Unknown event: skip
        return null;
      }),
      filter(isNotNil)
    );
  }

  protected parsePropertiesCsvRows(rows: string[][], separator: string): Property[] {
    if (!rows || rows.length <= 1) throw { message: 'FILE.CSV.ERROR.EMPTY_FILE' };

    const headerNames = rows.splice(0, 1)[0];
    const total = rows.length;
    console.debug(this.logPrefix + `Reading ${total} properties...`);

    // Check headers
    if (headerNames.length <= 1) {
      const message = this.translate.instant('FILE.CSV.ERROR.NO_HEADER_OR_INVALID_SEPARATOR', {
        separator,
      });
      throw { message };
    }

    // Check column names
    console.debug(this.logPrefix + `Checking headers: ${headerNames.join(',')}`);
    const translations = this.translate.instant([
      'FILE.PROPERTIES.LABEL_HEADER',
      'FILE.PROPERTIES.VALUE_HEADER',
      'FILE.PROPERTIES.DESCRIPTION_HEADER',
    ]);
    const expectedHeaders = [
      translations['FILE.PROPERTIES.LABEL_HEADER'],
      translations['FILE.PROPERTIES.VALUE_HEADER'],
      translations['FILE.PROPERTIES.DESCRIPTION_HEADER'],
    ];
    const unknownHeaders = headerNames.filter((h) => !expectedHeaders.includes(h));
    if (unknownHeaders.length) {
      const message = this.translate.instant('FILE.CSV.ERROR.UNKNOWN_HEADERS', {
        headers: unknownHeaders.join(', '),
      });
      throw { message };
    }

    return rows.map((row: string[]) => {
      return <Property>{
        key: row[0],
        value: row[1],
      };
    });
  }

  protected async showToast(opts: ShowToastOptions) {
    if (!this.toastController) throw new Error("Missing toastController in component's constructor");
    return Toasts.show(this.toastController, this.translate, opts);
  }
}
