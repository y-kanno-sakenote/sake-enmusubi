// 会モードURLの共通パーサ（index / map / list の3面で共有）。
// 新形式 ?k=ID[.顔],ID[.顔],…   ID＝蔵の短ID（県＋蔵名から決定的に生成・5文字）／顔は空白を _ にした銘柄。
//        顔を省いた蔵は、その蔵の代表銘柄が顔になる。
// 旧形式 ?kai=県:蔵名:銘柄,…    2026-09-08以前に配ったURL・QRを生かすため、そのまま読める。
// 見つからない指定は console に警告して捨てる（推測で別の蔵に当てない）。
(() => {
  const coreN = n => n.replace(/株式会社|有限会社|合資会社|合名会社|合同会社|[㈱㈲㈴]|[（(](株|有|資|名|同)[)）]|[\s　]/g, '');
  const main = b => b.replace(/[（(].*?[)）]/g, '').split(/[・／,、]/)[0].trim() || b;

  // list … KURA（札・一覧）でも KURA_MAP（地図）でも使える。戻り値は [{k, face}]、無ければ null
  window.parseKai = function (list) {
    const q = new URLSearchParams(location.search);
    const out = [];
    const nk = q.get('k');
    if (nk) {
      for (const part of nk.split(',')) {
        const dot = part.indexOf('.');
        const id = (dot < 0 ? part : part.slice(0, dot)).trim();
        const face = dot < 0 ? '' : part.slice(dot + 1).replace(/_/g, ' ').trim();
        const k = id && list.find(x => x.id === id);
        if (k) out.push({ k, face: face || main(k.b) });
        else console.warn('会モード：見つからない指定 →', part);
      }
    } else {
      const ok = q.get('kai');
      if (!ok) return null;
      for (const part of ok.split(',')) {
        const [p, n, b] = part.split(':').map(x => (x || '').trim());
        const k = p && n && list.find(x => x.p === p && coreN(x.n) === coreN(n));
        if (k) out.push({ k, face: b || main(k.b) });
        else console.warn('会モード：見つからない指定 →', part);
      }
    }
    return out.length ? out : null;
  };
})();
