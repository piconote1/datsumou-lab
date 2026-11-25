// 記事の中の「タブ切り替えの比較表」（.dt-tabs）を、タブで切り替えられるようにする（2026-11-23）。
// HTML には、表（パネル）が3つ並んで入っている。スクリプトが動かなくても、3つとも読める。
// 動くときだけ、先頭にタブのボタンを出して、選んだ表だけを表示する。
export {};

const roots = document.querySelectorAll<HTMLElement>(".dt-tabs");

for (const root of roots) {
	const panels = Array.from(root.querySelectorAll<HTMLElement>(":scope > [data-tab-title]"));
	if (panels.length < 2) continue;

	const bar = document.createElement("div");
	bar.className = "dt-tabs__tabs";
	bar.setAttribute("role", "tablist");

	const buttons = panels.map((panel, i) => {
		const btn = document.createElement("button");
		btn.type = "button";
		btn.className = "dt-tabs__tab";
		btn.setAttribute("role", "tab");
		btn.textContent = panel.dataset.tabTitle || `表${i + 1}`;
		btn.addEventListener("click", () => show(i));
		btn.addEventListener("keydown", (e) => {
			if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
			const next = (i + (e.key === "ArrowRight" ? 1 : -1) + panels.length) % panels.length;
			show(next);
			buttons[next].focus();
		});
		panel.setAttribute("role", "tabpanel");
		bar.appendChild(btn);
		return btn;
	});

	let mapsActivated = false;
	const mountMapFrame = (link: HTMLAnchorElement, href: string) => {
		const frame = document.createElement("iframe");
		frame.src = href;
		frame.title = link.textContent?.trim() || "Googleマップ";
		frame.width = "100%";
		frame.height = "420";
		frame.loading = "lazy";
		frame.referrerPolicy = "no-referrer-when-downgrade";
		frame.allowFullscreen = true;
		return frame;
	};
	const hydrateMaps = (panel: HTMLElement) => {
		for (const link of panel.querySelectorAll<HTMLAnchorElement>('a.dt-map-embed[href*="google.com/maps"]')) {
			const href = link.getAttribute("href");
			if (!href) continue;
			if (mapsActivated) {
				link.replaceWith(mountMapFrame(link, href));
				continue;
			}
			const box = link.parentElement;
			if (!box || box.querySelector(".dt-map-btn")) continue;
			const label = link.textContent?.trim() || "地図";
			const wrap = document.createElement("div");
			wrap.className = "dt-map-facade";
			const btn = document.createElement("button");
			btn.type = "button";
			btn.className = "dt-map-btn";
			btn.textContent = "地図を表示する";
			btn.setAttribute("aria-label", `${label}を表示する`);
			wrap.appendChild(btn);
			link.hidden = true;
			box.appendChild(wrap);
			btn.addEventListener("click", () => {
				mapsActivated = true;
				wrap.remove();
				link.hidden = false;
				link.replaceWith(mountMapFrame(link, href));
			});
		}
	};

	const show = (index: number) => {
		if (index !== 0) ensureEqualized();
		panels.forEach((panel, k) => {
			panel.hidden = k !== index;
			buttons[k].setAttribute("aria-selected", String(k === index));
			buttons[k].tabIndex = k === index ? 0 : -1;
		});
		if (panels[index]) hydrateMaps(panels[index]);
	};

	// 表の高さを、3つのタブで同じにする。タブを切り替えても、下の本文が上下に動かない。
	// 初回表示の強制リフローを避けるため、タブを初めて操作したタイミングで1回だけ計測・調整する。
	let equalized = false;
	const equalize = () => {
		const rowSets = panels.map((panel) => Array.from(panel.querySelectorAll<HTMLElement>("tr")));
		const rowCount = Math.max(0, ...rowSets.map((rows) => rows.length));
		if (rowCount === 0) return;

		const current = buttons.findIndex((b) => b.getAttribute("aria-selected") === "true");
		// 1) 一括リセット書き込み
		for (const panel of panels) {
			panel.style.minHeight = "";
			panel.hidden = false;
			for (const tr of panel.querySelectorAll<HTMLElement>("tr")) tr.style.height = "";
		}
		// 2) 一括読み取り（強制リフローは最大1回のみ）
		const heights: number[] = [];
		for (let i = 0; i < rowCount; i++) {
			let maxH = 0;
			for (const set of rowSets) {
				const row = set[i];
				if (row) {
					const h = row.getBoundingClientRect().height;
					if (h > maxH) maxH = h;
				}
			}
			heights.push(maxH);
		}
		// 3) 一括高さ書き込みとパネル復元
		for (let i = 0; i < rowCount; i++) {
			const h = heights[i];
			if (!h) continue;
			for (const set of rowSets) {
				const row = set[i];
				if (row) row.style.height = `${h}px`;
			}
		}
		panels.forEach((panel, k) => {
			panel.hidden = k !== current;
		});
	};
	const ensureEqualized = () => {
		if (equalized) return;
		equalized = true;
		equalize();
	};

	root.insertBefore(bar, panels[0]);
	show(0);
	for (const ev of ["pointerdown", "touchstart", "focusin"] as const) {
		bar.addEventListener(ev, ensureEqualized, { once: true, passive: true });
	}
	let timer: number | undefined;
	window.addEventListener("resize", () => {
		if (!equalized) return;
		window.clearTimeout(timer);
		timer = window.setTimeout(equalize, 150);
	});
}

