// 会モードURLの共通パーサ（index / map / list の3面で共有）。
// 新形式 ?k=ID[.顔],ID[.顔],…   ID＝蔵の短ID（県＋蔵名から決定的に生成・5文字）／顔は空白を _ にした銘柄。
//        顔を省いた蔵は、その蔵の代表銘柄が顔になる。
// 旧形式 ?kai=県:蔵名:銘柄,…    2026-09-08以前に配ったURL・QRを生かすため、そのまま読める。
// 見つからない指定は console に警告して捨てる（推測で別の蔵に当てない）。
(() => {
  const coreN = n => n.replace(/株式会社|有限会社|合資会社|合名会社|合同会社|[㈱㈲㈴]|[（(](株|有|資|名|同)[)）]|[\s　]/g, '');
  const main = b => b.replace(/[（(].*?[)）]/g, '').split(/[・／,、]/)[0].trim() || b;

  // 顔（札に出す銘柄）の圧縮。カタログにある銘柄は番号、スペックは下の辞書の番号で表す。
  //   ''=代表銘柄 / '1'=2番目の銘柄 / 's7'=代表銘柄＋純米酒 / '1s2'=2番目＋特別純米 / それ以外は生文字列
  // ★並び順を変えるとURLの意味が変わるので、この配列は末尾にしか足さない
  const SPEC = ['純米大吟醸', '純米吟醸', '特別純米', '特別本醸造', '大吟醸', '吟醸', '本醸造', '純米酒', '純米',
    '生原酒', '原酒', '生酒', 'にごり', '無濾過', 'ひやおろし', '新酒', '古酒', '山廃', '生酛', '辛口', '甘口'];
  const CODE = /^\d*(s\d+)?$/;   // コードとして解釈する形。生文字列がこの形になるときは頭に - を付けて逃がす
  const segsOf = k => (k.b + (k.b2 ? '・' + k.b2 : '')).replace(/[（(].*?[)）]/g, '')
    .split(/[・／,、]/).map(x => x.trim()).filter(Boolean);

  window.kaiFaceDecode = function (k, code) {
    if (!code) return main(k.b);
    if (code[0] === '-') return code.slice(1).replace(/_/g, ' ');
    if (!CODE.test(code)) return code.replace(/_/g, ' ');
    const m = code.match(/^(\d*)(?:s(\d+))?$/);
    const seg = segsOf(k)[m[1] ? +m[1] : 0];
    if (seg === undefined) return code.replace(/_/g, ' ');
    return m[2] !== undefined && SPEC[+m[2]] ? `${seg} ${SPEC[+m[2]]}` : seg;
  };

  // 顔 → コード。**復元して元の顔に戻らなければ諦めて生文字列**（縮めるために表示を変えない）
  window.kaiFaceEncode = function (k, face) {
    const raw = () => (CODE.test(face) ? '-' : '') + face.replace(/[\s　]+/g, '_');
    if (!face) return '';
    const ss = segsOf(k);
    for (let i = 0; i < ss.length; i++) {
      const cands = [[ss[i], '']].concat(SPEC.map((w, j) => [`${ss[i]} ${w}`, `s${j}`]));
      for (const [text, sp] of cands) {
        if (text !== face) continue;
        const code = (i ? String(i) : '') + sp;
        return kaiFaceDecode(k, code) === face ? code : raw();   // 念のため往復で検証
      }
    }
    return raw();
  };

  // list … KURA（札・一覧）でも KURA_MAP（地図）でも使える。戻り値は [{k, face}]、無ければ null
  window.parseKai = function (list) {
    const q = new URLSearchParams(location.search);
    const out = [];
    const nk = q.get('k');
    if (nk) {
      for (const part of nk.split(',')) {
        const dot = part.indexOf('.');
        const id = (dot < 0 ? part : part.slice(0, dot)).trim();
        const face = dot < 0 ? '' : part.slice(dot + 1).trim();
        const k = id && list.find(x => x.id === id);
        if (k) out.push({ k, face: kaiFaceDecode(k, face) });
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
