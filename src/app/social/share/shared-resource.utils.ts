import { HttpClient } from '@angular/common/http';
import { SharedElement } from '@app/social/share/shared-page.model';
import { lastValueFrom } from 'rxjs';

export abstract class SharedResourceUtils {
  static async downloadByUuid(http: HttpClient, peerUrl: string, uuid: string, opts?: { param: any }): Promise<SharedElement> {
    console.debug(`Downloading shared resource from ${peerUrl} {${uuid}}...`);

    const url = `${peerUrl.replace(/\/$/, '')}/download/public/${uuid}.json`;
    const res = await lastValueFrom(
      http.get<SharedElement>(url, {
        params: opts?.param ? opts.param : {},
      })
    );

    return {
      uuid: res.uuid,
      shareLink: res.shareLink,
      path: res.path,
      queryParams: res.queryParams,
      creationDate: res.creationDate,
      content: res.content,
    };
  }
}
