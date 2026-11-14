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
		return (handler as { fetch: (r: Request, e: unknown, c: ExecutionContext) => Promise<Response> }).fetch(
			request,
			env,
			ctx,
		);
	},
	scheduled: createScheduledHandler(),
} satisfies ExportedHandler;
