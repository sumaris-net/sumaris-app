export class UrlUtils {
    static isInternalUrl(href) {
        if (!href)
            return false;
        if (href.startsWith(window.location.origin))
            return true;
        return !href.startsWith('http:') && !href.startsWith('https:') && !href.startsWith('mailto:') && !href.startsWith('tel:');
    }
    static isExternalUrl(href) {
        if (!href)
            return false;
        return !this.isInternalUrl(href);
    }
    static stripQuery(url) {
        return /[^?]*/.exec(url)[0];
    }
    static stripFragmentAndQuery(url) {
        return this.stripQuery(/[^#]*/.exec(url)[0]);
    }
}
//# sourceMappingURL=markdown-anchor.utils.js.map