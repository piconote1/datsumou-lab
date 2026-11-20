// サイトマップの目次（2026-11-21）。
// EmDash の自動の目次は、記事（posts）と固定ページ（pages）しか載せない。
// 同じ目次に、トップとカテゴリーのサイトマップ（sitemap-extra.xml）も載せるため、目次を自分で作る。
// （EmDash は、src/pages/sitemap.xml.ts があると、自動の目次を使わない。）
import type { APIRoute } from "astro";
import { getEmDashCollection } from "emdash";

export const prerender = false;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function lastmodOf(collection: string): Promise<string | null> {
	try {
		const { entries } = await getEmDashCollection(collection, { orderBy: { updated_at: "desc" }, limit: 1 });
		const d = (entries[0]?.data as { updatedAt?: Date } | undefined)?.updatedAt;
		return d ? d.toISOString() : null;
	} catch {
		return null;
	}
}

export const GET: APIRoute = async ({ url }) => {
	const origin = url.origin;
	const items: { name: string; lastmod: string | null }[] = [
		{ name: "posts", lastmod: await lastmodOf("posts") },
		{ name: "pages", lastmod: await lastmodOf("pages") },
		{ name: "extra", lastmod: null }, // トップとカテゴリー（自動の分には入らないページ）
	];
	const body =
		'<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
		items
			.map(
				(i) =>
					`  <sitemap>\n    <loc>${esc(`${origin}/sitemap-${i.name}.xml`)}</loc>${
						i.lastmod ? `\n    <lastmod>${esc(i.lastmod)}</lastmod>` : ""
					}\n  </sitemap>`,
			)
			.join("\n") +
		"\n</sitemapindex>\n";
	return new Response(body, {
		headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
	});
};
