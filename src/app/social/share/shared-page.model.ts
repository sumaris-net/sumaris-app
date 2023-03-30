export interface SharedElement {
  uuid: string;
  shareLink: string;
  path: string;
  pathParams?: { [key: string]: any };
  queryParams?: { [key: string]: any };
}
