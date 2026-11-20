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
		// HSTS: https だけで使うよう、ブラウザに記憶させる（サブドメインは含めない）。
		headers.set("Strict-Transport-Security", "max-age=31536000");
		// 画像などのメディアは、ファイル名（ID）が変わらない限り中身が変わらない。長く保存してよい。
		if (url.pathname.startsWith("/_emdash/api/media/file/") && res.status === 200) {
			headers.set("Cache-Control", "public, max-age=31536000, immutable");
		}
		return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
	},
	scheduled: createScheduledHandler(),
} satisfies ExportedHandler;
