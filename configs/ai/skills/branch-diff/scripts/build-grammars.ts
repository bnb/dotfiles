// Writes dist/grammars.json: the Shiki grammars for every language in
// languages.json, looked up by id or alias, so `render` can embed only the
// ones a diff needs.
import { readFileSync, writeFileSync } from "node:fs";
import { bundledLanguagesInfo, type LanguageRegistration } from "shiki";

const { languages } = JSON.parse(
  readFileSync(new URL("../languages.json", import.meta.url), "utf8"),
) as {
  languages: string[];
};

const grammars: Record<string, LanguageRegistration> = {};
const lookup: Record<string, string[]> = {};

for (const id of languages) {
  const info = bundledLanguagesInfo.find((language) => language.id === id);
  if (!info) throw new Error(`languages.json: Shiki has no language "${id}"`);
  const registrations = (await info.import()).default as LanguageRegistration[];
  for (const registration of registrations) grammars[registration.name] = registration;
  // Embedded languages come first, as Shiki expects to load them.
  const names = registrations.map((registration) => registration.name);
  for (const key of [id, ...(info.aliases ?? [])]) lookup[key] = names;
}

writeFileSync(
  new URL("../dist/grammars.json", import.meta.url),
  JSON.stringify({ lookup, grammars }),
);
console.log(`${languages.length} languages, ${Object.keys(grammars).length} grammars`);
