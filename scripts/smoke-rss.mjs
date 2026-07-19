import { fetchCategoryItems } from "../src/lib/rss.ts";
// run via: npx tsx scripts/smoke-rss.mjs
const r = await fetchCategoryItems("geopolitics");
console.log("items:", r.items.length);
console.table(r.log.map(({ source, ok, count }) => ({ source, ok, count })));
