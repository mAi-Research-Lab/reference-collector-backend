/**
 * Lightweight BibTeX / RIS parsing for library import (not a full BibTeX implementation).
 */

export interface ParsedBibliographyEntry {
    type: string;
    title: string;
    authors?: { name: string }[];
    publication?: string;
    publisher?: string;
    year?: number;
    volume?: string;
    issue?: string;
    pages?: string;
    doi?: string;
    isbn?: string;
    issn?: string;
    url?: string;
    abstractText?: string;
    notes?: string;
    metadata?: Record<string, unknown>;
}

function skipWs(s: string, i: number): number {
    while (i < s.length && /\s/.test(s[i])) i++;
    return i;
}

function parseBibtexFieldValue(s: string, start: number): { value: string; end: number } | null {
    let i = skipWs(s, start);
    if (i >= s.length) return null;
    const c = s[i];
    if (c === '{') {
        let depth = 0;
        const from = i;
        for (; i < s.length; i++) {
            if (s[i] === '{') depth++;
            else if (s[i] === '}') {
                depth--;
                if (depth === 0) {
                    return { value: s.slice(from + 1, i), end: i + 1 };
                }
            }
        }
        return null;
    }
    if (c === '"') {
        i++;
        let out = '';
        for (; i < s.length; i++) {
            if (s[i] === '\\' && i + 1 < s.length) {
                out += s[i + 1];
                i++;
                continue;
            }
            if (s[i] === '"') {
                return { value: out, end: i + 1 };
            }
            out += s[i];
        }
        return null;
    }
    let j = i;
    while (j < s.length && !/[,\s}]/.test(s[j])) j++;
    return { value: s.slice(i, j).trim(), end: j };
}

function simplifyBibtexText(v: string): string {
    return v
        .replace(/\\n/g, '\n')
        .replace(/\{|\}/g, '')
        .replace(/\\_/g, '_')
        .replace(/\\\s/g, ' ')
        .replace(/~/g, ' ')
        .trim();
}

function parseBibtexFields(body: string): Record<string, string> {
    const out: Record<string, string> = {};
    let i = 0;
    while (i < body.length) {
        i = skipWs(body, i);
        if (i >= body.length) break;
        const rest = body.slice(i);
        const m = rest.match(/^(\w+)\s*=\s*/);
        if (!m) {
            i++;
            continue;
        }
        const key = m[1].toLowerCase();
        i += m[0].length;
        const parsed = parseBibtexFieldValue(body, i);
        if (!parsed) break;
        out[key] = simplifyBibtexText(parsed.value);
        i = skipWs(body, parsed.end);
        if (body[i] === ',') i++;
    }
    return out;
}

function splitBibtexRawEntries(raw: string): string[] {
    const entries: string[] = [];
    let i = 0;
    const text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    while (i < text.length) {
        const at = text.indexOf('@', i);
        if (at < 0) break;
        const brace = text.indexOf('{', at);
        if (brace < 0) break;
        let depth = 0;
        let j = brace;
        for (; j < text.length; j++) {
            if (text[j] === '{') depth++;
            else if (text[j] === '}') {
                depth--;
                if (depth === 0) {
                    j++;
                    break;
                }
            }
        }
        entries.push(text.slice(at, j).trim());
        i = j;
    }
    return entries.filter(Boolean);
}

const BIBTEX_SKIP = new Set(['comment', 'string', 'preamble']);

function mapBibtexType(bibType: string): string {
    const t = bibType.toLowerCase();
    const m: Record<string, string> = {
        article: 'journal',
        inproceedings: 'conference',
        conference: 'conference',
        proceedings: 'conference',
        book: 'book',
        inbook: 'book-chapter',
        incollection: 'book-chapter',
        phdthesis: 'thesis',
        mastersthesis: 'thesis',
        techreport: 'report',
        misc: 'misc',
        booklet: 'book',
        manual: 'document',
        unpublished: 'preprint',
    };
    return m[t] || 'misc';
}

function parseAuthorsFromBibtex(authorStr: string | undefined): { name: string }[] | undefined {
    if (!authorStr?.trim()) return undefined;
    const parts = authorStr.split(/\s+and\s+/i).map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return undefined;
    return parts.map((name) => ({ name }));
}

function parseYear(y: string | undefined): number | undefined {
    if (!y) return undefined;
    const m = y.match(/(19|20)\d{2}/);
    if (!m) return undefined;
    const n = parseInt(m[0], 10);
    return Number.isFinite(n) ? n : undefined;
}

function normalizeDoi(d: string | undefined): string | undefined {
    if (!d?.trim()) return undefined;
    let x = d.trim();
    x = x.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '');
    return x || undefined;
}

