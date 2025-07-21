import { CustomHttpException } from "src/common/exceptions/custom-http-exception";

export function validateXMLSyntax(cslContent: string): void {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(cslContent, 'text/xml');

        // XML parsing error check
        const parserError = doc.querySelector('parsererror');
        if (parserError) {
            throw new CustomHttpException(`Invalid XML syntax: ${parserError.textContent}`, 400, `Invalid XML syntax: ${parserError.textContent}`);
        }
    } catch (error) {
        throw new CustomHttpException(`Invalid XML syntax: ${error.message}`, 400, `Invalid XML syntax: ${error.message}`);
    }
}

export function validateCSLSchema(cslContent: string): void {
    const parser = new DOMParser();
    const doc = parser.parseFromString(cslContent, 'text/xml');
    
    const styleElement = doc.documentElement;
    if (styleElement.tagName !== 'style') {
        throw new CustomHttpException('Root element must be <style>', 400, 'Root element must be <style>');
    }
    
    // Namespace check
    const namespace = styleElement.getAttribute('xmlns');
    if (namespace !== 'http://purl.org/net/xbiblio/csl') {
        throw new CustomHttpException('Invalid CSL namespace', 400, 'Invalid CSL namespace');
    }
    
    // Class attribute check
    const classAttr = styleElement.getAttribute('class');
    if (!['in-text', 'note'].includes(classAttr!)) {
        throw new CustomHttpException('Style class must be "in-text" or "note"', 400, 'Style class must be "in-text" or "note"');
    }
}

export function validateRequiredElements(cslContent: string): void {
    const parser = new DOMParser();
    const doc = parser.parseFromString(cslContent, 'text/xml');
    
    // Required: <info> element
    const infoElement = doc.querySelector('info');
    if (!infoElement) {
        throw new CustomHttpException('Missing required <info> element', 400, 'Missing required <info> element');
    }
    
    // Required: <title> inside <info>
    const titleElement = infoElement.querySelector('title');
    if (!titleElement || !titleElement.textContent?.trim()) {
        throw new CustomHttpException('Missing required <title> in <info>', 400, 'Missing required <title> in <info>');
    }
    
    // Required: <id> inside <info>
    const idElement = infoElement.querySelector('id');
    if (!idElement || !idElement.textContent?.trim()) {
        throw new CustomHttpException('Missing required <id> in <info>', 400, 'Missing required <id> in <info>');
    }
    
    // Required: Either <citation> or <bibliography> (or both)
    const citationElement = doc.querySelector('citation');
    const bibliographyElement = doc.querySelector('bibliography');
    
    if (!citationElement && !bibliographyElement) {
        throw new CustomHttpException('Must have either <citation> or <bibliography> element', 400, 'Must have either <citation> or <bibliography> element');
    }
    
    // Each citation/bibliography must have layout
    if (citationElement && !citationElement.querySelector('layout')) {
        throw new CustomHttpException('<citation> must contain <layout> element', 400, '<citation> must contain <layout> element');
    }
    
    if (bibliographyElement && !bibliographyElement.querySelector('layout')) {
        throw new CustomHttpException('<bibliography> must contain <layout> element', 400, '<bibliography> must contain <layout> element');
    }
}

export function validateCSLVersion(cslContent: string): void {
    const parser = new DOMParser();
    const doc = parser.parseFromString(cslContent, 'text/xml');
    
    const versionAttr = doc.documentElement.getAttribute('version');
    if (!versionAttr) {
        throw new CustomHttpException('Missing version attribute', 400, 'Missing version attribute');
    }
    
    // Supported versions
    const supportedVersions = ['1.0', '1.0.1', '1.0.2'];
    if (!supportedVersions.includes(versionAttr)) {
        throw new CustomHttpException(`Unsupported version: ${versionAttr}`, 400, `Unsupported version: ${versionAttr}`);
    }
}