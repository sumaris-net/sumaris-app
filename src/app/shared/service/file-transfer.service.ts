import { Injectable } from '@angular/core';
import {AccountService, GraphqlService, isNilOrBlank, isNotNil, isNotNilOrBlank, NetworkService, StartableService, toBoolean} from '@sumaris-net/ngx-components';
import { Observable, of } from 'rxjs';
import { HttpClient, HttpErrorResponse, HttpEvent, HttpHeaders, HttpRequest } from '@angular/common/http';
import { switchMap } from 'rxjs/operators';
import {gql} from '@apollo/client/core';
import {ErrorCodes} from '@app/data/services/errors';

export interface UploadOptions {
  resourceType?: string;
  resourceId?: string;
  replace?: boolean;

  reportProgress?: boolean;
}

export interface UploadResponseBody {
  fileName: string;
  fileType: string;
  fileUri: string;
  message: string;
  size: number;
}

const ShareFileMutation = {
  shareAsPublic: gql`mutation shareFile($fileName:String) {
    data: shareFile(fileName: $fileName)
  }`,
}

@Injectable({ providedIn: 'root' })
export class FileTransferService extends StartableService<void> {

  private readonly connectionParams = {
    authToken: undefined,
    authBasic: undefined
  };

  private get headers(): HttpHeaders {
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

  constructor(private network: NetworkService,
              private accountService: AccountService,
              private http: HttpClient,
              protected graphql: GraphqlService) {
    super(network);
    this.start();
  }

  protected async ngOnStart(opts?: any): Promise<void> {

    this.registerSubscription(
      this.accountService.onAuthTokenChange.subscribe(token => this.connectionParams.authToken = token)
    );
    this.registerSubscription(
      this.accountService.onAuthBasicChange.subscribe(basic => this.connectionParams.authBasic = basic)
    );
  }

  downloadFile(file: string): string {
    return `${this.network.peer.url}/download/${file}`;
  }

  downloadResource(type: string, file: string): string {
    return `${this.network.peer.url}/download/resource/${type}/${file}`;
  }

  uploadResource(file: File, opts?: UploadOptions): Observable<HttpEvent<UploadResponseBody>> {
    if (!this.started) {
      return of(this.ready())
        .pipe(switchMap(_ => this.uploadResource(file, opts)));
    }

    const formData: FormData = new FormData();
    formData.append('file', file);
    if (opts) {
      if (isNotNilOrBlank(opts.resourceType)) formData.append('resourceType', opts.resourceType);
      if (isNotNilOrBlank(opts.resourceId)) formData.append('resourceId', opts.resourceId);
      if (isNotNil(opts.replace)) formData.append('replace', opts.replace ? 'true' : 'false');
    }

    const reportProgress = toBoolean(opts?.reportProgress, true);

    const req = new HttpRequest('POST', `${this.network.peer.url}/upload`, formData, {
      headers: this.headers,
      reportProgress,
      responseType: 'json',
    });

    return this.http.request(req);
  }

  async shareAsPublic(fileName: string) {
    console.info(`[file-transfer-service] share file ${fileName} as public`);
    const sharedFilePath = await this.graphql.mutate<{ data: string }>({
      mutation: ShareFileMutation.shareAsPublic,
      variables: {fileName: fileName},
      error: { code: ErrorCodes.LOAD_ENTITIES_ERROR, message: 'ERROR.LOAD_ENTITIES_ERROR' },
    });
    return sharedFilePath;
  }

  async deleteResource(resourceType: string, filename: string): Promise<boolean> {
    if (isNilOrBlank(resourceType) || isNilOrBlank(filename)) {
      console.error(`[file-transfer-service] resourceType and filename must not be blank`);
      return;
    }
    const formData: FormData = new FormData();
    formData.append('resourceType', resourceType);
    formData.append('filename', filename);

    const req = new HttpRequest('POST', `${this.network.peer.url}/delete`, formData, {
      responseType: 'json',
    });

    try {
      const res = await this.http.request(req).toPromise();
      if (res instanceof HttpErrorResponse) {
        console.error(`[file-transfer-service] Error while deleting resource`, res.message);
        return false;
      }
      return true;
    } catch (err) {
      console.error(`[file-transfer-service] Error while deleting resource`, err);
      return false;
    }
  }


}
