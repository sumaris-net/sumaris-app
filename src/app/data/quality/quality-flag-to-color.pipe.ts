import {Injectable, Pipe, PipeTransform} from '@angular/core';
import {qualityFlagToColor} from "../services/model/model.utils";

@Pipe({
  name: 'qualityFlagToColor'
})
export class QualityFlagToColorPipe implements PipeTransform {

  transform(qualityFlagId: number): string {
    return qualityFlagToColor(qualityFlagId);
  }
}
