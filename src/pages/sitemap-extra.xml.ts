// トップとカテゴリーのページの sitemap（2026-11-20 追加、2026-11-21 作り直し）。
// EmDash が作る sitemap（記事・固定ページ）には、トップとカテゴリーのページが入らないため、別に出す。
// 目次（/sitemap.xml）から読まれる。
// 2026-11-21: データベースの取得に失敗しても、エラー（500）にならないよう、固定の一覧を代わりに出す。
// キャッシュの指定も、ほかのサイトマップと同じにする。
import type { APIRoute } from "astro";
import { getTaxonomyTermsWithCacheHint } from "emdash";

export const prerender = false;

// 取得に失敗したときの、代わりの一覧（カテゴリーの slug）
const FALLBACK_CATEGORIES = ["select", "region", "basic", "money", "visit", "faq"];

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
	const paths = ["/", ...slugs.map((s) => `/category/${s}`)];
	const body =
		'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
		paths.map((p) => `  <url><loc>${origin}${p}</loc></url>`).join("\n") +
		"\n</urlset>\n";
	return new Response(body, {
		headers: {
			"Content-Type": "application/xml; charset=utf-8",
			"Cache-Control": "public, max-age=3600",
		},
	});
};