export function parseBibtexFile(content: string): ParsedBibliographyEntry[] {
    const out: ParsedBibliographyEntry[] = [];
    for (const entry of splitBibtexRawEntries(content)) {
        const header = entry.match(/^@(\w+)\s*\{\s*([^,]+)\s*,/);
        if (!header) continue;
        const bibCmd = header[1].toLowerCase();
        if (BIBTEX_SKIP.has(bibCmd)) continue;
        const citeKey = header[2].trim();
        const body = entry.slice(header[0].length, entry.lastIndexOf('}')).trim();
        const f = parseBibtexFields(body);
        const titleRaw = f.title || f.booktitle || '';
        const title = titleRaw || citeKey;
        const authors = parseAuthorsFromBibtex(f.author || f.editor);
        const journal = f.journal || f.journaltitle;
        const booktitle = f.booktitle;
        const publication =
            bibCmd === 'inproceedings' || bibCmd === 'conference' || bibCmd === 'proceedings'
                ? booktitle || journal
                : journal || booktitle;
        const pages = f.pages?.replace(/--/g, '-');
        out.push({
            type: mapBibtexType(bibCmd),
            title,
            authors,
            publication,
            publisher: f.publisher || f.school || f.institution,
            year: parseYear(f.year || f.date),
            volume: f.volume,
            issue: f.number,
            pages,
            doi: normalizeDoi(f.doi),
            isbn: f.isbn?.replace(/[^0-9X]/gi, '') || undefined,
            issn: f.issn,
            url: f.url,
            abstractText: f.abstract,
            notes: f.note || f.annote,
            metadata: { importCiteKey: citeKey, importBibType: bibCmd },
        });
    }
    return out;
}

function splitRisRecords(raw: string): string[] {
    const text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = text.split('\n');
    const blocks: string[] = [];
    let buf: string[] = [];
    for (const line of lines) {
        buf.push(line);
        if (/^ER\s*-\s*$/i.test(line.trim())) {
            blocks.push(buf.join('\n'));
            buf = [];
        }
    }
    if (buf.some((l) => l.trim())) blocks.push(buf.join('\n'));
    return blocks;
}

function parseRisLines(block: string): Map<string, string[]> {
    const map = new Map<string, string[]>();
    let lastTag: string | null = null;
    for (const line of block.split('\n')) {
        const m = line.match(/^([A-Z0-9]{2,4})\s*-\s*(.*)$/);
        if (m) {
            const tag = m[1].toUpperCase();
            const val = m[2].trim();
            lastTag = tag;
            if (!map.has(tag)) map.set(tag, []);
            map.get(tag)!.push(val);
        } else if (lastTag && /^\s{2,}\S/.test(line)) {
            const arr = map.get(lastTag);
            if (arr?.length) {
                arr[arr.length - 1] += ` ${line.trim()}`;
            }
        }
    }
    return map;
}

function mapRisTy(ty: string): string {
    const u = (ty || '').toUpperCase().trim();
    const m: Record<string, string> = {
        JOUR: 'journal',
        BOOK: 'book',
        CHAP: 'book-chapter',
        CONF: 'conference',
        THES: 'thesis',
        RPRT: 'report',
        ELEC: 'webpage',
        NEWS: 'newspaper',
        GEN: 'misc',
        MGZN: 'magazine',
    };
    return m[u] || 'journal';
}

function joinTags(m: Map<string, string[]>, ...tags: string[]): string | undefined {
    const parts: string[] = [];
    for (const t of tags) {
        const v = m.get(t);
        if (v?.length) parts.push(...v);
    }
    const s = parts.map((x) => x.trim()).filter(Boolean).join(' ');
    return s || undefined;
}

export function parseRisFile(content: string): ParsedBibliographyEntry[] {
    const out: ParsedBibliographyEntry[] = [];
    for (const block of splitRisRecords(content)) {
        const m = parseRisLines(block);
        const ty = m.get('TY')?.[0] || 'JOUR';
        const title =
            joinTags(m, 'TI', 'T1', 'BT') ||
            joinTags(m, 'CT') ||
            'Imported reference';
        const authorsRaw = m.get('AU') || m.get('A1') || [];
        const authors = authorsRaw.length ? authorsRaw.map((name) => ({ name: name.trim() })) : undefined;
        const py = m.get('PY')?.[0] || m.get('Y1')?.[0] || '';
        const year = parseYear(py);
        const sp = m.get('SP')?.[0];
        const ep = m.get('EP')?.[0];
        let pages: string | undefined;
        if (sp && ep) pages = `${sp}-${ep}`;
        else if (sp) pages = sp;
        out.push({
            type: mapRisTy(ty),
            title,
            authors,
            publication: joinTags(m, 'JO', 'JF', 'T2', 'JA'),
            publisher: joinTags(m, 'PB'),
            year,
            volume: m.get('VL')?.[0],
            issue: m.get('IS')?.[0],
            pages,
            doi: normalizeDoi(m.get('DO')?.[0]),
            isbn: m.get('SN')?.[0]?.replace(/[^0-9X]/gi, '') || undefined,
            issn: m.get('SE')?.[0],
            url: m.get('UR')?.[0],
            abstractText: joinTags(m, 'AB', 'N2'),
            notes: joinTags(m, 'N1', 'NV'),
            metadata: { importRisType: ty },
        });
    }
    return out;
}

export function ensureImportTitle(title: string, fallback: string): string {
    let s = (title || '').trim() || fallback.trim() || 'Imported reference';
    if (s.length < 5) {
        s = `${s} · ref`;
    }
    if (s.length > 500) s = s.slice(0, 500);
    return s;
}
