import { MethodIds } from '@app/referential/services/model/model.enum';

export class MethodUtils {
  public static isMeasured(methodId: number) {
    return methodId === MethodIds.MEASURED_BY_OBSERVER;
  }

  public static isComputed(methodId: number) {
    return (
      methodId === MethodIds.CALCULATED || methodId === MethodIds.CALCULATED_WEIGHT_LENGTH || methodId === MethodIds.CALCULATED_WEIGHT_LENGTH_SUM
    );
  }

  public static isEstimated(methodId: number) {
    return methodId === MethodIds.ESTIMATED_BY_OBSERVER;
  }
}
