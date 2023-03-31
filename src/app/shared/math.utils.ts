import { toNumber } from '@sumaris-net/ngx-components';

export class MathUtils {

  /**
   * Calcul la moyenne d'un tableau de nombres
   */
  static average(numbers: number[]): number {
    const sum = numbers.reduce((a, b) => a + b, 0);
    return sum / numbers.length;
  }

  /**
   * Calcul l'écart type d'un tableau de nombres
   */
  static standardDerivation(numbers: number[], average?: number): number {
    const avg = toNumber(average, this.average(numbers));
    const diffPow2 = numbers.map((x) => (x - avg) ** 2);
    const variance = this.average(diffPow2);
    return Math.sqrt(variance);
  }

  /**
   * Calcul l'écart type en pourcentage d'un tableau de nombres
   */
  static standardDerivationPercentage(numbers: number[], average?: number): number {
    const avg = toNumber(average, this.average(numbers));
    const stdDev = this.standardDerivation(numbers, average);
    const percentage = (stdDev / avg) * 100;
    return percentage;
  }
}
