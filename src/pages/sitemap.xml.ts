// サイトマップの目次（2026-11-21）。
// EmDash の自動の目次は、記事（posts）と固定ページ（pages）しか載せない。
// 同じ目次に、トップとカテゴリーのサイトマップ（sitemap-extra.xml）も載せるため、目次を自分で作る。
// （EmDash は、src/pages/sitemap.xml.ts があると、自動の目次を使わない。）
// 形は、EmDash の自動の目次と同じ（全項目に loc と lastmod を付ける）。
// 目次に載るURLの合計は、記事21＋固定ページ3＋トップとカテゴリー7＝31（2026-11-21 時点）。
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
	const posts = await lastmodOf("posts");
	const pages = await lastmodOf("pages");
	// トップとカテゴリーは、記事の更新で変わるので、記事の最終更新日を使う
	const items: { name: string; lastmod: string }[] = [
		{ name: "posts", lastmod: posts ?? new Date().toISOString() },
		{ name: "pages", lastmod: pages ?? new Date().toISOString() },
		{ name: "extra", lastmod: posts ?? new Date().toISOString() },
	];
	const lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'];
	for (const i of items) {
		lines.push("  <sitemap>");
		lines.push(`    <loc>${esc(`${origin}/sitemap-${i.name}.xml`)}</loc>`);
		lines.push(`    <lastmod>${esc(i.lastmod)}</lastmod>`);
		lines.push("  </sitemap>");
	}
	lines.push("</sitemapindex>");
	return new Response(lines.join("\n"), {
		headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
	});
};
