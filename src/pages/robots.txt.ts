// robots.txt（2026-11-21）。
// EmDash の自動の robots.txt は、/_emdash/ をすべて止めるため、記事の画像（/_emdash/api/media/file/）も
// 検索エンジンが取得できなくなる。画像の URL だけ許可するため、自分で出す（src/pages があると、EmDash の方は使われない）。
// Google は、より具体的な（長い）規則を優先するので、Allow が Disallow に勝つ。
import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = ({ url }) => {
	const body = [
		"User-agent: *",
		"Allow: /",
		"",
		"# 管理画面と API は止める。ただし、記事の画像のファイルは許可する",
		"Disallow: /_emdash/",
		"Allow: /_emdash/api/media/file/",
		"",
		`Sitemap: ${url.origin}/sitemap.xml`,
		"",
	].join("\n");
	return new Response(body, {
		headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
	});
};
