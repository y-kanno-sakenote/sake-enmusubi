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

  // トークン置換：語の位置はそのままで、蔵の銘柄を ~i~ に、スペック語を ^j^ に置き換える。
  //   実際の会の銘柄は「安芸虎 入河内 純米吟醸」のように固有の語を挟むため、
  //   「銘柄＋スペック」の形しか縮まない旧方式ではほとんど効かなかった（2026-09-09 実測）
  const TOKEN = /[~^]\d+[~^]/;
  const detok = (k, t) => {
    const ss = segsOf(k);
    return t.replace(/~(\d+)~/g, (m, i) => ss[+i] !== undefined ? ss[+i] : m)
            .replace(/\^(\d+)\^/g, (m, j) => SPEC[+j] !== undefined ? SPEC[+j] : m);
  };

  window.kaiFaceDecode = function (k, code) {
    if (!code) return main(k.b);
    if (code[0] === '-') return code.slice(1).replace(/_/g, ' ');
    const plain = code.replace(/_/g, ' ');
    if (TOKEN.test(code)) return detok(k, plain);
    if (!CODE.test(code)) return plain;
    const m = code.match(/^(\d*)(?:s(\d+))?$/);
    const seg = segsOf(k)[m[1] ? +m[1] : 0];
    if (seg === undefined) return plain;
    return m[2] !== undefined && SPEC[+m[2]] ? `${seg} ${SPEC[+m[2]]}` : seg;
  };

  // 顔 → コード。**復元して元の顔に戻らなければ諦めて生文字列**（縮めるために表示を変えない）
  window.kaiFaceEncode = function (k, face) {
    const raw = () => (CODE.test(face) || TOKEN.test(face) ? '-' : '') + face.replace(/[\s　]+/g, '_');
    if (!face) return '';
    const ss = segsOf(k);
    // ① 「銘柄」「銘柄＋スペック」にぴたり一致するなら、いちばん短い番号コード
    for (let i = 0; i < ss.length; i++) {
      const cands = [[ss[i], '']].concat(SPEC.map((w, j) => [`${ss[i]} ${w}`, `s${j}`]));
      for (const [text, sp] of cands) {
        if (text !== face) continue;
        const code = (i ? String(i) : '') + sp;
        if (kaiFaceDecode(k, code) === face) return code;
      }
    }
    // ② そうでなければ、長い語から順にトークンへ置換（位置はそのまま）
    let t = face;
    const subs = ss.map((s, i) => [s, `~${i}~`]).concat(SPEC.map((w, j) => [w, `^${j}^`]))
      .filter(([w]) => w.length >= 2).sort((a, b) => b[0].length - a[0].length);
    for (const [w, tk] of subs) if (t.includes(w) && !TOKEN.test(w)) t = t.split(w).join(tk);
    if (t === face) return raw();                       // 1つも置換できなかった
    const code = t.replace(/[\s　]+/g, '_');
    return kaiFaceDecode(k, code) === face ? code : raw();   // 往復で検証してから採用
  };

  // 味わいコメント（主催者が付ける一言）。**紙の一覧にだけ出す**ので、判定には一切使わない。
  // 日本語はURLで1文字9文字分に膨らむため、よく使う味の語を番号に置き換えて縮める
  // （銘柄の短縮と同じトークン方式・記号だけ変える）。辞書に無い言葉は生のまま残す。
  // ★並び順を変えるとURLの意味が変わるので、この配列は末尾にしか足さない
  const TASTE = ['甘味', '旨味', '酸味', '苦味', '渋み', 'コク', 'キレ', 'ボディ', 'バランス',
    '甘口', '辛口', '芳醇', '濃厚', '軽快', '爽やか', '華やか', 'なめらか', 'やわらか', 'まろやか',
    'ふっくら', 'どっしり', 'スッキリ', 'ジューシー', 'フルーティ', 'シュワシュワ', '甘酸っぱい',
    '後味', '香り', '米感', 'ベーシック', 'ホロ苦', 'ワイン', 'パイン', '生酛', '熟成'];
  const TTOK = /\*\d+\*/;

  window.kaiTasteDecode = function (code) {
    if (!code) return '';
    if (code[0] === '-') return code.slice(1).replace(/_/g, ' ');
    return code.replace(/\*(\d+)\*/g, (m, i) => TASTE[+i] !== undefined ? TASTE[+i] : m).replace(/_/g, ' ');
  };

  // 顔と同じく、**復元して元に戻らなければ諦めて生文字列**（縮めるために表示を変えない）
  window.kaiTasteEncode = function (text) {
    const t0 = (text || '').trim();
    if (!t0) return '';
    const raw = () => (TTOK.test(t0) ? '-' : '') + t0.replace(/[\s　]+/g, '_');
    let t = t0;
    for (const [w, tk] of TASTE.map((w, i) => [w, `*${i}*`]).sort((a, b) => b[0].length - a[0].length))
      if (t.includes(w)) t = t.split(w).join(tk);
    const code = t.replace(/[\s　]+/g, '_');
    return kaiTasteDecode(code) === t0 ? code : raw();
  };

  // list … KURA（札・一覧）でも KURA_MAP（地図）でも使える。戻り値は [{k, face, taste}]、無ければ null
  window.parseKai = function (list) {
    const q = new URLSearchParams(location.search);
    const out = [];
    // 味わいは k= と同じ並び。見つからない蔵を捨てても対応がずれないよう、添字で引く。
    // **q.get('t') は使わない**——%2C まで復号されるので、味わいに書かれた半角カンマが
    // 区切りに化けて1本ずつずれる（qa係が検出）。生のクエリから取り、割ってから復号する
    const _traw = (location.search.match(/[?&]t=([^&]*)/) || [])[1] || '';
    const ts = _traw.split(',').map(x => { try { return decodeURIComponent(x); } catch (e) { return x; } });
    const nk = q.get('k');
    if (nk) {
      let _i = -1;
      for (const part of nk.split(',')) {
        _i++;
        const dot = part.indexOf('.');
        const id = (dot < 0 ? part : part.slice(0, dot)).trim();
        const face = dot < 0 ? '' : part.slice(dot + 1).trim();
        const k = id && list.find(x => x.id === id);
        if (k) out.push({ k, face: kaiFaceDecode(k, face), taste: kaiTasteDecode((ts[_i] || '').trim()) });
        else console.warn('会モード：見つからない指定 →', part);
      }
    } else {
      const ok = q.get('kai');
      if (!ok) return null;
      for (const part of ok.split(',')) {
        const [p, n, b] = part.split(':').map(x => (x || '').trim());
        const k = p && n && list.find(x => x.p === p && coreN(x.n) === coreN(n));
        if (k) out.push({ k, face: b || main(k.b), taste: '' });   // 旧形式に味わいは無い
        else console.warn('会モード：見つからない指定 →', part);
      }
    }
    return out.length ? out : null;
  };
})();
