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
  for (const entry of manifest) {
    const item = contents.find((candidate) => candidate.id === entry.id);
    if (!item) throw new Error(`${relative} icinde kayit bulunamadi: ${entry.id}`);
    const paths = entry.images.map((image) => image.path);
    item.image = paths[0];
    item.images = paths;
    item.legacySourceUrl = "";
    item.sourceUrl = "";
  }
  await writeFile(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log(`${relative}: ${manifest.length} haber guncellendi`);
}
