import { PmfmIds } from '@app/referential/services/model/model.enum';
import { isNotNil, isNumber, toBoolean } from '@sumaris-net/ngx-components';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { Sample } from '@app/trip/sample/sample.model';
import { AppColors } from '@app/shared/colors.utils';

export class AuctionControlUtils {
  static getPmfmValueColor(pmfmValue: any, pmfm: IPmfm, data: Sample): AppColors {
    switch (pmfm.id) {
      case PmfmIds.OUT_OF_SIZE_PCT:
        if (isNotNil(pmfmValue)) {
          if (+pmfmValue >= 15) return 'danger';
          if (+pmfmValue >= 10) return 'warning900';
          if (+pmfmValue >= 5) return 'warning';
          return 'success';
        }
        break;

      case PmfmIds.COMPLIANT_PRODUCT:
        if (toBoolean(pmfmValue) === false) {
          return 'danger';
        } else {
          return 'success';
        }

      case PmfmIds.INDIVIDUALS_DENSITY_PER_KG: {
        const auctionDensityCategory = data.measurementValues[PmfmIds.AUCTION_DENSITY_CATEGORY]?.label;

        if (isNotNil(pmfmValue) && auctionDensityCategory) {
          const [min, max] = auctionDensityCategory.split(/[\\/|-]/, 2);
          if (isNumber(min) && isNumber(max)) {
            // Must be greater than the min and strictly lesser than the max
            if (pmfmValue < min || pmfmValue >= max) {
              return 'danger';
            } else {
              return 'success';
            }
          }
        }
        break;
      }
    }

    return null;
  }
}
