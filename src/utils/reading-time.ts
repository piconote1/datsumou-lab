import type { PortableTextBlock } from "emdash";

const WORDS_PER_MINUTE = 200;
const CJK_CHARACTERS_PER_MINUTE = 500;
const WHITESPACE_REGEX = /\s+/;
const CJK_CHARACTER_REGEX =
	/\p{Script=Han}|\p{Script=Hangul}|\p{Script=Hiragana}|\p{Script=Katakana}/gu;

type PortableTextSpan = {
	_type: string;
	text?: string;
};

type PortableTextTextBlock = PortableTextBlock & {
	_type: "block";
	children: PortableTextSpan[];
};

type PortableTextHtmlBlock = PortableTextBlock & {
	_type: "htmlBlock";
	html?: string;
};

function isTextBlock(block: PortableTextBlock): block is PortableTextTextBlock {
	return block._type === "block" && Array.isArray(block.children);
}

function isHtmlBlock(block: PortableTextBlock): block is PortableTextHtmlBlock {
	return block._type === "htmlBlock" && typeof (block as PortableTextHtmlBlock).html === "string";
}

function stripHtml(html: string): string {
	return html
		.replace(/<style\b[\s\S]*?<\/style>/gi, " ")
		.replace(/<script\b[\s\S]*?<\/script>/gi, " ")
		.replace(/<!--[\s\S]*?-->/g, " ")
		.replace(/<[^>]+>/g, " ")
		.replace(/&nbsp;/gi, " ")
		.replace(/&amp;/gi, "&")
		.replace(/&lt;/gi, "<")
		.replace(/&gt;/gi, ">")
		.replace(/&quot;/gi, '"')
		.replace(/&#39;/gi, "'")
		.replace(/\s+/g, " ")
		.trim();
}

function extractNestedText(value: unknown): string {
	if (!value || typeof value !== "object") return "";
	if (Array.isArray(value)) {
		return value.map(extractNestedText).filter(Boolean).join(" ");
	}
	const rec = value as Record<string, unknown>;
	if (rec._type === "span" && typeof rec.text === "string") {
		return rec.text;
	}
	if (typeof rec.html === "string") {
		return stripHtml(rec.html);
	}
	const parts: string[] = [];
	if (typeof rec.text === "string") parts.push(rec.text);
	if (Array.isArray(rec.children)) parts.push(extractNestedText(rec.children));
	if (Array.isArray(rec.content)) parts.push(extractNestedText(rec.content));
	if (Array.isArray(rec.rows)) parts.push(extractNestedText(rec.rows));
	if (Array.isArray(rec.cells)) parts.push(extractNestedText(rec.cells));
	return parts.filter(Boolean).join(" ");
}

function countWords(text: string): number {
	return text.split(WHITESPACE_REGEX).filter(Boolean).length;
}

function countCjkCharacters(text: string): number {
	return text.match(CJK_CHARACTER_REGEX)?.length ?? 0;
}

/**
 * Extract plain text from Portable Text blocks (including htmlBlock and table blocks)
 */
export function extractText(blocks: PortableTextBlock[] | undefined): string {
	if (!blocks || !Array.isArray(blocks)) return "";

	return blocks
		.map((block) => {
			if (isTextBlock(block)) {
				return block.children
					.filter((child) => child._type === "span" && typeof child.text === "string")
					.map((span) => span.text)
					.join("");
			}
			if (isHtmlBlock(block)) {
				return stripHtml(block.html ?? "");
			}
			return extractNestedText(block);
		})
		.filter(Boolean)
		.join(" ");
}

/**
 * Calculate reading time in minutes from Portable Text content
 */
export function getReadingTime(content: PortableTextBlock[] | undefined): number {
	const text = extractText(content);
	const cjkCharacterCount = countCjkCharacters(text);
	const wordCount = countWords(text.replace(CJK_CHARACTER_REGEX, " "));
	const minutes = Math.ceil(
		wordCount / WORDS_PER_MINUTE + cjkCharacterCount / CJK_CHARACTERS_PER_MINUTE,
	);
	return Math.max(1, minutes);
}

/**
 * Format reading time for display
 */
export function formatReadingTime(minutes: number): string {
	return `約${minutes}分で読めます`;
}
