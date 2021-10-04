import ISO6391 from 'iso-639-1';

interface LocaleInfo {
  code: string;
  name: string;
  nativeName: string;
}

export function getLocales(): string[] {
  return ISO6391.getAllCodes();
}

export function getLocaleInfo(locale: string): LocaleInfo | undefined {
  const infos = ISO6391.getLanguages([locale]);
  return infos[0];
}

/**
 * There is also a react version with {@see LanguageName}.
 */
export function getLanguageName(locale: string): string {
  const info = getLocaleInfo(locale);
  if (info === undefined) {
    return `[unknown locale ${JSON.stringify(locale)}]`;
  }

  return info.name;
}
