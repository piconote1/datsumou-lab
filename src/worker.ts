import handler, { createScheduledHandler, PluginBridge } from "@emdash-cms/cloudflare/worker";

export { PluginBridge };

// http でアクセスされたら、https へ恒久的に転送する（2026-11-14 SEO対応）。
// 転送がないと、http と https の2つの URL が同じ内容で表示される。
// ローカル確認（localhost など）では転送しない。
const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\]|.*\.local)$/i;

export default {
	...handler,
	async fetch(request: Request, env: unknown, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		if (url.protocol === "http:" && !LOCAL_HOST.test(url.hostname)) {
			url.protocol = "https:";
			// GET・HEAD は 301、それ以外は、方法を保つ 308
			const status = request.method === "GET" || request.method === "HEAD" ? 301 : 308;
			return Response.redirect(url.toString(), status);
		}
		// 末尾が「/」の URL（トップ・管理画面・API を除く）は、「/」なしの URL へ 301 で転送する（2026-11-20）。
		// 同じ内容が2つの URL で表示されるのを防ぐ。
		if (
			(request.method === "GET" || request.method === "HEAD") &&
			url.pathname.length > 1 &&
			url.pathname.endsWith("/") &&
			!url.pathname.startsWith("/_emdash/") &&
			!LOCAL_HOST.test(url.hostname)
		) {
			url.pathname = url.pathname.replace(/\/+$/, "") || "/";
			return Response.redirect(url.toString(), 301);
		}
		const res = await (handler as { fetch: (r: Request, e: unknown, c: ExecutionContext) => Promise<Response> }).fetch(
			request,
			env,
			ctx,
		);
		// ヘッダーの追加（2026-11-20）。本番（https）のときだけ。転送（3xx）と WebSocket には付けない。
		if (LOCAL_HOST.test(url.hostname) || res.status === 101 || (res.status >= 300 && res.status < 400)) return res;
		const headers = new Headers(res.headers);
		// HSTS: https だけで使うよう、ブラウザに記憶させる。サブドメインにも適用する（2026-11-21。使っているサブドメインは www のみで、https で動く）。
		headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
		// 画像などのメディアは、ファイル名（ID）が変わらない限り中身が変わらない。長く保存してよい。
		if (url.pathname.startsWith("/_emdash/api/media/file/") && res.status === 200) {
			headers.set("Cache-Control", "public, max-age=31536000, immutable");
		}
		const isHtml = (res.headers.get("content-type") ?? "").includes("text/html");
		const isPublicPage = isHtml && request.method === "GET" && !url.pathname.startsWith("/_emdash/");
		if (isPublicPage) {
			// 公開ページの HTML（2026-11-21）。ログインしている人（Cookie あり）の画面は対象外。
			// ブラウザは毎回確認し、エッジ（Cloudflare）は60秒だけ保存してよい、という指定。記事を直したら、すぐ反映される。
			if (res.status === 200 && !request.headers.get("cookie") && !headers.has("cache-control")) {
				headers.set("Cache-Control", "public, max-age=0, s-maxage=60");
			}
			// CSP は、まず「報告だけ」の形で付ける（表示は止めない）。違反があればブラウザのコンソールに出るので、後で本番の形にできる。
			headers.set(
				"Content-Security-Policy-Report-Only",
				"default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://cloudflareinsights.com; frame-src https://www.google.com; base-uri 'self'; form-action 'self'; object-src 'none'",
			);
		}
		const out = new Response(res.body, { status: res.status, statusText: res.statusText, headers });
		// 記事（/posts/…）の構造化データ（BlogPosting）の、出版者と著者を、サイトの組織情報（#organization）に結びつける（2026-11-21）。
		// EmDash の本体は、出版者を名前だけ、著者を人物の形で出す。ここで、組織情報（ロゴつき）を指す形に書き換える。
		if (isPublicPage && res.status === 200 && url.pathname.startsWith("/posts/")) {
			const orgId = `${url.origin}/#organization`;
			let buf = "";
			return new HTMLRewriter()
				.on('script[type="application/ld+json"]', {
					text(chunk) {
						buf += chunk.text;
						if (!chunk.lastInTextNode) {
							chunk.remove();
							return;
						}
						let outText = buf;
						try {
							const j = JSON.parse(buf);
							if (j && j["@type"] === "BlogPosting") {
								j.author = { "@type": "Organization", "@id": orgId, name: j.author?.name ?? "脱毛研究室" };
								j.publisher = { "@id": orgId };
								j.inLanguage = "ja";
								outText = JSON.stringify(j).replace(/</g, "\\u003c");
							}
						} catch {
							// 解析できなければ、元のまま出す
						}
						buf = "";
						chunk.replace(outText, { html: true });
					},
				})
				.transform(out);
		}
		return out;
	},
	scheduled: createScheduledHandler(),
} satisfies ExportedHandler;
