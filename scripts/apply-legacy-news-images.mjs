import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const manifest = JSON.parse(await readFile(path.join(root, "scripts", "legacy-news-images.json"), "utf8"));
const targets = process.argv.slice(2).length ? process.argv.slice(2) : ["seed-cms.json"];

for (const entry of manifest) {
  if (!entry.images.length) throw new Error(`Gorsel yok: ${entry.id}`);
  for (const image of entry.images) await access(path.join(root, image.path));
}

for (const relative of targets) {
  const file = path.resolve(root, relative);
  const data = JSON.parse(await readFile(file, "utf8"));
  const contents = data.contents || data.content || [];
  let updated = 0;
  let skipped = 0;
  for (const entry of manifest) {
    const item = contents.find((candidate) => candidate.id === entry.id);
    if (!item) {
      console.warn(`${relative}: kayit bulunamadi, atlandi: ${entry.id}`);
      skipped++;
      continue;
    }
    const paths = entry.images.map((image) => image.path);
    item.image = paths[0];
    item.images = paths;
    item.legacySourceUrl = "";
    item.sourceUrl = "";
    updated++;
  }
  await writeFile(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log(`${relative}: ${updated} haber guncellendi, ${skipped} atlandi`);
}
