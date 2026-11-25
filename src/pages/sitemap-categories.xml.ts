// カテゴリーの一覧（2026-11-22）。トップページも、ここに入れる（EmDash 本体の一覧は、記事と固定ページだけを載せるため）。
// 目次（/sitemap.xml）から読まれる。形式は、EmDash 本体の一覧と同じ（<urlset>、各 <url> に loc と lastmod）。
import type { APIRoute } from "astro";
import { getEmDashCollection, getTaxonomyTermsWithCacheHint } from "emdash";

export const prerender = false;

// データベースの取得に失敗したときの、代わりの一覧（カテゴリーの slug）
const FALLBACK_CATEGORIES = ["select", "region", "basic", "money", "visit", "faq"];
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const iso = (d?: Date | string | null) => {
	if (!d) return null;
	const t = d instanceof Date ? d : new Date(d);
	return Number.isNaN(t.getTime()) ? null : t.toISOString().replace(/\.\d{3}Z$/, "Z");
};

export const GET: APIRoute = async ({ url }) => {
	const origin = url.origin;
	let slugs = FALLBACK_CATEGORIES;
	try {
		const terms = await getTaxonomyTermsWithCacheHint("category", { includeCounts: false });
		const fromDb = terms.data.map((t) => t.slug).filter(Boolean);
		if (fromDb.length > 0) slugs = fromDb;
	} catch {
		// 代わりの一覧を使う
	}
	let lastmod: string | null = null;
	try {
		const { entries } = await getEmDashCollection("posts", { orderBy: { updated_at: "desc" }, limit: 1 });
		lastmod = iso((entries[0]?.data as { updatedAt?: Date } | undefined)?.updatedAt);
	} catch {
		// 日付なしで出す
	}
	const paths = ["/", "/posts", ...slugs.map((s) => `/category/${s}`)];
	const lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'];
	for (const p of paths) {
		lines.push("  <url>");
		lines.push(`    <loc>${esc(origin + p)}</loc>`);
		if (lastmod) lines.push(`    <lastmod>${esc(lastmod)}</lastmod>`);
		lines.push("  </url>");
	}
	lines.push("</urlset>");
	return new Response(lines.join("\n"), {
		headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
	});
};
