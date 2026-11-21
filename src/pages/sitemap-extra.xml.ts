// トップとカテゴリーのページの sitemap（2026-11-20 追加、2026-11-21 作り直し）。
// EmDash が作る sitemap（記事・固定ページ）には、トップとカテゴリーのページが入らないため、別に出す。
// 目次（/sitemap.xml）から読まれる。
// 2026-11-21: データベースの取得に失敗しても、エラー（500）にならないよう、固定の一覧を代わりに出す。
// 形は、EmDash の自動のサイトマップと同じ（各 url に loc と lastmod を付ける）。
import type { APIRoute } from "astro";
import { getEmDashCollection, getTaxonomyTermsWithCacheHint } from "emdash";

export const prerender = false;

// 取得に失敗したときの、代わりの一覧（カテゴリーの slug）
const FALLBACK_CATEGORIES = ["select", "region", "basic", "money", "visit", "faq"];

async function latestPostUpdate(): Promise<string> {
	try {
		const { entries } = await getEmDashCollection("posts", { orderBy: { updated_at: "desc" }, limit: 1 });
		const d = (entries[0]?.data as { updatedAt?: Date } | undefined)?.updatedAt;
		if (d) return d.toISOString().replace(/\.\d{3}Z$/, "Z");
	} catch {
		// 現在の日時を使う
	}
	return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

export const GET: APIRoute = async ({ url }) => {
	const origin = url.origin;
	let slugs: string[] = FALLBACK_CATEGORIES;
	try {
		const termsResult = await getTaxonomyTermsWithCacheHint("category", { includeCounts: false });
		const fromDb = termsResult.data.map((t) => t.slug).filter(Boolean);
		if (fromDb.length > 0) slugs = fromDb;
	} catch {
		// 代わりの一覧を使う
	}
	const lastmod = await latestPostUpdate();
	const paths = ["/", ...slugs.map((s) => `/category/${s}`)];
	const lines = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
	];
	for (const p of paths) {
		lines.push("  <url>");
		lines.push(`    <loc>${origin}${p}</loc>`);
		lines.push(`    <lastmod>${lastmod}</lastmod>`);
		lines.push("  </url>");
	}
	lines.push("</urlset>");
	return new Response(lines.join("\n"), {
		headers: {
			"Content-Type": "application/xml; charset=utf-8",
			"Cache-Control": "public, max-age=3600",
		},
	});
};
