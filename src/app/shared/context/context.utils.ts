export class ContextUtils {
  static readonly TRIP_CONTEXT_NAME = 'tripContext';
  static readonly SALE_CONTEXT_NAME = 'saleContext';
}

export type ContextName = typeof ContextUtils.TRIP_CONTEXT_NAME | typeof ContextUtils.SALE_CONTEXT_NAME;
