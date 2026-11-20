// 記事の中の表（.dt-root の .dt-wrap）に、右上の小さな「拡大マーク」ボタンを付ける（2026-11-20）。
// 押すと、表を画面いっぱいに出す。拡大縮小は、2本指（ピンチ）と、「−」「＋」ボタンの両方でできる。
// ブラウザ任せの拡大は、ページ全体の標準の大きさより小さくできず、機種によっても動きが違う。
// そこで、スクリプトで拡大率（CSS の zoom）を変えて、標準より小さくもできるようにする。
// ボタンの帯は、表の上の別の行にして、表に重ならないようにする。閉じるボタン・Esc で閉じる。
const wraps = document.querySelectorAll<HTMLElement>(".dt-root .dt-wrap");

const MIN = 0.4;
const MAX = 3;

const EXPAND_ICON =
	'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6"/><path d="M10 20H4v-6"/><path d="M20 4l-7 7"/><path d="M4 20l7-7"/></svg>';

function openFullscreen(source: HTMLElement, opener: HTMLElement) {
	const overlay = document.createElement("div");
	overlay.className = "dt-fs-overlay";
	overlay.setAttribute("role", "dialog");
	overlay.setAttribute("aria-modal", "true");
	overlay.setAttribute("aria-label", "表を全画面で表示");

	const bar = document.createElement("div");
	bar.className = "dt-fs-bar";
	const mk = (text: string, label: string, cls = "dt-fs-ctl") => {
		const b = document.createElement("button");
		b.type = "button";
		b.className = cls;
		b.textContent = text;
		b.setAttribute("aria-label", label);
		return b;
	};
	const minus = mk("−", "縮小");
	const plus = mk("＋", "拡大");
	const close = mk("閉じる ×", "閉じる", "dt-fs-close");
	bar.append(minus, plus, close);

	const scroller = document.createElement("div");
	scroller.className = "dt-fs-scroll";
	const inner = document.createElement("div");
	inner.className = "dt-root dt-fs";
	inner.appendChild(source.cloneNode(true));
	scroller.appendChild(inner);

	overlay.append(bar, scroller);
	document.body.appendChild(overlay);
	const prevOverflow = document.body.style.overflow;
	document.body.style.overflow = "hidden";
	close.focus();

	let scale = 1;
	const apply = (next: number, cx = scroller.clientWidth / 2, cy = scroller.clientHeight / 2) => {
		const clamped = Math.min(MAX, Math.max(MIN, next));
		const ratio = clamped / scale;
		if (ratio === 1) return;
		// 拡大縮小の中心（指の真ん中）が動かないように、スクロール位置を直す
		const left = (scroller.scrollLeft + cx) * ratio - cx;
		const top = (scroller.scrollTop + cy) * ratio - cy;
		scale = clamped;
		(inner.style as CSSStyleDeclaration & { zoom: string }).zoom = String(scale);
		scroller.scrollLeft = left;
		scroller.scrollTop = top;
	};
	plus.addEventListener("click", () => apply(scale * 1.25));
	minus.addEventListener("click", () => apply(scale / 1.25));

	// 2本指の拡大縮小
	let startDist = 0;
	let startScale = 1;
	const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
	scroller.addEventListener(
		"touchstart",
		(e) => {
			if (e.touches.length === 2) {
				startDist = dist(e.touches);
				startScale = scale;
			}
		},
		{ passive: true },
	);
	scroller.addEventListener(
		"touchmove",
		(e) => {
			if (e.touches.length === 2 && startDist > 0) {
				e.preventDefault();
				const rect = scroller.getBoundingClientRect();
				const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
				const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
				apply(startScale * (dist(e.touches) / startDist), cx, cy);
			}
		},
		{ passive: false },
	);
	scroller.addEventListener("touchend", (e) => {
		if (e.touches.length < 2) startDist = 0;
	});

	const finish = () => {
		overlay.remove();
		document.body.style.overflow = prevOverflow;
		document.removeEventListener("keydown", onKey);
		opener.focus();
	};
	const onKey = (e: KeyboardEvent) => {
		if (e.key === "Escape") finish();
		else if (e.key === "+" || e.key === "=") apply(scale * 1.25);
		else if (e.key === "-") apply(scale / 1.25);
	};
	document.addEventListener("keydown", onKey);
	close.addEventListener("click", finish);
}

for (const wrap of wraps) {
	const root = wrap.parentElement;
	if (!root) continue;
	const btn = document.createElement("button");
	btn.type = "button";
	btn.className = "dt-fs-btn";
	btn.innerHTML = EXPAND_ICON;
	btn.setAttribute("aria-label", "この表を全画面で見る（拡大縮小できます）");
	btn.setAttribute("title", "全画面で見る");
	btn.addEventListener("click", () => openFullscreen(wrap, btn));
	root.appendChild(btn);
}
