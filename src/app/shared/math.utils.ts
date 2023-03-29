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
  static standardDerivation(numbers: number[]): number {
    const avg = this.average(numbers);
    const variance = this.average(numbers.map((x) => (x - avg) ** 2));
    return Math.sqrt(variance);
  }

  /**
   * Calcul l'écart type en pourcentage d'un tableau de nombres
   */
  static standardDerivationPercentage(numbers: number[]): number {
    const avg = this.average(numbers);
    const stdDev = this.standardDerivation(numbers);
    const percentage = (stdDev / avg) * 100;
    return percentage;
  }
}
