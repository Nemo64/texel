import {expect, test} from "@jest/globals";
import {domainToPath, generateL10nFile, parseL10nFile, pathToDomain} from "./l10n_files";
import {msg} from "./util";

const path_domain = [
  {path: 'en/common.json', domain: 'common.json.dir', locale: 'en'},
  {path: 'common.en.json', domain: 'common.json.name', locale: 'en'},
  {path: 'hello/de/common.json', domain: 'hello/common.json.dir', locale: 'de'},
  {path: 'hello/common.en.yaml', domain: 'hello/common.yaml.name', locale: 'en'},
];

for (const {path, domain, locale} of path_domain) {
  test(msg`pathToDomain ${path}`, () => {
    expect(pathToDomain(path)).toEqual(domain);
  });
  test(msg`domainToPath ${domain} ${locale}`, () => {
    expect(domainToPath(domain, locale)).toEqual(path);
  });
}

const file_texel = [
  {
    path: (format: string) => `en/common.${format}`,
    texels: (format: string) => [
      {domain: `common.${format}.dir`, key: 'foo', locale: 'en', value: 'commit'},
      {domain: `common.${format}.dir`, key: 'bar.baz', locale: 'en', value: 'commit'},
    ],
    formats: {
      json: `{\n  "foo": "commit",\n  "bar": {\n    "baz": "commit"\n  }\n}`,
      yaml: `foo: commit\nbar:\n  baz: commit\n`,
    },
  },
];

for (const {path, texels, formats} of file_texel) {
  for (const [format, content] of Object.entries(formats)) {
    test(msg`generateL10nFile ${format}`, () => {
      expect(generateL10nFile(path(format), texels(format))).toEqual(content);
    });
    test(msg`parseL10nFile ${format}`, () => {
      expect(parseL10nFile(path(format), content)).toEqual(texels(format));
    });
  }
}
