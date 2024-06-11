import { AbstractControl, FormGroup } from '@angular/forms';
import { ActivityMonth } from '@app/activity-calendar/calendar/activity-month.model';
import { ACTIVITY_MONTH_END_COLUMNS } from '@app/activity-calendar/calendar/calendar.component';
import { IPmfm } from '@app/referential/services/model/pmfm.model';

export interface CopiedValue {
  value: any;
  type: FocusType;
  focusColumn: string;
  specificColumn?: { name: string; id: string }[];
}

type FocusType = 'PMFM' | 'PROPERTY' | 'SPECIFIC';

export class CopyCalendarUtils {
  static specificCellToCopy(input: string): { name: string; id: string | null }[] {
    const regex = /([a-zA-Z]+)(\d+)?/g;
    let match: RegExpExecArray | null;
    const result = [];

    while ((match = regex.exec(input)) !== null) {
      const name = match[1];
      const id = match[2] ? +match[2] - 1 : null;
      result.push({ name, id });
    }
    return result;
  }

  static isNumeric(input: string): boolean {
    return !isNaN(Number(input));
  }

  // TODO MF ASK THE QUESTION TO BENOIOT TO KNOW IF HE HAS A METHOD TO DETECT IF IT'S A PMFM
  static getTypeFocus(paramName: string, obj: any): FocusType {
    if (this.isNumeric(paramName)) {
      return 'PMFM';
    } else if (paramName in obj) {
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
      const specificCopy = this.specificCellToCopy(focusColumnName);
      const controlGuf = control.get(specificCopy[0].id.toString());
      if (specificCopy.length === 1) {
        return controlGuf.get(specificCopy[0].name);
      } else {
        return controlGuf.get('fishingAreas').get(specificCopy[1].id.toString()).get('location');
      }
    }
  }

  // Returns the sorted list of pmfm
  static getPmfmList(pmfm: IPmfm[]) {
    pmfm.sort((a, b) => a.rankOrder - b.rankOrder);
    const extractedAttributes = pmfm.map((obj) => obj.id.toString());
    return extractedAttributes;
  }
  static getColumnIndex(array: string[], columnName: string): number {
    return array.indexOf(columnName);
  }
  static copyValues(focusColumn: string, formControl: any, data: any) {
    let copyValue: CopiedValue;
    let control = CopyCalendarUtils.getControlByFocusName(focusColumn, formControl);
    const focusType = this.getTypeFocus(focusColumn, data);

    if (focusType === 'PMFM') {
      copyValue = { value: control.value, type: 'PMFM', focusColumn: focusColumn, specificColumn: null };
    } else if (focusType === 'PROPERTY') {
      copyValue = { value: control.value, type: 'PROPERTY', focusColumn: focusColumn, specificColumn: null };
    } else if (focusType === 'SPECIFIC') {
      const specificColumn = this.specificCellToCopy(focusColumn);
      if (specificColumn.length === 1) {
        control = formControl.get('gearUseFeatures').get(specificColumn[0].id.toString()).get('metier');
      } else {
        control = formControl.get('gearUseFeatures').get(specificColumn[0].id.toString()).get('fishingAreas');
      }
      copyValue = {
        value: control.value,
        type: 'SPECIFIC',
        focusColumn: focusColumn,
        specificColumn: specificColumn,
      };
    } else {
      copyValue = null;
      console.error('Unrecognized focus type');
    }
    return copyValue;
  }

  // static copyValue(data: ActivityMonth, focusColumn: string): CopiedValue {
  //   const focusType = this.getTypeFocus(focusColumn, data);
  //   let copyValue: CopiedValue;

  //   if (focusType === 'PMFM') {
  //     copyValue = { value: data?.measurementValues[focusColumn], type: 'PMFM', focusColumn: focusColumn, specificColumn: null };
  //   } else if (focusType === 'PROPERTY') {
  //     copyValue = { value: data[focusColumn], type: 'PROPERTY', focusColumn: focusColumn, specificColumn: null };
  //   } else if (focusType === 'SPECIFIC') {
  //     const specificColumn = this.specificCellToCopy(focusColumn);
  //     copyValue = {
  //       value:
  //         specificColumn.length === 1 ? data.gearUseFeatures[specificColumn[0].id].metier : data.gearUseFeatures[specificColumn[0].id].fishingAreas,
  //       type: 'SPECIFIC',
  //       focusColumn: focusColumn,
  //       specificColumn: specificColumn,
  //     };
  //   } else {
  //     copyValue = null;
  //     console.error('Unrecognized focus type');
  //   }

  //   return copyValue;
  // }

  static pasteValues(control: AbstractControl, focusType: FocusType, copyvalue: CopiedValue) {
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

  static getCopyableColumnNames(filterDisplayedColumns: string[], rowspan: number, pmfmList: string[], columnName: string) {
    let columnsIndexEnd = null;
    const startColumns = filterDisplayedColumns.slice(-2); //TODO MF try to automate
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

  static checkCopyCompatible(selectedFocusColumn: string, copyFocusColumn: string) {
    const selectedFocusColumns = CopyCalendarUtils.specificCellToCopy(selectedFocusColumn);
    const copyFocusColumns = CopyCalendarUtils.specificCellToCopy(copyFocusColumn);

    if (selectedFocusColumns.length !== copyFocusColumns.length) {
      return false;
    }

    for (let i = 0; i < selectedFocusColumns.length; i++) {
      const selectedColumn = selectedFocusColumns[i];
      const copyColumn = copyFocusColumns[i];

      if (selectedColumn.name !== copyColumn.name) {
        return false;
      }
    }

    return true;
  }
}
