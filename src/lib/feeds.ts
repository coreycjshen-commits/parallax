import type { BucketId, Category } from "@/lib/types";

export interface FeedSource {
  source: string;
  bucket: BucketId;
  url: string;
  categories: Category[]; // which tabs this feed feeds
}

const ALL: FeedSource[] = [
  // ---- Western wire ----
  { source: "BBC", bucket: "western", url: "https://feeds.bbci.co.uk/news/world/rss.xml", categories: ["geopolitics", "politics"] },
  { source: "BBC Tech", bucket: "western", url: "https://feeds.bbci.co.uk/news/technology/rss.xml", categories: ["tech_economy"] },
  { source: "BBC Politics", bucket: "western", url: "https://feeds.bbci.co.uk/news/politics/rss.xml", categories: ["politics"] },
  { source: "AP", bucket: "western", url: "https://feedx.net/rss/ap.xml", categories: ["geopolitics", "politics", "tech_economy"] },
  { source: "The Guardian", bucket: "western", url: "https://www.theguardian.com/world/rss", categories: ["geopolitics", "politics"] },
  { source: "NPR", bucket: "western", url: "https://feeds.npr.org/1004/rss.xml", categories: ["geopolitics", "politics"] },
  { source: "Deutsche Welle", bucket: "western", url: "https://rss.dw.com/rdf/rss-en-world", categories: ["geopolitics", "politics"] },
  { source: "WSJ", bucket: "western", url: "https://feeds.a.dj.com/rss/RSSWorldNews.xml", categories: ["geopolitics", "politics"] },
  { source: "WSJ Tech", bucket: "western", url: "https://feeds.a.dj.com/rss/RSSWSJD.xml", categories: ["tech_economy"] },

  // ---- Chinese ----
  { source: "SCMP", bucket: "chinese", url: "https://www.scmp.com/rss/91/feed", categories: ["geopolitics", "politics"] },
  { source: "SCMP Tech", bucket: "chinese", url: "https://www.scmp.com/rss/36/feed", categories: ["tech_economy"] },
  { source: "SCMP Economy", bucket: "chinese", url: "https://www.scmp.com/rss/92/feed", categories: ["tech_economy"] },
  { source: "SCMP China Economy", bucket: "chinese", url: "https://www.scmp.com/rss/318198/feed", categories: ["tech_economy"] },
  { source: "Global Times", bucket: "chinese", url: "https://www.globaltimes.cn/rss/outbrain.xml", categories: ["geopolitics", "politics", "tech_economy"] },
  { source: "Xinhua", bucket: "chinese", url: "https://english.news.cn/rss/worldrss.xml", categories: ["geopolitics", "politics"] },
  { source: "China Daily", bucket: "chinese", url: "https://www.chinadaily.com.cn/rss/world_rss.xml", categories: ["geopolitics", "politics"] },
  { source: "China Daily Business", bucket: "chinese", url: "https://www.chinadaily.com.cn/rss/bizchina_rss.xml", categories: ["tech_economy"] },

  // ---- Russian state media ----
  { source: "TASS", bucket: "russian_state", url: "https://tass.com/rss/v2.xml", categories: ["geopolitics", "politics", "tech_economy"] },
  { source: "RT", bucket: "russian_state", url: "https://www.rt.com/rss/news/", categories: ["geopolitics", "politics"] },
  { source: "Sputnik", bucket: "russian_state", url: "https://sputnikglobe.com/export/rss2/archive/index.xml", categories: ["geopolitics", "politics"] },

  // ---- Middle Eastern ----
  { source: "Al Jazeera", bucket: "middle_eastern", url: "https://www.aljazeera.com/xml/rss/all.xml", categories: ["geopolitics", "politics", "tech_economy"] },
  { source: "Middle East Eye", bucket: "middle_eastern", url: "https://www.middleeasteye.net/rss", categories: ["geopolitics", "politics"] },
  { source: "Times of Israel", bucket: "middle_eastern", url: "https://www.timesofisrael.com/feed/", categories: ["geopolitics", "politics"] },
  { source: "Arab News", bucket: "middle_eastern", url: "https://www.arabnews.com/rss.xml", categories: ["geopolitics", "politics"] },

  // ---- Tech & Economy extra ----
  { source: "Nikkei Asia", bucket: "western", url: "https://asia.nikkei.com/rss/feed/nar", categories: ["tech_economy"] },
  { source: "Ars Technica", bucket: "western", url: "https://feeds.arstechnica.com/arstechnica/technology-lab", categories: ["tech_economy"] },
];

export function feedsForCategory(category: Category): FeedSource[] {
  return ALL.filter((f) => f.categories.includes(category));
}

export const ALL_FEEDS = ALL;
