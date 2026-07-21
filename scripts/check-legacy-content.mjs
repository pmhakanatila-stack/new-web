import { access, readFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const db = JSON.parse((await readFile(join(root, "seed-cms.json"), "utf8")).replace(/^\uFEFF/, ""));
const repairManifest = JSON.parse(await readFile(join(root, "legacy-content-repair.json"), "utf8"));
const content = db.content || db.contents || [];
const events = db.events || [];
const normalize = (value) => String(value || "")
  .toLocaleLowerCase("tr-TR")
  .replace(/[ıİ]/g, "i")
  .replace(/[şŞ]/g, "s")
  .replace(/[ğĞ]/g, "g")
  .replace(/[üÜ]/g, "u")
  .replace(/[öÖ]/g, "o")
  .replace(/[çÇ]/g, "c")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const expected = {
  haberler: [
    "bursa teknik universitesi peyzaj mimarligi bolumu", "eskisehir buyuksehir belediyesi park ve bahceler", "eskisehir kultur varliklarini koruma", "pemkon tarafindan kentsel peyzajlar", "turkiye nin ilk performans odakli peyzaj yarismasini", "tmmob ic mimarlar odasi bursa", "tmmob mimarlar odasi bursa", "tmmob mimarlar odasi eskisehir", "tmmob peyzaj mimarlari odasi bursa", "tmmob peyzaj mimarlari odasi eskisehir", "tmmob ziraat muhendisleri odasi bursa", "2025 golyazi calistayi", "dunya cevre gununde agac dikimi", "yagmur suyu teknolojileri", "ilk genel kurulu", "peyzajder kuruldu", "sektorun 2025 degerlendirmesi", "harita ve kadastro muhendisleri odasi",
  ],
  etkinlikler: [
    "bgc bursa basini basari odulleri", "bilimsel calismaya katki firsati", "bursa ya deger katan isim erdem saker", "dunya cevre gununde agac dikimi", "mekanin dilinden inancin izlerine", "btso 57 komite toplantisinda", "peyzajder den btu ye ziyaret", "peyzajder genel kurulu", "sektorel seminerler performans odakli peyzajda cim", "yagmur suyu hasadi teknolojileri", "yapider ile bir araya gelmekten", "yapider ve peyzaj mimarlari ve sektor profesyonelleri",
  ],
  duyurular: ["1 genel kurul cagrisi", "sektorel seminerler performans odakli peyzajda cim", "yagmur suyu hasadi teknolojileri konulu cevrim ici"],
};

const failures = [];
for (const [category, fragments] of Object.entries(expected)) {
  const source = category === "etkinlikler" ? events : content;
  const titles = source.filter((item) => item.category === category).map((item) => normalize(item.title));
  for (const fragment of fragments) {
    if (!titles.some((title) => title.includes(normalize(fragment)))) failures.push(`${category}: ${fragment}`);
  }
  console.log(`${category}: eski sitedeki ${fragments.length} içerik doğrulandı`);
}

const listingTitles = new Set((repairManifest.listingTitles || []).map(normalize));
const noise = /approachingEvent|content_slider|google-site-verification/i;
for (const [collectionName, records] of [["content", content], ["events", events]]) {
  const seenTitles = new Set();
  for (const item of records) {
    if (listingTitles.has(normalize(item.title))) failures.push(`Gereksiz liste kaydı duruyor: ${item.title}`);
    const titleKey = `${item.category || ""}:${normalize(item.title)}`;
    if (seenTitles.has(titleKey)) failures.push(`Mükerrer içerik kaydı duruyor: ${item.title}`);
    seenTitles.add(titleKey);
  }
  for (const entry of repairManifest[collectionName] || []) {
    const item = records.find((candidate) => candidate.id === entry.id)
      || records.find((candidate) => candidate.legacySourcePath === entry.legacySourcePath);
    if (!item) {
      failures.push(`Onarım kaydı bulunamadı: ${entry.id}`);
      continue;
    }
    if (noise.test(`${item.summary || ""} ${item.seoDescription || ""} ${item.body || ""}`)) failures.push(`Artık kod/metin kalıntısı var: ${entry.id}`);
    const images = Array.isArray(item.images) ? item.images : [];
    if (!images.length || item.image !== images[0]) failures.push(`Kapak/galeri eşleşmedi: ${entry.id}`);
    if (images.some((image) => !image.endsWith(".webp") || /^https?:/i.test(image))) failures.push(`Yerel WebP değil: ${entry.id}`);
    for (const image of images) {
      try { await access(join(root, image)); } catch { failures.push(`Görsel dosyası yok: ${image}`); }
    }
  }
}
console.log(`görseller: ${repairManifest.content.length + repairManifest.events.length} içerik yerel WebP dosyalarıyla doğrulandı`);

if (failures.length) {
  console.error(`Eksik veya hatalı içerikler:\n${failures.join("\n")}`);
  process.exit(1);
}
