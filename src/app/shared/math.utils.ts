import { isNotNilOrNaN, toNumber } from '@sumaris-net/ngx-components';

export interface AverageDetails {
  avg: number;
  stdDev: number;
  stdDevPct: number;
  stdError: number;
  confidenceInterval95: {
    lowerBound: number;
    upperBound: number;
  }
}

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
    const avg = isNotNilOrNaN(average) ? average : this.average(numbers);
    const diffPow2 = numbers.map((x) => (x - avg) ** 2);
    const variance = this.average(diffPow2);
    return Math.sqrt(variance);
  }

  /**
   * Calcul l'écart type en pourcentage d'un tableau de nombres
   */
  static standardDerivationPercentage(numbers: number[], average?: number): number {
    const avg = isNotNilOrNaN(average) ? average : this.average(numbers);
    const stdDev = this.standardDerivation(numbers, average);
    const percentage = (stdDev / avg) * 100;
    return percentage;
  }

  /**
   * Calcul les bornes
   * 95% des éléments de la série statistique sont compris entre (x − 2σ) et (x + 2σ);
   * @param numbers
   * @param average
   * @param standardDerivation
   */
  static confidenceInterval95(numbers: number[], average?: number, standardDerivation?: number): { lowerBound: number; upperBound: number; } {
    const avg = isNotNilOrNaN(average) ? average : this.average(numbers);
    const stdDev = isNotNilOrNaN(standardDerivation) ? standardDerivation : this.standardDerivation(numbers, avg);
    const n = numbers.length;
    const stdError = stdDev / Math.sqrt(n);

    // TODO enable mathjs
    // const t = math.invStudentt(0.975, n - 1);
    // Utilisation d'une approximation pour les degrés de liberté supérieurs à 30
    const t = 1.96;

    const marginOfError = t * stdError;

    const lowerBound = avg - marginOfError;
    const upperBound = avg + marginOfError;

    return {lowerBound, upperBound};
  }

  /**
   * Calcul la moyenne, l'écart type, l'écart type en pourcentage et l'interval de confiance à 95%
   */
  static averageWithDetails(numbers: number[]): AverageDetails {
    const n = numbers.length;
    const avg = this.average(numbers);
    const stdDev = this.standardDerivation(numbers, avg);
    const stdDevPct = (stdDev / avg) * 100;
    const stdError = stdDev /  Math.sqrt(n);
    const confidenceInterval95 = this.confidenceInterval95(numbers, avg, stdDev);
    return { avg, stdDev, stdDevPct, stdError, confidenceInterval95};
  }
}
