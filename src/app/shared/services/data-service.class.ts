import {Observable} from "rxjs";

export declare interface LoadResult<T> {
  data: T[];
  total?: number
}
export declare interface DataService<T, F> {

  loadAll(
    offset: number,
    size: number,
    sortBy?: string,
    sortDirection?: string,
    filter?: F,
    options?: any
  ): Observable<LoadResult<T>>;

  saveAll(data: T[], options?: any): Promise<T[]>;

  deleteAll(data: T[], options?: any): Promise<any>;
}

