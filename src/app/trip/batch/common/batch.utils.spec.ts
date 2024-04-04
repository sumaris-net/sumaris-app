import { Batch } from '@app/trip/batch/common/batch.model';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';

describe('BatchUtils', () => {
  describe('computeRankOrder', () => {
    /**
     * Assuming a Batch structure like:
     * - Batch (Label: 'Sample Label')
     *   - Batch (Individual)
     *   - Batch (Sampling)
     *   - Batch (Sorting)
     */

    let idCounter = 0;

    // Prepare necessary Batch mocks for individual, sampling, and sorting batches
    const catchBatch = Batch.fromObject({
      id: idCounter++,
      rankOrder: 1,
      label: `${AcquisitionLevelCodes.CATCH_BATCH}`,
    });
    const speciesBatch = Batch.fromObject({
      id: idCounter++,
      rankOrder: 1,
      label: `${AcquisitionLevelCodes.SORTING_BATCH}#0`,
    });

    // Prepare necessary Batch mocks for individual, sampling, and sorting batches
    const landingBatch = Batch.fromObject({
      id: 10 + idCounter++,
      rankOrder: 1,
      label: `${speciesBatch.label}.LAN`,
    });
    const landingSamplingBatch = Batch.fromObject({
      id: 10 + idCounter++,
      rankOrder: 1,
      label: `${landingBatch.label}${Batch.SAMPLING_BATCH_SUFFIX}`,
    });
    const individualBatch = Batch.fromObject({
      id: idCounter++,
      rankOrder: 1,
      label: `${AcquisitionLevelCodes.SORTING_BATCH_INDIVIDUAL}#0`,
    });

    const discardBatch = Batch.fromObject({
      id: idCounter++,
      rankOrder: 2,
      label: `${speciesBatch.label}.DIS`,
    });
    const discardSamplingBatch = Batch.fromObject({
      id: idCounter++,
      rankOrder: 1,
      label: `${discardBatch.label}${Batch.SAMPLING_BATCH_SUFFIX}`,
    });
    const individualBatch2 = individualBatch.clone();

    // Prepare source Batch with child Batches
    catchBatch.children = [speciesBatch];
    speciesBatch.children = [landingBatch, discardBatch];
    landingBatch.children = [landingSamplingBatch];
    landingSamplingBatch.children = [individualBatch];

    discardBatch.children = [discardSamplingBatch];
    discardSamplingBatch.children = [individualBatch2];

    // Call computeRankOrder
    BatchUtils.computeRankOrder(catchBatch);

    it('should correctly compute the rank order of children batches', () => {
      // Asserts for landing sorting batch
      expect(landingBatch.rankOrder).toBe(1);
      expect(landingBatch.label).toBe(`${speciesBatch.label}.LAN`); // unchanged original label

      // Asserts for landing sampling batch
      expect(landingSamplingBatch.rankOrder).toBe(1);
      expect(landingSamplingBatch.label).toBe(landingBatch.label + Batch.SAMPLING_BATCH_SUFFIX);

      // Asserts for discard sorting batch
      expect(discardBatch.rankOrder).toBe(2);
      expect(discardBatch.label).toBe(`${speciesBatch.label}.DIS`); // unchanged original label

      // Asserts for discard sampling batch
      expect(discardSamplingBatch.rankOrder).toBe(1);
      expect(discardSamplingBatch.label).toBe(discardBatch.label + Batch.SAMPLING_BATCH_SUFFIX);
    });

    it('should have rankOrder and label for individual batches', () => {
      // Asserts for individual batch (landing)
      expect(individualBatch.rankOrder).toBe(1);
      expect(individualBatch.label).toBe(`${AcquisitionLevelCodes.SORTING_BATCH_INDIVIDUAL}#${individualBatch.rankOrder}`);

      // Asserts for individual batch 2 (discard)
      expect(individualBatch2.rankOrder).toBe(2);
      expect(individualBatch2.label).toBe(`${AcquisitionLevelCodes.SORTING_BATCH_INDIVIDUAL}#${individualBatch2.rankOrder}`);
    });
  });
});
