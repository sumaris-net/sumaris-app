import { ActivatedRouteSnapshot } from '@angular/router';

export abstract class RouteUtils {
  static getParentPath(route: ActivatedRouteSnapshot, queryParams?: { [key: string]: string }) {
    if (!route?.parent) return null;
    const queryParamsString = queryParams ? '?' + this.formatQueryParams(queryParams) : '';

    return this.getPath(route.parent, false) + queryParamsString;
  }

  private static getPath(route: ActivatedRouteSnapshot, includeQueryParams = true): string {
    if (!route) return null;

    // Récupérer la chaîne de requête si nécessaire.
    const queryParamsString = includeQueryParams && route.queryParams ? '?' + this.formatQueryParams(route.queryParams) : '';

    // Si la route a un parent, on appelle récursivement la fonction avec le parent et on ajoute le segment actuel.
    if (route.parent) {
      return this.getPath(route.parent, false) + '/' + route.url.map((segment) => segment.path).join('/') + queryParamsString;
    }
    // Si la route n'a pas de parent, on renvoie simplement le segment de chemin de la route actuelle.
    return route.url.map((segment) => segment.path).join('/') + queryParamsString;
  }

  static formatQueryParams(params: { [key: string]: string }): string {
    if (!params) return '';
    return Object.keys(params)
      .map((key) => encodeURIComponent(key) + '=' + encodeURIComponent(params[key]))
      .join('&');
  }
}
