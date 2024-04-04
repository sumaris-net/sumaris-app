import { __awaiter, __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { AccountService, GraphqlService, isNilOrBlank, isNotNil, isNotNilOrBlank, NetworkService, ServerErrorCodes, StartableService, toBoolean } from '@sumaris-net/ngx-components';
import { of } from 'rxjs';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpRequest } from '@angular/common/http';
import { switchMap } from 'rxjs/operators';
import { gql } from '@apollo/client/core';
const ShareFileMutation = {
    shareAsPublic: gql `mutation shareFile($fileName:String) {
    data: shareFile(fileName: $fileName)
  }`,
};
let FileTransferService = class FileTransferService extends StartableService {
    constructor(network, accountService, http, graphql) {
        super(network);
        this.network = network;
        this.accountService = accountService;
        this.http = http;
        this.graphql = graphql;
        this.connectionParams = {
            authToken: undefined,
            authBasic: undefined
        };
        this.start();
    }
    get headers() {
        const authorization = [];
        if (this.connectionParams.authToken) {
            authorization.push(`token ${this.connectionParams.authToken}`);
        }
        if (this.connectionParams.authBasic) {
            authorization.push(`Basic ${this.connectionParams.authBasic}`);
        }
        return new HttpHeaders()
            .append('Authorization', authorization);
    }
    ngOnStart(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            this.registerSubscription(this.accountService.onAuthTokenChange.subscribe(token => this.connectionParams.authToken = token));
            this.registerSubscription(this.accountService.onAuthBasicChange.subscribe(basic => this.connectionParams.authBasic = basic));
        });
    }
    downloadFile(file) {
        return `${this.network.peer.url}/download/${file}`;
    }
    downloadResource(type, file) {
        return `${this.network.peer.url}/download/resource/${type}/${file}`;
    }
    uploadResource(file, opts) {
        if (!this.started) {
            return of(this.ready())
                .pipe(switchMap(_ => this.uploadResource(file, opts)));
        }
        const formData = new FormData();
        formData.append('file', file);
        if (opts) {
            if (isNotNilOrBlank(opts.resourceType))
                formData.append('resourceType', opts.resourceType);
            if (isNotNilOrBlank(opts.resourceId))
                formData.append('resourceId', opts.resourceId);
            if (isNotNil(opts.replace))
                formData.append('replace', opts.replace ? 'true' : 'false');
        }
        const reportProgress = toBoolean(opts === null || opts === void 0 ? void 0 : opts.reportProgress, true);
        const req = new HttpRequest('POST', `${this.network.peer.url}/upload`, formData, {
            headers: this.headers,
            reportProgress,
            responseType: 'json',
        });
        return this.http.request(req);
    }
    shareAsPublic(fileName) {
        return __awaiter(this, void 0, void 0, function* () {
            console.info(`[file-transfer-service] share file ${fileName} as public`);
            return yield this.graphql.mutate({
                mutation: ShareFileMutation.shareAsPublic,
                variables: { fileName },
                error: { code: ServerErrorCodes.INTERNAL_SERVER_ERROR, message: 'ERROR.SHARE_AS_PUBLIC_FAIL' },
            });
        });
    }
    deleteResource(resourceType, filename) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isNilOrBlank(resourceType) || isNilOrBlank(filename)) {
                console.error(`[file-transfer-service] resourceType and filename must not be blank`);
                return;
            }
            const formData = new FormData();
            formData.append('resourceType', resourceType);
            formData.append('filename', filename);
            const req = new HttpRequest('POST', `${this.network.peer.url}/delete`, formData, {
                responseType: 'json',
            });
            try {
                const res = yield this.http.request(req).toPromise();
                if (res instanceof HttpErrorResponse) {
                    console.error(`[file-transfer-service] Error while deleting resource`, res.message);
                    return false;
                }
                return true;
            }
            catch (err) {
                console.error(`[file-transfer-service] Error while deleting resource`, err);
                return false;
            }
        });
    }
};
FileTransferService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [NetworkService,
        AccountService,
        HttpClient,
        GraphqlService])
], FileTransferService);
export { FileTransferService };
//# sourceMappingURL=file-transfer.service.js.map