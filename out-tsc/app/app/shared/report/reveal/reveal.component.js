var RevealComponent_1;
import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { ApplicationRef, ChangeDetectionStrategy, ChangeDetectorRef, Component, ContentChildren, Directive, ElementRef, EventEmitter, HostListener, Inject, InjectionToken, Input, Optional, Output, QueryList, SkipSelf, TemplateRef, ViewChild, ViewContainerRef, ViewEncapsulation, ViewRef, } from '@angular/core';
import { sleep, Toasts, waitForFalse } from '@sumaris-net/ngx-components';
import { Reveal, RevealMarkdown } from './reveal.utils';
import { BehaviorSubject, lastValueFrom, Subscription } from 'rxjs';
import { DOCUMENT } from '@angular/common';
import { ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
export const REVEAL_COMPONENT = new InjectionToken('REVEAL_COMPONENT');
let RevealSectionOutlet = class RevealSectionOutlet {
    constructor(viewContainer, elementRef) {
        this.viewContainer = viewContainer;
        this.elementRef = elementRef;
    }
};
RevealSectionOutlet = __decorate([
    Directive({ selector: '[sectionOutlet]' }),
    __metadata("design:paramtypes", [ViewContainerRef, ElementRef])
], RevealSectionOutlet);
export { RevealSectionOutlet };
let RevealSectionDef = class RevealSectionDef {
    constructor(template) {
        this.template = template;
    }
};
RevealSectionDef = __decorate([
    Directive({
        selector: '[sectionDef]'
    }),
    __metadata("design:paramtypes", [TemplateRef])
], RevealSectionDef);
export { RevealSectionDef };
let RevealComponent = RevealComponent_1 = class RevealComponent {
    constructor(appRef, viewRef, _document, toastController, cd, translate, parent) {
        this.appRef = appRef;
        this.viewRef = viewRef;
        this._document = _document;
        this.toastController = toastController;
        this.cd = cd;
        this.translate = translate;
        this._embedded = false;
        this.loadingSubject = new BehaviorSubject(true);
        this._subscription = new Subscription();
        this._printing = false;
        this._registeredSections = [];
        this.autoPrint = true;
        this.ready = new EventEmitter();
        this.slideChanged = new EventEmitter();
        this._parent = parent !== this ? parent : undefined;
        this._embedded = !!this._parent;
        if (this.isPrintingPDF()) {
            this.configurePrintPdfCss();
        }
    }
    get loading() {
        return this.loadingSubject.value;
    }
    get loaded() {
        return !this.loadingSubject.value;
    }
    get embedded() {
        return this._embedded;
    }
    set embedded(value) {
        this._embedded = value;
    }
    get printing() {
        return this._printing;
    }
    onResize(event) {
        var _a;
        (_a = this._reveal) === null || _a === void 0 ? void 0 : _a.layout();
    }
    onbeforeprint(event) {
        console.debug('[reveal] Received before print event');
        if (!this.isPrintingPDF()) {
            //event?.preventDefault();
            this.print();
        }
    }
    onafterprint(event) {
        if (this.isPrintingPDF()) {
            window.close();
        }
    }
    ngAfterViewInit() {
        // Root component
        if (!this._embedded) {
            if (this.options && this.options.autoInitialize !== false) {
                setTimeout(() => this.initialize(), 100);
            }
            if (this.isPrintingPDF() && this.options.autoPrint !== false) {
                this.waitIdle()
                    .then(() => this.print());
            }
        }
        // Embedded component
        else {
            this._sectionDefs.forEach(section => {
                this._parent.registerSection(section);
            });
        }
        console.log('[reveal] ngAfterViewInit finished');
    }
    ngOnDestroy() {
        this._subscription.unsubscribe();
    }
    registerSection(section) {
        if (!this._embedded) {
            const exists = this._sectionDefs.some(s => s === section)
                || this._registeredSections.includes(section);
            if (exists)
                return; // Skip if already registered (e.g. see testing embedded page)
            console.debug(`[reveal] registerSection`, section);
            this._registeredSections.push(section);
        }
        else {
            this._parent.registerSection(section);
        }
    }
    moveToBody() {
        console.debug(`[reveal] Moving <div class="reveal"> into <body> ...`);
        this.viewRef.detach();
        this.appRef.attachView(this.viewRef);
        const domElement = this.viewRef
            .rootNodes[0];
        this._document.body.appendChild(domElement);
    }
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            const now = Date.now();
            console.debug(`[reveal] Initialize Reveal.js ... {printing: ${this._printing}}`);
            yield this.renderSections();
            // wait markdown rendered
            yield Promise.all(this.markdownList
                .map(md => lastValueFrom(md.ready)));
            // Move content to body
            if (this.isPrintingPDF()) {
                this.moveToBody();
            }
            // Full list of configuration options available here:
            // https://github.com/hakimel/reveal.js#configuration
            this._reveal = new Reveal(this._revealDiv.nativeElement, Object.assign(Object.assign({ controls: true, progress: true, history: true, center: true, mouseWheel: true, slideNumber: false, keyboard: true, fragments: true, controlsBackArrows: 'faded', hideInactiveCursor: true, touch: true }, this.options), { embedded: !this._printing, keyboardCondition: 'focused', plugins: [RevealMarkdown] }));
            yield this._reveal.initialize();
            console.info(`[reveal] Reveal initialized in ${Date.now() - now}ms`);
            this.ready.emit();
            this.markAsLoaded();
            this._reveal.on('slidechanged', (event) => {
                this.slideChanged.emit(event);
            });
            this._subscription.add(() => {
                this._reveal.destroy();
                this._revealDiv.nativeElement.innerHTML = '';
            });
        });
    }
    renderSections() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.embedded)
                return; // Skip
            const viewContainer = this._sectionOutlet.viewContainer;
            let indexSection = 0;
            this._sectionDefs.forEach((section, index) => viewContainer.createEmbeddedView(section.template, {}, indexSection++));
            this._registeredSections.forEach((section, index) => viewContainer.createEmbeddedView(section.template, {}, indexSection++));
            this.cd.detectChanges();
        });
    }
    configure(options) {
        var _a;
        (_a = this._reveal) === null || _a === void 0 ? void 0 : _a.configure(options);
    }
    layout() {
        this._reveal.layout();
    }
    sync() {
        this._reveal.sync();
    }
    navigatePrev() {
        this._reveal.navigatePrev();
    }
    toggleHelp() {
        this._reveal.toggleHelp();
    }
    print(event) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.loading)
                return; // skip
            console.debug('[reveal] Print...');
            if (this.isPrintingPDF()) {
                yield this.waitIdle();
                yield sleep(1000); // Wait end of render
                window.print();
            }
            else {
                // Create a iframe with '?print-pdf'
                const printUrl = this.getPrintPdfUrl();
                this.markAsLoading();
                try {
                    // Already exists: use it
                    if (this._printIframe) {
                        this._printIframe.contentWindow.window.print();
                    }
                    else {
                        this.showToast({ message: 'COMMON.PLEASE_WAIT' });
                        this._printIframe = this.createPrintHiddenIframe(printUrl);
                        // Remember to destroy the iframe, on destroy
                        const removeIframe = () => {
                            var _a;
                            (_a = this._printIframe) === null || _a === void 0 ? void 0 : _a.remove();
                            this._printIframe = null;
                        };
                        // destroy after 1min
                        setTimeout(removeIframe, 60000);
                        // destroy when destroy
                        this._subscription.add(removeIframe);
                    }
                }
                catch (err) {
                    console.error('[reveal] Failed to create hidden iframe. Will opening a new window');
                }
                finally {
                    this.markAsLoaded();
                }
            }
        });
    }
    waitIdle(opts) {
        return waitForFalse(this.loadingSubject, opts);
    }
    markAsLoading() {
        this.loadingSubject.next(true);
    }
    markAsLoaded() {
        this.loadingSubject.next(false);
    }
    createPrintHiddenIframe(url) {
        // Create a iframe with '?print-pdf'
        const iframe = this._document.createElement('iframe');
        iframe.classList.add('cdk-visually-hidden');
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        this._document.body.appendChild(iframe);
        iframe.src = url;
        return iframe;
    }
    getPrintPdfUrl() {
        const printUrl = this.options.printUrl || new URL(window.location.href);
        if (!printUrl.searchParams.has('print-pdf')) {
            printUrl.searchParams.append('print-pdf', '1');
        }
        return printUrl.href;
    }
    isPrintingPDF() {
        if (this._printing)
            return true;
        const query = window.location.search || '?';
        return query.indexOf('print-pdf') !== -1;
    }
    configurePrintPdfCss() {
        this._printing = true;
        const html = this._document.getElementsByTagName('html')[0];
        html.classList.add('print-pdf');
    }
    showToast(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.toastController)
                throw new Error('Missing toastController in component\'s constructor');
            return yield Toasts.show(this.toastController, this.translate, opts);
        });
    }
};
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], RevealComponent.prototype, "embedded", null);
__decorate([
    Input(),
    __metadata("design:type", Object)
], RevealComponent.prototype, "options", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], RevealComponent.prototype, "autoPrint", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], RevealComponent.prototype, "ready", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], RevealComponent.prototype, "slideChanged", void 0);
__decorate([
    ViewChild('main'),
    __metadata("design:type", ElementRef)
], RevealComponent.prototype, "_revealDiv", void 0);
__decorate([
    ViewChild(RevealSectionOutlet, { static: true }),
    __metadata("design:type", RevealSectionOutlet)
], RevealComponent.prototype, "_sectionOutlet", void 0);
__decorate([
    ContentChildren(RevealSectionDef, { descendants: true }),
    __metadata("design:type", QueryList)
], RevealComponent.prototype, "_sectionDefs", void 0);
__decorate([
    ContentChildren('[markdown]'),
    __metadata("design:type", QueryList)
], RevealComponent.prototype, "markdownList", void 0);
__decorate([
    HostListener('window:resize', ['$event']),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RevealComponent.prototype, "onResize", null);
__decorate([
    HostListener('window:beforeprint'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Event]),
    __metadata("design:returntype", void 0)
], RevealComponent.prototype, "onbeforeprint", null);
__decorate([
    HostListener('window:afterprint'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Event]),
    __metadata("design:returntype", void 0)
], RevealComponent.prototype, "onafterprint", null);
RevealComponent = RevealComponent_1 = __decorate([
    Component({
        selector: 'app-reveal',
        templateUrl: './reveal.component.html',
        styleUrls: ['./reveal.component.scss'],
        providers: [
            //{provide: RevealComponent, useExisting: RevealComponent},
            { provide: REVEAL_COMPONENT, useExisting: RevealComponent_1 }
        ],
        encapsulation: ViewEncapsulation.None,
        changeDetection: ChangeDetectionStrategy.Default
    }),
    __param(1, Inject(ChangeDetectorRef)),
    __param(2, Inject(DOCUMENT)),
    __param(6, SkipSelf()),
    __param(6, Optional()),
    __param(6, Inject(REVEAL_COMPONENT)),
    __metadata("design:paramtypes", [ApplicationRef,
        ViewRef,
        Document,
        ToastController,
        ChangeDetectorRef,
        TranslateService,
        RevealComponent])
], RevealComponent);
export { RevealComponent };
//# sourceMappingURL=reveal.component.js.map