import {HttpClient} from '@angular/common/http';
import {SharedElement} from '@app/social/share/shared-page.model';
import {lastValueFrom} from 'rxjs';

export async function downloadSharedRessource(http:HttpClient, peerUrl:string, uuid:string, opts?:{param:any}): Promise<SharedElement> {
  console.debug(`Downloading shared ressource from ${peerUrl} {${uuid}}...`);

  const fileName = `${uuid}.json`;

  const res = await lastValueFrom(http.get<SharedElement>(
    `${peerUrl}/download/public/${fileName}`,
    {
      params: opts?.param ? opts.param : {},
    }
  ));

  return {
    uuid: res.uuid,
    shareLink: res.shareLink,
    path: res.path,
    queryParams: res.queryParams,
    creationDate: res.creationDate,
    content: res.content,
  };
}
