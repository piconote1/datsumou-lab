// サイトマップの目次（2026-11-22）。標準の形: /sitemap.xml（目次）→ 種類ごとの一覧（記事・固定ページ・カテゴリー）。
// EmDash 本体の目次は、コレクション（posts・pages）だけを載せる。カテゴリーも載せるため、同じ形式で、自分で出す。
// 出力の形式は、EmDash 本体の目次と同じ（<sitemapindex>、各 <sitemap> に loc と lastmod）。
import type { APIRoute } from "astro";
import { getEmDashCollection } from "emdash";

export const prerender = false;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const iso = (d?: Date | string | null) => {
	if (!d) return null;
	const t = d instanceof Date ? d : new Date(d);
	return Number.isNaN(t.getTime()) ? null : t.toISOString().replace(/\.\d{3}Z$/, "Z");
};

async function latest(collection: "posts" | "pages"): Promise<string | null> {
	try {
		const { entries } = await getEmDashCollection(collection, { orderBy: { updated_at: "desc" }, limit: 1 });
		return iso((entries[0]?.data as { updatedAt?: Date } | undefined)?.updatedAt);
	} catch {
		return null;
	}
}

export const GET: APIRoute = async ({ url }) => {
	const origin = url.origin;
	const posts = await latest("posts");
	const pages = await latest("pages");
	const now = iso(new Date())!;
	// カテゴリーの一覧は、記事の更新で変わるので、記事の最新の更新日を使う
	const items = [
		{ name: "posts", lastmod: posts ?? now },
		{ name: "pages", lastmod: pages ?? now },
		{ name: "categories", lastmod: posts ?? now },
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
