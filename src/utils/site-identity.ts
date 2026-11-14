/** Resolved media reference from getSiteSettings() */
export interface MediaReference {
	mediaId: string;
	alt?: string;
	url?: string;
}

export interface BlogSiteIdentitySettings {
	title?: string;
	tagline?: string;
	logo?: MediaReference;
	favicon?: MediaReference;
}

const DEFAULT_SITE_TITLE = "My Blog";
const DEFAULT_SITE_TAGLINE = "Thoughts, stories, and ideas.";

/**
 * 検索結果のタイトルに付ける、短いサイト名（2026-11-14 SEO対応）。
 * サイト名が「脱毛研究室｜脱毛クリニックの選び方」のように「｜」でつながっているときは、前の部分（脱毛研究室）だけを使う。
 * 全記事のタイトルの末尾が長くなり、検索結果で切れるのを防ぐ。トップページのタイトルは、今までどおり長い形のまま。
 */
export function shortSiteTitle(title: string): string {
	return title.split(/\s*[｜|]\s*/)[0].trim() || title;
}

export function resolveBlogSiteIdentity(settings?: BlogSiteIdentitySettings) {
	const siteTitle = settings?.title ?? DEFAULT_SITE_TITLE;
	return {
		siteTitle,
		siteShortTitle: shortSiteTitle(siteTitle),
		siteTagline: settings?.tagline ?? DEFAULT_SITE_TAGLINE,
		siteLogo: settings?.logo?.url ? settings.logo : null,
	};
}
