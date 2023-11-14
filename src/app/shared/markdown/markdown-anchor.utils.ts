export abstract class UrlUtils {

  static isInternalUrl(href: string | null): boolean {
    if (!href) return false;
    if (href.startsWith(window.location.origin)) return true
    return !href.startsWith('http:') && !href.startsWith('https:') && !href.startsWith('mailto:') && !href.startsWith('tel:');
  }

  static isExternalUrl(href: string | null): boolean {
    if (!href) return false;
    return !this.isInternalUrl(href);
  }

  static stripQuery(url: string): string {
    return /[^?]*/.exec(url)[0];
  }

  static stripFragmentAndQuery(url: string): string {
    return this.stripQuery(/[^#]*/.exec(url)[0]);
  }
}
