export const INDEXNOW_KEY = "4f8b2e91c3a74d608e5b19f2a7c4d038";
export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

export async function submitToIndexNow(origin: string, urls: string[]): Promise<Response> {
	const host = new URL(origin).hostname;
	const cleanUrls = urls.filter((u) => {
		try {
			return new URL(u).hostname === host;
		} catch {
			return false;
		}
	});
	if (cleanUrls.length === 0) {
		throw new Error("No valid URLs matching host for IndexNow submission");
	}
	return fetch(INDEXNOW_ENDPOINT, {
		method: "POST",
		headers: { "Content-Type": "application/json; charset=utf-8" },
		body: JSON.stringify({
			host,
			key: INDEXNOW_KEY,
			keyLocation: `${origin}/${INDEXNOW_KEY}.txt`,
			urlList: cleanUrls.slice(0, 10000),
		}),
	});
}
