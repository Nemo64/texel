import {expect, test} from "@jest/globals";
import {msg} from "../util";
import {Texel, uniqueTexels} from "./types";

const cases: Array<{input: Texel[], output: Texel[]}> = [
  {
    input: [
      {domain: 'common.json.en.dir', key: 'foo', locale: 'en', value: 'commit'},
      {domain: 'common.json.en.dir', key: 'foo', locale: 'en', value: 'commit!'},
    ],
    output: [
      {domain: 'common.json.en.dir', key: 'foo', locale: 'en', value: 'commit!'},
    ]
  },
  {
    input: [
      {domain: 'common.json.en.dir', key: 'foo', locale: 'en', value: 'commit'},
      {domain: 'common.json.en.dir', key: 'foo', locale: 'de', value: 'commit!'},
    ],
    output: [
      {domain: 'common.json.en.dir', key: 'foo', locale: 'en', value: 'commit'},
      {domain: 'common.json.en.dir', key: 'foo', locale: 'de', value: 'commit!'},
    ]
  },
  {
    input: [
      {domain: 'common.json.en.dir', key: 'foo', locale: 'en', value: 'commit'},
      {domain: 'common.json.en.dir', key: 'foo', locale: 'en', value: undefined},
    ],
    output: []
  },
];

for (const {input, output} of cases) {
  test(msg`uniqueTexels`, () => {
    expect(uniqueTexels(...input)).toEqual(output);
  });
}
