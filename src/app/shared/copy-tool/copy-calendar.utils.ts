import { AbstractControl, FormGroup } from '@angular/forms';
import { ActivityMonth } from '@app/activity-calendar/calendar/activity-month.model';
import { ACTIVITY_MONTH_END_COLUMNS, ACTIVITY_MONTH_START_COLUMNS } from '@app/activity-calendar/calendar/calendar.component';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { isNotNil } from '@sumaris-net/ngx-components';
import { spec } from 'node:test/reporters';

export interface CopiedValue {
  value: any;
  type: FocusType;
  focusColumn: string;
  specificColumn?: { name: string; id: string }[];
}

type FocusType = 'PMFM' | 'PROPERTY' | 'SPECIFIC';

export class CopyCalendarUtils {
  static specificCopy(input: string): { name: string; id: string }[] {
    const regex = /([a-zA-Z]+)(\d+)/g;
    let match;
    const result = [];

    while ((match = regex.exec(input)) !== null) {
      const name = match[1];
      const id = +match[2] - 1;
      result.push({ name, id });
    }

    return result;
  }

  static isNumeric(input: string): boolean {
    return /^\d+$/.test(input);
  }

  static getTypeFocus(paramName: string, obj: any): FocusType {
    if (this.isNumeric(paramName)) {
      return 'PMFM';
    } else if (Object.prototype.hasOwnProperty.call(obj, paramName)) {
      return 'PROPERTY';
    } else {
      return 'SPECIFIC';
    }
  }

  static getControlByFocusName(focusColumnName: string, formGroup: FormGroup) {
    const typeFocus = this.getTypeFocus(focusColumnName, formGroup.value);

    if (typeFocus === 'PMFM') {
      return formGroup.get('measurementValues').get(focusColumnName);
    } else if (typeFocus === 'PROPERTY') {
      return formGroup.get(focusColumnName);
    } else {
      const control = formGroup.get('gearUseFeatures');
      const specificCopy = this.specificCopy(focusColumnName);
      const controlGuf = control.get(specificCopy[0].id.toString());
      if (specificCopy.length === 1) {
        return controlGuf.get(specificCopy[0].name);
      } else {
        return controlGuf.get('fishingAreas').get(specificCopy[1].id.toString()).get('location');
      }
    }
  }

  //retourne la liste des pmfm ordonnée
  static getPmfmList(pmfm: IPmfm[]) {
    pmfm.sort((a, b) => a.rankOrder - b.rankOrder);
    const extractedAttributes = pmfm.map((obj) => obj.id.toString());
    return extractedAttributes;
  }
  static getColumnIndex(array: string[], columnName: string): number {
    return array.indexOf(columnName);
  }

  static copyValue(data: ActivityMonth, focusColumn: string): CopiedValue {
    const focusType = this.getTypeFocus(focusColumn, data);
    let copyValue: CopiedValue;

    if (focusType === 'PMFM') {
      copyValue = { value: data?.measurementValues[focusColumn], type: 'PMFM', focusColumn: focusColumn, specificColumn: null };
    } else if (focusType === 'PROPERTY') {
      copyValue = { value: data[focusColumn], type: 'PROPERTY', focusColumn: focusColumn, specificColumn: null };
    } else if (focusType === 'SPECIFIC') {
      const specificColumn = this.specificCopy(focusColumn);
      copyValue = {
        value:
          specificColumn.length === 1 ? data.gearUseFeatures[specificColumn[0].id].metier : data.gearUseFeatures[specificColumn[0].id].fishingAreas,
        type: 'SPECIFIC',
        focusColumn: focusColumn,
        specificColumn: specificColumn,
      };
    } else {
      copyValue = null;
      console.error('Type de focus non reconnu');
    }

    return copyValue;
  }

  static pasteValue(control: AbstractControl, focusType: FocusType, copyvalue: CopiedValue, focusColumnName: string) {
    if (copyvalue.type === focusType) {
      if (copyvalue.focusColumn === focusColumnName) {
        if (copyvalue.type === 'PMFM') {
          control.setValue(copyvalue.value);
        } else if (copyvalue.type === 'PROPERTY') {
          control.setValue(copyvalue.value);
        }
      }

      if (copyvalue.specificColumn && Array.isArray(copyvalue.specificColumn)) {
        if (copyvalue.specificColumn.length === 1) {
          control.setValue(copyvalue.value);
        } else {
          control.setValue(copyvalue.value[copyvalue.specificColumn[1].id.toString()].location);
        }
      }
    }
  }

  static pasteMultiValue(control: AbstractControl, focusType: FocusType, copyvalue: CopiedValue, focusColumnName: string) {
    if (focusType === 'PMFM') {
      control.setValue(copyvalue.value);
    } else if (focusType === 'PROPERTY') {
      control.setValue(copyvalue.value);
    }

    if (copyvalue.specificColumn && Array.isArray(copyvalue.specificColumn)) {
      if (copyvalue.specificColumn.length === 1) {
        control.setValue(copyvalue.value);
      } else {
        control.setValue(copyvalue.value[copyvalue.specificColumn[1].id.toString()].location);
      }
    }
  }

  static getCopyableColumnNames(rowspan: number, pmfmList: string[], columnName: string) {
    let columnsIndexEnd = null;
    const startColumns = ACTIVITY_MONTH_START_COLUMNS.slice(-2); //todo chercher à automatiser
    const columnRowOrder = startColumns.concat(pmfmList).concat(ACTIVITY_MONTH_END_COLUMNS);

    let columnsIndexstart = this.getColumnIndex(columnRowOrder, columnName);
    columnsIndexEnd = columnsIndexstart + rowspan;
    if (rowspan < 0) {
      columnsIndexstart = columnsIndexstart + rowspan + 1;
      columnsIndexEnd = Math.abs(columnsIndexEnd);
      columnsIndexEnd = columnsIndexstart - rowspan;
    }

    return columnRowOrder.slice(columnsIndexstart, columnsIndexEnd);
  }
}
