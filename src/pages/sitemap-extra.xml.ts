// トップとカテゴリーのページの sitemap（2026-11-20 追加）。
// EmDash が作る sitemap（記事・固定ページ）には、トップとカテゴリーのページが入らないため、別に出す。
// 使い方: Search Console の「サイトマップ」に、/sitemap-extra.xml を追加する。
import type { APIRoute } from "astro";
import { getTaxonomyTermsWithCacheHint } from "emdash";

export const GET: APIRoute = async ({ url }) => {
	const origin = url.origin;
	const termsResult = await getTaxonomyTermsWithCacheHint("category", { includeCounts: false });
	const paths = ["/", ...termsResult.data.map((t) => `/category/${t.slug}`)];
	const body =
		'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
		paths.map((p) => `  <url><loc>${origin}${p === "/" ? "/" : p}</loc></url>`).join("\n") +
		"\n</urlset>\n";
	return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
};
