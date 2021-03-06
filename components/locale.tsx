import {ForwardedRef, forwardRef, SelectHTMLAttributes, useEffect, useMemo, useState} from "react";
import {getLanguageName, getLocaleInfo, getLocales} from "../src/locale";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  placeholder?: string
  disabledLocales?: string[];
}

export const LocaleSelect = forwardRef(function LocaleSelect(
  {placeholder, disabledLocales, ...props}: SelectProps,
  ref: ForwardedRef<HTMLSelectElement>
) {
  const [preferredLocales, setPreferredLocales] = useState([] as ReadonlyArray<string>);

  useEffect(() => {
    setPreferredLocales(navigator.languages);
  }, []);

  const groups = useMemo(() => {
    const locales = getLocales();
    const groups = [
      ['System', preferredLocales.filter(locale => locales.includes(locale))],
      ['Others', locales.filter(locale => !preferredLocales.includes(locale))],
    ] as const;
    return groups.filter(([name, values]) => {
      return values.length > 0;
    });
  }, [preferredLocales]);

  return (
    <select {...props} ref={ref}>
      {placeholder && <option value="">{placeholder}</option>}
      {groups.map(([label, groupLocales]) => (
        <optgroup key={label} label={label}>
          {groupLocales.map(locale => (
            <option key={locale} value={locale} disabled={disabledLocales?.includes(locale)}>
              {getLanguageName(locale)}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
});

/**
 * Similar to {@see getLanguageName} but with added html spice.
 */
export function LanguageName({locale}: { locale: string }) {
  const info = getLocaleInfo(locale);
  if (info === undefined) {
    return <>{`[unknown locale ${JSON.stringify(locale)}]`}</>;
  }

  if (info.name === info.nativeName) {
    return <>{info.name}</>;
  }

  return <>{info.name} /&nbsp;<span lang={info.code} translate="no">{info.nativeName}</span></>;
}
