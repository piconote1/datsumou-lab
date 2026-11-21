// llms.txt（2026-11-21）。AI が、サイトの中身を把握するための、記事の一覧。
// Google 検索の順位には影響しないが、AI 検索の診断（agentic / GEO）で、あるとよい項目として挙がったため置く。
import type { APIRoute } from "astro";
import { getEmDashCollection } from "emdash";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
	const origin = url.origin;
	const lines: string[] = [
		"# 脱毛研究室",
		"",
		"> 公式に公開されている情報をもとに、医療脱毛クリニックの料金・脱毛機・条件を比べて整理するサイトです。",
		"",
		"## 記事",
		"",
	];
	try {
		const { entries } = await getEmDashCollection("posts", { orderBy: { updated_at: "desc" }, limit: 100 });
		for (const e of entries) {
			const d = e.data as { title?: string; excerpt?: string; slug?: string };
			const slug = d.slug ?? (e as { id?: string }).id;
			if (!d.title || !slug) continue;
			const desc = d.excerpt ? `: ${String(d.excerpt).replace(/\s+/g, " ").slice(0, 120)}` : "";
			lines.push(`- [${d.title}](${origin}/posts/${slug})${desc}`);
		}
	} catch {
		lines.push(`- [記事一覧](${origin}/posts)`);
	}
	lines.push("", "## そのほか", "", `- [サイトマップ](${origin}/sitemap.xml)`, "");
	return new Response(lines.join("\n"), {
		headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
	});
};
