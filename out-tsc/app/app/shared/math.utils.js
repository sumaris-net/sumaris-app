import { isNotNilOrNaN } from '@sumaris-net/ngx-components';
import { Decimal } from 'decimal.js';
export class MathUtils {
    /**
     * Calcul la moyenne d'un tableau de nombres
     */
    static average(numbers) {
        const sum = numbers.reduce((a, b) => a + b, 0);
        return sum / numbers.length;
    }
    /**
     * Calcul l'écart type d'un tableau de nombres
     */
    static standardDerivation(numbers, average) {
        const avg = isNotNilOrNaN(average) ? average : this.average(numbers);
        const diffPow2 = numbers.map((x) => Math.pow((x - avg), 2));
        const variance = this.average(diffPow2);
        return Math.sqrt(variance);
    }
    /**
     * Calcul l'écart type en pourcentage d'un tableau de nombres
     */
    static standardDerivationPercentage(numbers, average) {
        const avg = isNotNilOrNaN(average) ? average : this.average(numbers);
        const stdDev = this.standardDerivation(numbers, average);
        const percentage = (stdDev / avg) * 100;
        return percentage;
    }
    /**
     * Calcul les bornes
     * 95% des éléments de la série statistique sont compris entre (x − 2σ) et (x + 2σ);
     *
     * @param numbers
     * @param average
     * @param standardDerivation
     */
    static confidenceInterval95(numbers, average, standardDerivation) {
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
        return { lowerBound, upperBound };
    }
    /**
     * Calcul la moyenne, l'écart type, l'écart type en pourcentage et l'interval de confiance à 95%
     */
    static averageWithDetails(numbers) {
        const n = numbers.length;
        const avg = this.average(numbers);
        const stdDev = this.standardDerivation(numbers, avg);
        const stdDevPct = (stdDev / avg) * 100;
        const stdError = stdDev / Math.sqrt(n);
        const confidenceInterval95 = this.confidenceInterval95(numbers, avg, stdDev);
        return { avg, stdDev, stdDevPct, stdError, confidenceInterval95 };
    }
    /**
     * Allow to multiply to number, without floating point error (.e.g 1.00055 * 1000 = 1000.55)
     */
    static multiply(a, b) {
        const result = new Decimal(a).times(new Decimal(b));
        return result.toNumber();
    }
}
//# sourceMappingURL=math.utils.js.map