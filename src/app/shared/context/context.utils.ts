import { Injectable } from '@angular/core';
export class ContextUtils {
  static readonly TRIP_CONTEXT_NAME = 'tripContext';
  static readonly SALE_CONTEXT_NAME = 'saleContext';
}
export type ContextNameType = typeof ContextUtils.TRIP_CONTEXT_NAME | typeof ContextUtils.SALE_CONTEXT_NAME;
// Test pour modal avec use factory
@Injectable({
  providedIn: 'root',
})
export class ContextUtilsService {
  public LAST_CONTEXT_USE: string = '';

  updateLastContextUse(value: string) {
    this.LAST_CONTEXT_USE = value;
  }
  getLastContextUse() {
    return this.LAST_CONTEXT_USE;
  }
  getContextByUrl(url: any) {
    const urlFormat = url.toLowerCase();
    if (urlFormat.includes('sale')) {
      return ContextUtils.SALE_CONTEXT_NAME;
    } else if (urlFormat.includes('trips')) {
      return ContextUtils.TRIP_CONTEXT_NAME;
    }
  }
}
