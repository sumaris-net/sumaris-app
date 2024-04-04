import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { ChangeDetectorRef, Directive, EventEmitter, Injector, Input, Optional, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { RevealComponent } from '@app/shared/report/reveal/reveal.component';
import { environment } from '@environments/environment';
import { TranslateService } from '@ngx-translate/core';
import { AccountService, DateFormatService, DateUtils, firstFalsePromise, isNil, isNilOrBlank, isNotNil, isNotNilOrBlank, isNumber, JsonUtils, LocalSettingsService, MenuService, NetworkService, PlatformService, Toasts, toDateISOString, TranslateContextService, waitForTrue, } from '@sumaris-net/ngx-components';
import { BehaviorSubject, lastValueFrom, Subject } from 'rxjs';
import { ModalController, PopoverController, ToastController } from '@ionic/angular';
import { Share } from '@capacitor/share';
import { Popovers } from '@app/shared/popover/popover.utils';
import { v4 as uuidv4 } from 'uuid';
import { filter, first, map, takeUntil } from 'rxjs/operators';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { FileTransferService } from '@app/shared/service/file-transfer.service';
import { APP_BASE_HREF } from '@angular/common';
import { ContextService } from '@app/shared/context.service';
import { instanceOf } from 'graphql/jsutils/instanceOf';
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
export class BaseReportStats {
    fromObject(source) {
        this.program = Program.fromObject(source.program);
    }
    asObject(opts) {
        var _a;
        return {
            program: (_a = this.program) === null || _a === void 0 ? void 0 : _a.asObject(opts),
        };
    }
}
let AppBaseReport = class AppBaseReport {
    constructor(injector, dataType, statsType, options) {
        var _a;
        this.dataType = dataType;
        this.statsType = statsType;
        this.options = options;
        this._printing = false;
        this.logPrefix = 'base-report';
        this.destroySubject = new Subject();
        this.readySubject = new BehaviorSubject(false);
        this.loadingSubject = new BehaviorSubject(true);
        this._autoLoad = true;
        this._autoLoadDelay = 0;
        this._stats = null;
        this.uuid = null;
        this.onRefresh = new EventEmitter();
        this.i18nContext = null;
        this.$defaultBackHref = new BehaviorSubject('');
        this.$title = new BehaviorSubject('');
        this.showError = true;
        this.showToolbar = true;
        this.debug = !environment.production;
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
        this._pathParentIdAttribute = options === null || options === void 0 ? void 0 : options.pathParentIdAttribute;
        // NOTE: In route.snapshot data is optional. On which case it may be not set ???
        this._pathIdAttribute = ((_a = this.route.snapshot.data) === null || _a === void 0 ? void 0 : _a.pathIdParam) || (options === null || options === void 0 ? void 0 : options.pathIdAttribute) || 'id';
        this.onRefresh
            .pipe(filter(_ => this.loaded))
            .subscribe(() => this.reload({ cache: false }));
        this.debug = !environment.production;
    }
    set stats(value) {
        if (isNil(value))
            return;
        if (instanceOf(value, this.statsType))
            this._stats = value;
        else
            this._stats = this.statsFromObject(value);
    }
    ;
    get stats() {
        return this._stats;
    }
    get embedded() {
        var _a;
        return ((_a = this.reveal) === null || _a === void 0 ? void 0 : _a.embedded) || false;
    }
    get loaded() { return !this.loadingSubject.value; }
    get loading() { return this.loadingSubject.value; }
    get modalName() {
        return this.constructor.name;
    }
    get latLongFormat() {
        var _a;
        return (_a = this.settings) === null || _a === void 0 ? void 0 : _a.latLongFormat;
    }
    get shareUrlBase() {
        var _a;
        let peerUrl = (_a = this.settings.settings) === null || _a === void 0 ? void 0 : _a.peerUrl;
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
    start(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.platform.ready();
            // Disable the menu if user is not authenticated (public shared report)
            const accountService = this.injector.get(AccountService);
            yield accountService.ready();
            if (!accountService.isAuth()) {
                const menu = this.injector.get(MenuService);
                menu.enable(false);
            }
            this.markAsReady();
            try {
                // Load or fill this.data, this.stats and this.i18nContext
                yield this.ngOnStart(opts);
                if (isNilOrBlank(this.uuid))
                    this.$defaultBackHref.next(this.computeDefaultBackHref(this.data, this.stats));
                this.$title.next(yield this.computeTitle(this.data, this.stats));
                this.revealOptions = this.computeSlidesOptions(this.data, this.stats);
                this.markAsLoaded();
                // Update the view: initialise reveal
                yield this.updateView();
            }
            catch (err) {
                console.error(err);
                this.setError(err);
                this.markAsLoaded();
            }
        });
    }
    ;
    reload(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.loaded)
                return; // skip
            this.markAsLoading();
            this.cd.detectChanges();
            setTimeout(() => {
                this.data = undefined;
                this.stats = undefined;
                this.i18nContext = undefined;
                this.start(opts);
            }, 500);
        });
    }
    cancel() {
        if (this.modal) {
            this.modalCtrl.dismiss();
        }
    }
    ngOnStart(opts) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (this.debug) {
                if (isNotNil(this.data))
                    console.debug(`[${this.logPrefix}] data present on starting`, this.data);
                if (isNotNil(this.stats))
                    console.debug(`[${this.logPrefix}] stats present on starting`, this.stats);
                if (isNotNil(this.i18nContext))
                    console.debug(`[${this.logPrefix}] i18nContext present on starting`, this.i18nContext);
            }
            // If data is not filled by input, fill it with the clipboard
            let clipboard;
            if (isNotNil(this.context.clipboard)) {
                clipboard = this.context.clipboard;
            }
            else if (isNotNilOrBlank(this.uuid)) {
                if (this.debug)
                    console.debug(`[${this.logPrefix}] fill clipboard by downloading shared ressource`);
                const http = this.injector.get(HttpClient);
                const peerUrl = this.settings.settings.peerUrl;
                const sharedElement = yield SharedResourceUtils.downloadByUuid(http, peerUrl, this.uuid);
                clipboard = sharedElement.content;
            }
            if (hasFlag(clipboard === null || clipboard === void 0 ? void 0 : clipboard.pasteFlags, ReportDataPasteFlags.DATA) && isNotNil((_a = clipboard === null || clipboard === void 0 ? void 0 : clipboard.data) === null || _a === void 0 ? void 0 : _a.data)) {
                const consumed = yield this.loadFromClipboard(clipboard);
                if (consumed)
                    this.context.resetValue('clipboard');
            }
        });
    }
    loadFromClipboard(clipboard, opts) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (this.debug)
                console.debug(`[${this.logPrefix}] loadFromClipboard`, clipboard);
            let consumed = false;
            if (isNil(this.data) && hasFlag(clipboard.pasteFlags, ReportDataPasteFlags.DATA) && isNotNil(clipboard.data.data)) {
                this.data = this.dataFromObject(clipboard.data.data);
                consumed = true;
                if (this.debug)
                    console.debug(`[${this.logPrefix}] data loaded from clipboard`, this.data);
            }
            if (isNotNil(this.data) && isNil(this.stats) && hasFlag(clipboard.pasteFlags, ReportDataPasteFlags.STATS) && isNotNil(clipboard.data.stats)) {
                this.stats = this.statsFromObject(clipboard.data.stats);
                consumed = true;
                if (this.debug)
                    console.debug(`[${this.logPrefix}] stats loaded from clipboard`, this.stats);
            }
            if (hasFlag(clipboard.pasteFlags, ReportDataPasteFlags.I18N_CONTEXT) && isNotNil(clipboard.data.i18nContext)) {
                this.i18nContext = Object.assign(Object.assign(Object.assign({}, this.i18nContext), clipboard.data.i18nContext), { pmfmPrefix: (_a = this.options) === null || _a === void 0 ? void 0 : _a.i18nPmfmPrefix });
                consumed = true;
                if (this.debug)
                    console.debug(`[${this.logPrefix}] i18nContext loaded from clipboard`, this.i18nContext);
            }
            return consumed;
        });
    }
    computeI18nContext(stats) {
        var _a, _b, _c;
        if (this.debug)
            console.debug(`[${this.logPrefix}] computeI18nContext]`);
        const suffix = isNilOrBlank(this.i18nContextSuffix)
            ? ((_a = stats.program) === null || _a === void 0 ? void 0 : _a.getProperty(ProgramProperties.I18N_SUFFIX)) || ''
            : this.i18nContextSuffix;
        return {
            prefix: ((_b = this.options) === null || _b === void 0 ? void 0 : _b.i18nPrefix) || '',
            suffix: suffix === 'legacy' ? '' : suffix,
            pmfmPrefix: ((_c = this.options) === null || _c === void 0 ? void 0 : _c.i18nPmfmPrefix) || '',
        };
    }
    computePrintHref(data, stats) {
        if (this.uuid)
            return new URL(`${this.baseHref}/${this.computeShareBasePath()}?uuid=${this.uuid}`);
        else
            return new URL(window.location.origin + this.computeDefaultBackHref(data, stats).replace(/\?.*$/, '') + '/report');
    }
    ;
    computeSlidesOptions(data, stats) {
        if (this.debug)
            console.debug(`[${this.logPrefix}] computeSlidesOptions`);
        const mobile = this.settings.mobile;
        return {
            // Custom reveal options
            autoInitialize: false,
            autoPrint: false,
            // Reveal options
            pdfMaxPagesPerSlide: 1,
            disableLayout: mobile,
            touch: mobile,
            printUrl: this.computePrintHref(data, stats)
        };
    }
    getIdFromPathIdAttribute(pathIdAttribute) {
        const route = this.route.snapshot;
        const id = route.params[pathIdAttribute];
        if (isNotNil(id)) {
            if (typeof id === 'string' && isNumber(id)) {
                return (+id);
            }
            return id;
        }
        return undefined;
    }
    updateView() {
        return __awaiter(this, void 0, void 0, function* () {
            this.cd.detectChanges();
            yield firstFalsePromise(this.loadingSubject, { stop: this.destroySubject });
            if (!this.embedded)
                yield this.reveal.initialize();
        });
    }
    markAsReady() {
        if (!this.readySubject.value) {
            this.readySubject.next(true);
        }
    }
    isApp() {
        return this.mobile && this.platform.isApp();
    }
    markForCheck() {
        this.cd.markForCheck();
    }
    markAsLoading(opts = { emitEvent: true }) {
        if (!this.loadingSubject.value) {
            this.loadingSubject.next(true);
            if (opts.emitEvent !== false)
                this.markForCheck();
        }
    }
    markAsLoaded(opts = { emitEvent: true }) {
        if (this.loadingSubject.value) {
            this.loadingSubject.next(false);
            if (opts.emitEvent !== false)
                this.markForCheck();
        }
    }
    waitIdle(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            console.debug(`[${this.constructor.name}]`);
            if (this.loaded)
                return;
            yield firstFalsePromise(this.loadingSubject, Object.assign({ stop: this.destroySubject }, opts));
        });
    }
    ready(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.readySubject.value)
                return;
            yield waitForTrue(this.readySubject, opts);
        });
    }
    setError(err, opts) {
        if (!err) {
            this.error = undefined;
        }
        else if (typeof err === 'string') {
            this.error = err;
        }
        else {
            // NOTE: Case when `|| err` is possible ?
            let userMessage = err.message && this.translate.instant(err.message) || err;
            // NOTE: replace || by && ???
            const detailMessage = (!err.details || typeof (err.message) === 'string')
                ? err.details
                : err.details.message;
            // NOTE: !isNotNilOrBlank ??? (invert the test)
            if (isNotNilOrBlank(detailMessage)) {
                const cssClass = (opts === null || opts === void 0 ? void 0 : opts.detailsCssClass) || 'hidden-xs hidden-sm';
                userMessage += `<br/><small class="${cssClass}" title="${detailMessage}">`;
                userMessage += detailMessage.length < 70
                    ? detailMessage
                    : detailMessage.substring(0, 67) + '...';
                userMessage += '</small>';
            }
            this.error = userMessage;
            if (!opts || opts.emitEvent !== false)
                this.markForCheck();
        }
    }
    dataFromObject(source) {
        if (this.dataType) {
            const data = new this.dataType();
            data.fromObject(source);
            return data;
        }
        return source;
    }
    ;
    statsAsObject(source, opts) {
        return source.asObject(opts);
    }
    statsFromObject(source) {
        const stats = new this.statsType();
        stats.fromObject(source);
        return stats;
    }
    showSharePopover(event) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isNilOrBlank(this.uuid)) {
                try {
                    this.uuid = yield this.uploadReportFile();
                }
                catch (err) {
                    console.error(err);
                    yield Toasts.show(this.toastController, this.translate, {
                        message: err.message,
                        type: 'error',
                    });
                    return;
                }
            }
            const shareUrl = this.shareUrlBase + this.uuid;
            // Use Capacitor plugin
            if (this.isApp()) {
                yield Share.share({
                    dialogTitle: this.translate.instant('COMMON.SHARE.DIALOG_TITLE'),
                    title: this.$title.value,
                    text: this.translate.instant('COMMON.SHARE.LINK'),
                    url: shareUrl
                });
            }
            else {
                yield Popovers.showText(this.injector.get(PopoverController), event, {
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
                            handler: (value) => __awaiter(this, void 0, void 0, function* () {
                                yield CapacitorClipboard.write({
                                    string: value,
                                });
                                yield Toasts.show(this.toastController, this.translate, {
                                    type: 'info', message: 'INFO.COPY_SUCCEED'
                                });
                                return false; // Avoid dismiss
                            })
                        }
                    ]
                }, {
                    backdropDismiss: true
                });
            }
        });
    }
    uploadReportFile() {
        return __awaiter(this, void 0, void 0, function* () {
            // Wait data loaded
            yield this.waitIdle({ timeout: 5000 });
            const uploadFileName = this.getExportFileName('json');
            const sharedElement = {
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
                    pasteFlags: ReportDataPasteFlags.DATA | ReportDataPasteFlags.STATS | ReportDataPasteFlags.I18N_CONTEXT
                }
            };
            const file = JsonUtils.writeToFile(sharedElement, { filename: uploadFileName });
            const { fileName, message } = yield lastValueFrom(this.fileTransferService.uploadResource(file, {
                resourceType: 'report',
                resourceId: sharedElement.uuid + '.json',
                reportProgress: false
            }).pipe(map(event => {
                if (event.type === HttpEventType.Response) {
                    return event.body;
                }
            }), filter(body => !!body), first(), takeUntil(this.destroySubject)));
            if (message !== 'OK' || !fileName) {
                throw new Error('Failed to upload report data!');
            }
            yield this.fileTransferService.shareAsPublic(fileName);
            // return the UUID
            return fileName.replace(/\.json$/, '');
        });
    }
    getExportEncoding(format = 'json') {
        const key = `FILE.${format.toUpperCase()}.ENCODING`;
        const encoding = this.translate.instant(key);
        if (encoding !== key)
            return encoding;
        return 'UTF-8'; // Default encoding
    }
    getExportFileName(format = 'json', params) {
        const key = `${this.i18nContext.prefix}EXPORT_${format.toUpperCase()}_FILENAME`;
        const filename = this.translateContext.instant(key, this.i18nContext.suffix, params || { title: this.$title.value });
        if (filename !== key)
            return filename;
        return `export.${format}`; // Default filename
    }
    isPrintingPDF() {
        if (this._printing)
            return true;
        const query = window.location.search || '?';
        return query.indexOf('print-pdf') !== -1;
    }
    print() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (this._printing)
                return true; // Skip is already printing
            this._printing = true;
            yield this.ready();
            (_a = this.reveal) === null || _a === void 0 ? void 0 : _a.print();
        });
    }
};
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], AppBaseReport.prototype, "mobile", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], AppBaseReport.prototype, "modal", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], AppBaseReport.prototype, "showError", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], AppBaseReport.prototype, "showToolbar", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], AppBaseReport.prototype, "debug", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], AppBaseReport.prototype, "data", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [Object])
], AppBaseReport.prototype, "stats", null);
__decorate([
    Input(),
    __metadata("design:type", String)
], AppBaseReport.prototype, "i18nContextSuffix", void 0);
__decorate([
    ViewChild(RevealComponent, { static: false }),
    __metadata("design:type", RevealComponent)
], AppBaseReport.prototype, "reveal", void 0);
AppBaseReport = __decorate([
    Directive(),
    __param(3, Optional()),
    __metadata("design:paramtypes", [Injector, Function, Function, Object])
], AppBaseReport);
export { AppBaseReport };
//# sourceMappingURL=base-report.class.js.map