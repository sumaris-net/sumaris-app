import { Injectable } from '@angular/core';
import {
  EntityUtils,
  equals,
  firstArrayValue,
  isNil,
  isNilOrBlank,
  isNotEmptyArray,
  isNotNil,
  LocalSettingsService,
} from '@sumaris-net/ngx-components';

@Injectable({ providedIn: 'root' })
export class FavoriteService {
  static readonly DEFAULT_PAGE_ID = 'common';

  constructor(private settings: LocalSettingsService) {}

  getControlFavorites(
    controlName: string,
    options?: {
      pageId?: string;
      pageFavorites?: { [key: string]: any };
      allowMultiple?: boolean; // false by default
      sortBy?: string;
    }
  ): any | any[] {
    const pageFavorites = options?.pageFavorites ?? this.getPageFavorites(options?.pageId);
    let value = pageFavorites?.[controlName as string];

    // If many favorites, but need only one, then sort and get the first value
    if (options?.allowMultiple !== true && Array.isArray(value)) {
      if (isNotEmptyArray(value)) {
        return firstArrayValue(EntityUtils.sort(value, options?.sortBy));
      } else {
        return undefined; // empty array
      }
    }

    return value;
  }

  isControlFavorite(
    controlName: string,
    value: any,
    options?: {
      pageId?: string;
      pageFavorites?: { [key: string]: any };
    }
  ): boolean {
    if (isNilOrBlank(controlName) || isNilOrBlank(value)) return false;
    const favoriteValue = this.getControlFavorites(controlName, options);
    if (Array.isArray(favoriteValue)) return favoriteValue.some((v) => equals(v, value));
    return equals(favoriteValue, value);
  }

  toggleControlFavorite(
    controlName: string,
    value: any,
    options?: {
      pageId?: string;
      pageFavorites?: { [key: string]: any };
      allowMultiple?: boolean; // true by default
      emitEvent?: boolean;
    }
  ): any {
    let pageFavorites: { [key: string]: any };

    // Remove from favorites
    if (this.isControlFavorite(controlName, value, options)) {
      pageFavorites = this.removeControlFavorite(controlName, value, options);
    }

    // Add to favorites
    else {
      pageFavorites = this.addControlFavorite(controlName, value, options);
    }

    // Save into settings
    if (options?.emitEvent !== false) {
      this.savePageFavorites(options?.pageId, pageFavorites);
    }

    return this.getControlFavorites(controlName, options);
  }

  getDefaultFavorites(): { [key: string]: any } {
    return this.settings.getPageSettings(FavoriteService.DEFAULT_PAGE_ID, 'favorites');
  }

  getPageFavorites(pageId?: string): { [key: string]: any } {
    pageId = pageId ?? FavoriteService.DEFAULT_PAGE_ID;
    return this.settings.getPageSettings(pageId, 'favorites');
  }

  /* -- protected functions -- */

  protected async savePageFavorites(pageId: string | undefined, pageFavorites: { [key: string]: any }) {
    pageId = pageId ?? FavoriteService.DEFAULT_PAGE_ID;
    return this.settings.savePageSetting(pageId, pageFavorites, 'favorites');
  }

  protected getFirstControlFavorite(
    controlName: string,
    options?: {
      sortBy?: string;
      pageFavorites?: { [key: string]: any };
    }
  ): any {
    return this.getControlFavorites(controlName, { ...options, allowMultiple: false });
  }

  protected removeControlFavorite(
    controlName: string,
    value: any,
    options?: {
      pageId?: string;
      allowMultiple?: boolean; // true by default
      pageFavorites?: { [key: string]: any };
    }
  ) {
    const pagesFavorites = options?.pageFavorites ?? this.getPageFavorites(options?.pageId);

    if (isNilOrBlank(controlName) || isNilOrBlank(value)) return;
    let favoriteValue: any | any[] = this.getControlFavorites(controlName, options);
    if (Array.isArray(favoriteValue)) {
      favoriteValue = favoriteValue.filter((v) => !equals(v, value));
    } else {
      favoriteValue = null;
    }

    // Remove the key, is no value
    if (isNil(favoriteValue)) {
      const target = { ...pagesFavorites };
      delete target[controlName];
      return target;
    }

    // Return new page favorites
    return {
      ...(pagesFavorites || {}),
      [controlName]: favoriteValue,
    };
  }

  protected addControlFavorite(
    controlName: string,
    value: any,
    options?: {
      pageId?: string;
      allowMultiple?: boolean; // true by default
      pageFavorites?: { [key: string]: any };
    }
  ) {
    const pagesFavorites = options?.pageFavorites ?? this.getPageFavorites(options?.pageId);
    let favoriteValue: any | any[] = this.getControlFavorites(controlName, options);
    if (Array.isArray(favoriteValue)) {
      favoriteValue = [value, ...favoriteValue];
    } else if (isNotNil(favoriteValue)) {
      favoriteValue = [value, favoriteValue];
    } else {
      favoriteValue = value;
    }

    // Keep first (most recent) value, if multiple value not allowed
    if (options?.allowMultiple === false && Array.isArray(favoriteValue)) {
      favoriteValue = firstArrayValue(favoriteValue);
    }

    // Return new page favorites
    return {
      ...(pagesFavorites || {}),
      [controlName as string]: favoriteValue,
    };
  }
}
