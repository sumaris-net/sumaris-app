import { SortDirection } from '@angular/material/sort';
import { ToUpperCase } from '@app/shared/types.utils';

/**
 * A Page, from graphQL PageInput type
 */
export interface Page {
  offset?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: ToUpperCase<SortDirection>;
}
