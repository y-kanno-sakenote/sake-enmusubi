// 会モード共通：QRボタン（index / map / list の3面で共有）
// ?kai= が付いているときだけ右下に「QR」を出し、押すと参加者用URL（札のページ）のQRを大きく表示する。
// 会場のどの画面（スクリーンの地図・配布用の一覧）からでも、そのまま読み取ってもらえるようにするため。
// QR描画ライブラリは押されたときだけ読み込む（全国版や、押さない限りは何も増えない）
(() => {
  const search = location.search;
  if (!new URLSearchParams(search).get('kai')) return;
  const url = location.href.replace(/[^/]*(\?.*)?$/, '') + 'index.html' + search;

  const css = document.createElement('style');
  css.textContent = `
    .kai-qr-btn { position: fixed; right: 12px; bottom: 12px; z-index: 2000; background: #a63d40; color: #fff;
      border: none; border-radius: 6px; padding: 10px 16px; font: inherit; font-size: 0.9rem; letter-spacing: 0.15em;
      cursor: pointer; box-shadow: 0 1px 6px rgba(0,0,0,0.18); }
    .kai-qr-veil { position: fixed; inset: 0; z-index: 2001; background: rgba(43,43,51,0.6); display: flex;
      align-items: center; justify-content: center; padding: 20px; }
    .kai-qr-card { background: #fffdf7; border-radius: 8px; padding: 22px 22px 16px; text-align: center; max-width: 92vw;
      font-family: "Hiragino Mincho ProN", "Yu Mincho", "YuMincho", serif; color: #2b2b33; }
    .kai-qr-card .t { font-size: 1rem; letter-spacing: 0.2em; margin: 0 0 12px; }
    .kai-qr-card .q { display: inline-block; background: #fff; padding: 10px; border: 1px solid #d9d2c2; }
    .kai-qr-card .q img, .kai-qr-card .q canvas { display: block; width: min(64vw, 300px); height: auto; }
    .kai-qr-card .s { color: #6d6a60; font-size: 0.8rem; margin: 12px 0 0; }
    .kai-qr-card .c { color: #a63d40; font-size: 0.78rem; margin: 6px 0 0; }
    @media print { .kai-qr-btn, .kai-qr-veil { display: none !important; } }
  `;
  document.head.appendChild(css);

  const btn = document.createElement('button');
  btn.className = 'kai-qr-btn';
  btn.textContent = 'QR';
  btn.title = '参加者用のQRを表示';
  document.body.appendChild(btn);

  let veil = null;
  const show = () => {
    veil = document.createElement('div');
    veil.className = 'kai-qr-veil';
    veil.innerHTML = `<div class="kai-qr-card"><p class="t">今日の御縁札</p><div class="q"></div>
      <p class="s">読み取ると、今日のお酒だけで縁を結べます</p><p class="c">画面をタップで閉じる</p></div>`;
    document.body.appendChild(veil);
    new QRCode(veil.querySelector('.q'), { text: url, width: 300, height: 300, correctLevel: QRCode.CorrectLevel.M });
    veil.addEventListener('click', () => { veil.remove(); veil = null; });
  };
  btn.addEventListener('click', () => {
    if (veil) return;
    if (window.QRCode) return show();
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
    s.onload = show;
    document.head.appendChild(s);
  });
})();
