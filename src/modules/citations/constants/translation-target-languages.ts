export const TRANSLATION_TARGET_LANGUAGE_CODES = [
    'tr',
    'en',
    'de',
    'fr',
    'es',
    'it',
    'pt',
    'nl',
    'pl',
    'ru',
    'ar',
    'zh',
    'ja',
    'ko',
] as const;

export type TranslationTargetLanguageCode = (typeof TRANSLATION_TARGET_LANGUAGE_CODES)[number];

export function isAllowedTargetLang(code: string): code is TranslationTargetLanguageCode {
    return (TRANSLATION_TARGET_LANGUAGE_CODES as readonly string[]).includes(code);
}
