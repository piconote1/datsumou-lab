// タイトルを、折り返してよい単位（文節に近いまとまり）に分ける。
// 「東京の」だけが1行に残る、「クリニッ／ク」のように語の途中で切れる、といった変な折り返しを防ぐ。
// ブラウザの自動の文節判定（word-break: auto-phrase）は、長い文節が入らないと、その前で改行して短い行を作るため使わない。
const ATTACH = new Set([
	"の", "を", "は", "が", "に", "で", "と", "も", "や", "へ", "ず", "つ", "ずつ", "から", "まで", "より",
	"られる", "れる", "ます", "です", "た", "て", "し", "する", "すれ",
	"回", "機", "院", "駅", "円", "件", "本",
	"・", "、", "。", "）", "」", "』", ")", "!", "?", "！", "？", "％", "%",
]);
const OPEN = new Set(["（", "「", "『", "("]);
const KATAKANA = /^[ァ-ヶー]+$/;
const DIGIT = /^[0-9０-９]+$/;

export function titleChunks(text: string): string[] {
	let segs: string[];
	try {
		const seg = new Intl.Segmenter("ja", { granularity: "word" });
		segs = Array.from(seg.segment(text), (s) => s.segment);
	} catch {
		return [text];
	}
	const chunks: string[] = [];
	let prevOpen = false;
	for (const s of segs) {
		const last = chunks.length - 1;
		const attach =
			last >= 0 &&
			(ATTACH.has(s) ||
				prevOpen ||
				(KATAKANA.test(s) && KATAKANA.test(chunks[last])) ||
				(DIGIT.test(chunks[last]) && /^[回年月日円万千本件]/.test(s)));
		if (attach) chunks[last] += s;
		else chunks.push(s);
		prevOpen = OPEN.has(s);
	}
	return chunks;
}
