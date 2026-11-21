// 記事の中の Google マイマップ（iframe）は、読み込むと外部の通信が約30件・約500KB 増え、ページの反応が遅くなる。
// そこで、最初は地図を読み込まず、「地図を表示する」ボタンを出す。押したときに、はじめて地図を読み込む（2026-11-21）。
// 地図は、記事を読むための補助で、表や本文の文字には影響しない。
export {};

const mapFrames = document.querySelectorAll<HTMLIFrameElement>('iframe[src*="google.com/maps"]');

for (const frame of mapFrames) {
	const src = frame.getAttribute("src");
	if (!src) continue;
	const h = Number(frame.getAttribute("height")) || frame.clientHeight || 420;
	const label = frame.getAttribute("title") || "地図";

	const box = document.createElement("div");
	box.style.cssText =
		"display:flex;align-items:center;justify-content:center;width:100%;border:1px solid #d8dee4;border-radius:12px;background:#f3f5f7;";
	box.style.height = `${Math.min(h, 420)}px`;

	const btn = document.createElement("button");
	btn.type = "button";
	btn.textContent = "地図を表示する";
	btn.setAttribute("aria-label", `${label}を表示する`);
	btn.style.cssText =
		"min-height:44px;padding:0.6rem 1.4rem;border:0;border-radius:999px;background:#1f2933;color:#fff;font-weight:700;cursor:pointer;font-size:0.9375rem;";

	frame.removeAttribute("src");
	frame.style.display = "none";
	frame.parentElement?.insertBefore(box, frame);
	box.appendChild(btn);

	btn.addEventListener("click", () => {
		frame.setAttribute("src", src);
		frame.style.display = "";
		box.remove();
	});
}
