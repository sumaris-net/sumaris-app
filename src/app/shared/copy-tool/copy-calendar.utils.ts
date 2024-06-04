import { AbstractControl, FormGroup } from '@angular/forms';
import { ActivityMonth } from '@app/activity-calendar/calendar/activity-month.model';
import { ACTIVITY_MONTH_END_COLUMNS, ACTIVITY_MONTH_START_COLUMNS } from '@app/activity-calendar/calendar/calendar.component';
import { isNotNil } from '@sumaris-net/ngx-components';
import { spec } from 'node:test/reporters';

export interface ValueCopied {
  value: any;
  type: string;
  focusColumn: string;
  specificColumn?: { name: string; id: string }[];
}

type pmfmType = 'PMFM';
type propertyType = 'PROPERTY';
type specificType = 'SPECIFIC';

const PMFM: pmfmType = 'PMFM';
const PROPERTY: propertyType = 'PROPERTY';
const SPECIFIC: specificType = 'SPECIFIC';

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

  static getTypeFocus(paramName: string, obj: any): pmfmType | propertyType | specificType {
    if (this.isNumeric(paramName)) {
      return PMFM;
    } else if (Object.prototype.hasOwnProperty.call(obj, paramName)) {
      return PROPERTY;
    } else {
      return SPECIFIC;
    }
  }

  static getControlByFocusName(focusColumnName: string, formGroup: FormGroup) {
    const typeFocus = this.getTypeFocus(focusColumnName, formGroup.value);

    if (typeFocus === PMFM) {
      return formGroup.get('measurementValues').get(focusColumnName);
    } else if (typeFocus === PROPERTY) {
      return formGroup.get(focusColumnName);
    } else {
      const specificCopy = this.specificCopy(focusColumnName);
      if (specificCopy.length === 1) {
        const control = formGroup.get('gearUseFeatures');
        const controlGuf = control.get(specificCopy[0].id.toString());
        return controlGuf.get(specificCopy[0].name);
      } else {
        const control = formGroup.get('gearUseFeatures');
        const controlGuf = control.get(specificCopy[0].id.toString());
        return controlGuf.get('fishingAreas').get(specificCopy[1].id.toString()).get('location');
      }
    }
  }
  static getPmfmList(data: any) {
    const pmfmList = data.measurementValues;
    const propertyList = Object.keys(pmfmList);
    propertyList.pop();
    return propertyList;
  }
  static getColumnIndex(array: string[], columnName: string): number {
    return array.indexOf(columnName);
  }

  static copyValue(data: ActivityMonth, focusColumn: string): ValueCopied {
    const focusType = this.getTypeFocus(focusColumn, data);
    let copyValue: ValueCopied;

    if (focusType === PMFM) {
      copyValue = { value: data?.measurementValues[focusColumn], type: PMFM, focusColumn: focusColumn, specificColumn: null };
    } else if (focusType === PROPERTY) {
      copyValue = { value: data[focusColumn], type: PROPERTY, focusColumn: focusColumn, specificColumn: null };
    } else if (focusType === SPECIFIC) {
      const specificColumn = this.specificCopy(focusColumn);
      copyValue = {
        value:
          specificColumn.length === 1 ? data.gearUseFeatures[specificColumn[0].id].metier : data.gearUseFeatures[specificColumn[0].id].fishingAreas,
        type: SPECIFIC,
        focusColumn: focusColumn,
        specificColumn: specificColumn,
      };
    } else {
      copyValue = null;
      console.error('Type de focus non reconnu');
    }

    return copyValue;
  }

  static pasteValue(control: AbstractControl, focusType: string, copyvalue: ValueCopied, focusColumnName: string) {
    if (copyvalue.type === focusType) {
      if (copyvalue.focusColumn === focusColumnName) {
        if (copyvalue.type === PMFM) {
          control.setValue(copyvalue.value);
        } else if (copyvalue.type === PROPERTY) {
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

  static pasteMultiValue(control: AbstractControl, focusType: string, copyvalue: ValueCopied, focusColumnName: string) {
    if (focusType === PMFM) {
      control.setValue(copyvalue.value);
    } else if (focusType === PROPERTY) {
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

  static getArrayForMultiCopy(rowspan: number, pmfmList: string[], columnName: string) {
    const startCoulumn = ACTIVITY_MONTH_START_COLUMNS.slice(-2); //todo chercher à automatiser
    //pmfm ordre a check , pas bon
    const columnRowOrder = startCoulumn.concat(pmfmList).concat(ACTIVITY_MONTH_END_COLUMNS);
    const columnsIndexstart = this.getColumnIndex(columnRowOrder, columnName);
    const columnsIndexEnd = columnsIndexstart + rowspan - 1;
    return columnRowOrder.slice(columnsIndexstart, columnsIndexEnd + 1);
  }
}
