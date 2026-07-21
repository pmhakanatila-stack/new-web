import { readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const target = process.argv[2] || "../private_data/cms.json";
const file = path.resolve(root, target);
const data = JSON.parse(await readFile(file, "utf8"));
const contents = data.contents || data.content || [];
const ids = ["content-14", "content-15", "content-16", "content-23", "content-competition-2026-07-23"];
for (const id of ids) {
  const item = contents.find((c) => c.id === id);
  console.log(id, "=>", item ? `image=${item.image}` : "YOK");
}
console.log("dosya:", file);
console.log("toplam content:", contents.length);
