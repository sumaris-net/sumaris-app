import {Clipboard} from '@app/shared/context.service';

export interface SharedElement {
  uuid: string;
  shareLink: string;
  path: string;
  queryParams?: { [key: string]: any };
  creationDate: string;

  content: Clipboard;

}
