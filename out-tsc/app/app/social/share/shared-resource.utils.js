import { __awaiter } from "tslib";
import { lastValueFrom } from 'rxjs';
export class SharedResourceUtils {
    static downloadByUuid(http, peerUrl, uuid, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            console.debug(`Downloading shared resource from ${peerUrl} {${uuid}}...`);
            const url = `${peerUrl.replace(/\/$/, '')}/download/public/${uuid}.json`;
            const res = yield lastValueFrom(http.get(url, {
                params: (opts === null || opts === void 0 ? void 0 : opts.param) ? opts.param : {},
            }));
            return {
                uuid: res.uuid,
                shareLink: res.shareLink,
                path: res.path,
                queryParams: res.queryParams,
                creationDate: res.creationDate,
                content: res.content,
            };
        });
    }
}
//# sourceMappingURL=shared-resource.utils.js.map