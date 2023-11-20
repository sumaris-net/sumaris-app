import { Injectable } from '@angular/core';
import { ActivatedRoute, Router, UrlTree } from '@angular/router';
import { NavController } from '@ionic/angular';
import { LocationStrategy } from '@angular/common';
import { UrlUtils } from '@app/shared/markdown/markdown-anchor.utils';

@Injectable({ providedIn: 'root' })
export class MarkdownAnchorService {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private locationStrategy: LocationStrategy,
    private navController: NavController
  ) {}

  isInternalUrl(href: string): boolean {
    return UrlUtils.isInternalUrl(href);
  }

  getUrlTree(url: string): UrlTree {
    const urlPath = UrlUtils.stripFragmentAndQuery(url) || UrlUtils.stripFragmentAndQuery(this.router.url);
    const parsedUrl = this.router.parseUrl(url);
    const fragment = parsedUrl.fragment;
    const queryParams = parsedUrl.queryParams;
    return this.router.createUrlTree([urlPath], { relativeTo: this.route, fragment, queryParams });
  }

  navigate(url: string, replaceUrl = false) {
    const urlTree = this.getUrlTree(url);
    this.router.navigated = false;
    this.navController.navigateForward(urlTree, { replaceUrl });
  }

  interceptClick(event: Event) {
    const element = event.target;
    if (!(element instanceof HTMLAnchorElement)) {
      return;
    }

    let routerLink = element.getAttribute('routerLink');
    if (routerLink) {
      event.preventDefault();
      this.navController.navigateForward(routerLink);
      return;
    }

    const href = element.getAttribute('href');
    if (UrlUtils.isInternalUrl(href)) {
      const urlTree = this.getUrlTree(href.startsWith('/') ? href : `/${href}`);

      event.preventDefault();
      this.router.navigated = false;
      this.navController.navigateForward(urlTree);
    }
  }

  /**
   * Transform a relative URL to its absolute representation according to current router state.
   * @param url Relative URL path.
   * @return Absolute URL based on the current route.
   */
  normalizeExternalUrl(url: string): string {
    if (UrlUtils.isExternalUrl(url)) {
      return url;
    }
    const urlTree = this.getUrlTree(url);
    const serializedUrl = this.router.serializeUrl(urlTree);
    return this.locationStrategy.prepareExternalUrl(serializedUrl);
  }
}
