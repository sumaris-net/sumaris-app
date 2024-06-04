import { AbstractControl, FormGroup } from '@angular/forms';
import { ActivityMonth } from '@app/activity-calendar/calendar/activity-month.model';
import { ACTIVITY_MONTH_END_COLUMNS, ACTIVITY_MONTH_START_COLUMNS } from '@app/activity-calendar/calendar/calendar.component';

export interface ValueCopied {
  value: any;
  type: string;
  focusColumn: string;
  specificColumn?: { name: string; id: string }[];
}

export class CopyUtils {
  public specificCopy(input: string): { name: string; id: string }[] {
    const regex = /([a-zA-Z]+)(\d+)/g;
    let match;
    const result = [];

    while ((match = regex.exec(input)) !== null) {
      const name = match[1];
      const id = parseInt(match[2], 10) - 1;
      result.push({ name, id });
    }

    return result;
  }

  public isNumeric(input: string): boolean {
    return /^\d+$/.test(input);
  }

  public getTypeOfFocus(paramName: string, obj: any): string {
    if (this.isNumeric(paramName)) {
      return 'PMFM';
    } else if (Object.prototype.hasOwnProperty.call(obj, paramName)) {
      return 'PROPERTY';
    } else {
      return 'SPECIFIC';
    }
  }

  public getControlByFocusName(focusColumnName: string, formGroup: FormGroup) {
    const typeOfFocusColumn = this.getTypeOfFocus(focusColumnName, formGroup.value);

    if (typeOfFocusColumn === 'PMFM') {
      return formGroup.get('measurementValues').get(focusColumnName);
    } else if (typeOfFocusColumn === 'PROPERTY') {
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
  public getPmfmListName(data: any) {
    const pmfmList = data.measurementValues;
    const propertyList = Object.keys(pmfmList);
    propertyList.pop();
    return propertyList;
  }
  public getColumnIndex(array: string[], columnName: string): number {
    return array.indexOf(columnName);
  }

  public copyValue(data: ActivityMonth, focusColumn: string): ValueCopied {
    const focusType = this.getTypeOfFocus(focusColumn, data);
    let copyValue: ValueCopied = null;
    if (focusType === 'PMFM') {
      copyValue = { value: data?.measurementValues[focusColumn], type: 'PMFM', focusColumn: focusColumn, specificColumn: null };
    } else if (focusType === 'PROPERTY') {
      copyValue = { value: data[focusColumn], type: 'PROPERTY', focusColumn: focusColumn, specificColumn: null };
    } else {
      const specificColumn = this.specificCopy(focusColumn);
      copyValue = {
        value:
          specificColumn.length === 1 ? data.gearUseFeatures[specificColumn[0].id].metier : data.gearUseFeatures[specificColumn[0].id].fishingAreas,
        type: 'SPECIFIC',
        focusColumn: focusColumn,
        specificColumn: specificColumn,
      };
    }
    return copyValue;
  }

  // TODO MF trop d'arguments
  public pasteValue(control: AbstractControl, focusType: string, copyvalue: ValueCopied, focusColumnName: string) {
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

  public pasteMultiValue(control: AbstractControl, focusType: string, copyvalue: ValueCopied, focusColumnName: string) {
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

  public getArrayForMultiCopy(rowspan: number, pmfmList: string[], columnName: string) {
    const startCoulumn = ACTIVITY_MONTH_START_COLUMNS.slice(-2); //todo chercher à automatiser
    //pmfm ordre a check , pas bon
    const columnRowOrder = startCoulumn.concat(pmfmList).concat(ACTIVITY_MONTH_END_COLUMNS);
    const columnsIndexstart = this.getColumnIndex(columnRowOrder, columnName);
    const columnsIndexEnd = columnsIndexstart + rowspan - 1;
    return columnRowOrder.slice(columnsIndexstart, columnsIndexEnd + 1);
  }
}

// if (copyValue.type === focusType) {
//   if (copyValue.focusColumn === focusColumnName) {
//     if (copyValue.type === 'PMFM') {
//       control.setValue(copyValue.value);
//     } else if (copyValue.type === 'PROPERTY') {
//       control.setValue(copyValue.value);
//     }
//   }

//   if (copyValue.specificColumn && Array.isArray(copyValue.specificColumn)) {
//     if (copyValue.specificColumn.length === 1) {
//       control.setValue(copyValue.value);
//     } else {
//       control.setValue(copyValue.value[copyValue.specificColumn[1].id.toString()].location);
//     }
//   }
// }