// 店舗情報タブの「店舗一覧」を、ポップアップ（モーダル）にする。表の高さは、変わらない。
// 一覧は、地域ごとに、各院を並べる。リストの中身は、記事のHTMLに入っている。
const REGIONS: Array<[string, string[]]> = [
	["北海道", ["札幌", "旭川"]],
	["東北", ["青森", "八戸", "盛岡", "仙台", "秋田", "郡山", "いわき"]],
	["関東", ["新宿", "銀座", "渋谷", "池袋", "上野", "立川", "町田", "吉祥寺", "東銀座", "大宮", "千葉", "柏", "船橋", "横浜", "桜木町", "川崎", "高崎", "宇都宮", "水戸"]],
	["甲信越・北陸", ["新潟", "富山", "金沢", "福井", "長野"]],
	["東海", ["岐阜", "静岡", "浜松", "名古屋", "名駅", "四日市"]],
	["近畿", ["梅田", "心斎橋", "天王寺", "なんば", "京都", "神戸", "姫路", "奈良", "和歌山", "彦根", "大阪"]],
	["中国・四国", ["広島", "岡山", "山口", "徳島", "高松", "松山", "高知"]],
	["九州・沖縄", ["福岡", "天神", "博多", "小倉", "久留米", "長崎", "佐世保", "大分", "熊本", "宮崎", "鹿児島", "那覇", "沖縄"]],
];
const regionOf = (name: string) => REGIONS.find(([, keys]) => keys.some((k) => name.includes(k)))?.[0] ?? "その他";

const openStores = (title: string, links: HTMLAnchorElement[]) => {
	const overlay = document.createElement("div");
	overlay.className = "dt-modal";
	overlay.setAttribute("role", "dialog");
	overlay.setAttribute("aria-modal", "true");
	const box = document.createElement("div");
	box.className = "dt-modal__box";
	const head = document.createElement("div");
	head.className = "dt-modal__head";
	const h = document.createElement("strong");
	h.textContent = title;
	const close = document.createElement("button");
	close.type = "button";
	close.className = "dt-modal__close";
	close.setAttribute("aria-label", "閉じる");
	close.textContent = "×";
	head.append(h, close);
	const body = document.createElement("div");
	body.className = "dt-modal__body";
	const groups = new Map<string, HTMLAnchorElement[]>();
	for (const a of links) {
		const r = regionOf(a.textContent || "");
		if (!groups.has(r)) groups.set(r, []);
		groups.get(r)?.push(a);
	}
	for (const region of [...REGIONS.map(([name]) => name), "その他"]) {
		const items = groups.get(region);
		if (!items) continue;
		const sec = document.createElement("section");
		sec.className = "dt-modal__reg";
		const t = document.createElement("h4");
		t.textContent = region === "その他" && links.length === 1 ? "公式サイトの一覧" : region;
		const ul = document.createElement("ul");
		for (const a of items) {
			const li = document.createElement("li");
			const link = document.createElement("a");
			link.href = a.href;
			link.target = "_blank";
			link.rel = "noopener";
			link.textContent = a.textContent;
			li.appendChild(link);
			ul.appendChild(li);
		}
		sec.append(t, ul);
		body.appendChild(sec);
	}
	box.append(head, body);
	overlay.appendChild(box);
	const prev = document.activeElement as HTMLElement | null;
	const onKey = (e: KeyboardEvent) => {
		if (e.key === "Escape") shut();
	};
	const shut = () => {
		overlay.remove();
		document.removeEventListener("keydown", onKey);
		document.body.style.overflow = "";
		prev?.focus();
	};
	close.addEventListener("click", shut);
	overlay.addEventListener("click", (e) => {
		if (e.target === overlay) shut();
	});
	document.addEventListener("keydown", onKey);
	document.body.style.overflow = "hidden";
	document.body.appendChild(overlay);
	close.focus();
};

// 表（タブ）と、各院の詳細表の、どちらにも付ける。院名は、表の行のリンクか、詳細表の直前の見出し（h3）から取る。
const clinicNameFor = (box: HTMLElement): string => {
	const fromRow = box.closest("tr")?.querySelector<HTMLElement>("a.dt-name")?.textContent?.trim();
	if (fromRow) return fromRow;
	let el: Element | null = box.closest(".dt-root");
	while (el) {
		let prev: Element | null = el.previousElementSibling;
		while (prev) {
			if (prev.tagName === "H3") return prev.textContent?.trim() || "";
			prev = prev.previousElementSibling;
		}
		el = el.parentElement;
	}
	return "";
};

for (const box of document.querySelectorAll<HTMLElement>(".dt-root .dt-stores")) {
	const label = box.querySelector<HTMLElement>(".dt-stores__label");
	const list = box.querySelector<HTMLElement>("ul");
	if (!label || !list) continue;
	const links = Array.from(list.querySelectorAll<HTMLAnchorElement>("a"));
	const clinic = clinicNameFor(box);
	const btn = document.createElement("button");
	btn.type = "button";
	btn.className = "dt-stores__btn";
	btn.textContent = "店舗一覧を見る";
	btn.setAttribute("aria-haspopup", "dialog");
	label.replaceWith(btn);
	list.hidden = true;
	btn.addEventListener("click", () => openStores(links.length > 1 ? `${clinic}の店舗一覧（${links.length}院）` : `${clinic}の店舗一覧`, links));
}
