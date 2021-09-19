import ISO6391 from 'iso-639-1';

export function getLocales(): string[] {
  return ISO6391.getAllCodes();
}

export function getLanguageName(locale: string): string {
  const english = ISO6391.getName(locale);
  const native = ISO6391.getNativeName(locale);
  if (english === native) {
    return english;
  }

  return `${english} / ${native}`;
}

export function LanguageName({locale}: { locale: string }) {
  const english = ISO6391.getName(locale);
  const native = ISO6391.getNativeName(locale);
  if (english === native) {
    return <>english</>;
  }

  return <>{english} / <span lang={locale}>{native}</span></>;
}
