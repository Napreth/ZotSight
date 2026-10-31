const j = [
  "i",
  "ii",
  "iii",
  "iv",
  "v",
  "vi",
  "vii",
  "viii",
  "ix",
  "x",
  "xi",
  "xii",
  "xiii",
  "xiv",
  "xv",
  "xvi",
  "xvii",
  "xviii",
  "xix",
  "xx"
];
function Y() {
  let r = /* @__PURE__ */ new Map();
  return r.set('"', '"'), r.set(" '", "'"), r.set("«", "»"), r.set("‘", "’"), r.set("‚", "‚"), r.set("“", "”"), r.set("‛", "‛"), r.set("„", "“"), r.set("‟", "‟"), r.set("‹", "›"), r.set("《", "》"), r.set("「", "」"), r;
}
function y(r) {
  return r.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function Q() {
  let r = Y(), n = [];
  for (let [e, t] of r)
    n.push(`${y(e)}[\\s\\S]*?${y(t)}`);
  return new RegExp(n.join("|"), "gu");
}
const O = /[(（<{\[](?:[^)\]}>）]|\\[)\]}>）])*[)\]}>）]/gu, q = /[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,7}/gu, Z = /^(\s*\[\d+\])+/u, nn = /^\s+/u, $ = Q(), en = [
  "!Xũ",
  "!Kung",
  "ǃʼOǃKung",
  "!Xuun",
  "!Kung-Ekoka",
  "ǃHu",
  "ǃKhung",
  "ǃKu",
  "ǃung",
  "ǃXo",
  "ǃXû",
  "ǃXung",
  "ǃXũ",
  "!Xun",
  "Yahoo!",
  "Y!J",
  "Yum!"
], E = [
  "!",
  ".",
  "?",
  "։",
  // ։ Armenian Full Stop
  "؝",
  // ؝ Arabic End Of Text Mark
  "؞",
  // ؞ Arabic Triple Dot Punctuation Mark
  "؟",
  // ؟ Arabic Question Mark
  "۔",
  // ۔ Arabic Full Stop
  "܀",
  // ܀ Syriac End Of Paragraph
  "܁",
  // ܁ Syriac Supralinear Full Stop
  "܂",
  // ܂ Syriac Sublinear Full Stop
  "߹",
  // ߹ Nko Exclamation Mark
  "࠷",
  // ࠷ Samaritan Punctuation Melodic Qitsa
  "࠹",
  // ࠹ Samaritan Punctuation Qitsa
  "࠽",
  // ࠽ Samaritan Punctuation Sof Mashfaat
  "࠾",
  // ࠾ Samaritan Punctuation Annaau
  "।",
  // । Devanagari Danda
  "॥",
  // ॥ Devanagari Double Danda
  "၊",
  // ၊ Myanmar Sign Little Section
  "။",
  // ။ Myanmar Sign Section
  "።",
  // ። Ethiopic Full Stop
  "፧",
  // ፧ Ethiopic Question Mark
  "፨",
  // ፨ Ethiopic Paragraph Separator
  "᙮",
  // ᙮ Canadian Syllabics Full Stop
  "᜵",
  // ᜵ Philippine Single Punctuation
  "᜶",
  // ᜶ Philippine Double Punctuation
  "᠃",
  // ᠃ Mongolian Full Stop
  "᠉",
  // ᠉ Mongolian Manchu Full Stop
  "᥄",
  // ᥄ Limbu Exclamation Mark
  "᥅",
  // ᥅ Limbu Question Mark
  "᪨",
  // ᪨ Tai Tham Sign Kaan
  "᪩",
  // ᪩ Tai Tham Sign Kaankuu
  "᪪",
  // ᪪ Tai Tham Sign Satkaan
  "᪫",
  // ᪫ Tai Tham Sign Satkaankuu
  "᭚",
  // ᭚ Balinese Panti
  "᭛",
  // ᭛ Balinese Pamada
  "᭞",
  // ᭞ Balinese Carik Siki
  "᭟",
  // ᭟ Balinese Carik Pareren
  "᭽",
  // ᭽ Balinese Panti Lantang
  "᭾",
  // ᭾ Balinese Pamada Lantang
  "᰻",
  // ᰻ Lepcha Punctuation Ta-Rol
  "᰼",
  // ᰼ Lepcha Punctuation Nyet Thyoom Ta-Rol
  "᱾",
  // ᱾ Ol Chiki Punctuation Mucaad
  "᱿",
  // ᱿ Ol Chiki Punctuation Double Mucaad
  "․",
  // ․ One Dot Leader
  "‼",
  // ‼ Double Exclamation Mark
  "‽",
  // ‽ Interrobang
  "⁇",
  // ⁇ Double Question Mark
  "⁈",
  // ⁈ Question Exclamation Mark
  "⁉",
  // ⁉ Exclamation Question Mark
  "⸮",
  // ⸮ Reversed Question Mark
  "⸼",
  // ⸼ Stenographic Full Stop
  "⹓",
  // ⹓ Medieval Exclamation Mark
  "⹔",
  // ⹔ Medieval Question Mark
  "꓿",
  // ꓿ Lisu Punctuation Full Stop
  "꘎",
  // ꘎ Vai Full Stop
  "꘏",
  // ꘏ Vai Question Mark
  "꛳",
  // ꛳ Bamum Full Stop
  "꛷",
  // ꛷ Bamum Question Mark
  "꡶",
  // ꡶ Phags-Pa Mark Shad
  "꡷",
  // ꡷ Phags-Pa Mark Double Shad
  "꣎",
  // ꣎ Saurashtra Danda
  "꣏",
  // ꣏ Saurashtra Double Danda
  "꤯",
  // ꤯ Kayah Li Sign Shya
  "꧈",
  // ꧈ Javanese Pada Lingsa
  "꧉",
  // ꧉ Javanese Pada Lungsi
  "꩝",
  // ꩝ Cham Punctuation Danda
  "꩞",
  // ꩞ Cham Punctuation Double Danda
  "꩟",
  // ꩟ Cham Punctuation Triple Danda
  "꫰",
  // ꫰ Meetei Mayek Cheikhan
  "꫱",
  // ꫱ Meetei Mayek Ahang Khudam
  "꯫",
  // ꯫ Meetei Mayek Cheikhei
  "﹒",
  // ﹒ Small Full Stop
  "﹖",
  // ﹖ Small Question Mark
  "﹗",
  // ﹗ Small Exclamation Mark
  "！",
  // ！ Fullwidth Exclamation Mark
  "．",
  // ．Fullwidth Full Stop
  "？",
  // ？ Fullwidth Question Mark
  "𐩖",
  // 𐩖 Kharoshthi Punctuation Danda
  "𐩗",
  // 𐩗 Kharoshthi Punctuation Double Danda
  "𐽕",
  // 𐽕 Sogdian Punctuation Two Vertical Bars
  "𐽖",
  // 𐽖 Sogdian Punctuation Two Vertical Bars With Dots
  "𐽗",
  // 𐽗 Sogdian Punctuation Circle With Dot
  "𐽘",
  // 𐽘 Sogdian Punctuation Two Circles With Dots
  "𐽙",
  // 𐽙 Sogdian Punctuation Half Circle With Dot
  "𐾆",
  // 𐾆 Old Uyghur Punctuation Bar
  "𐾇",
  // 𐾇 Old Uyghur Punctuation Two Bars
  "𐾈",
  // 𐾈 Old Uyghur Punctuation Two Dots
  "𐾉",
  // 𐾉 Old Uyghur Punctuation Four Dots
  "𑁇",
  // 𑁇 Brahmi Danda
  "𑁈",
  // 𑁈 Brahmi Double Danda
  "𑂾",
  // 𑂾 Kaithi Section Mark
  "𑂿",
  // 𑂿 Kaithi Double Section Mark
  "𑃀",
  // 𑃀 Kaithi Danda
  "𑃁",
  // 𑃁 Kaithi Double Danda
  "𑅁",
  // 𑅁 Chakma Danda
  "𑅂",
  // 𑅂 Chakma Double Danda
  "𑅃",
  // 𑅃 Chakma Question Mark
  "𑇅",
  // 𑇅 Sharada Danda
  "𑇆",
  // 𑇆 Sharada Double Danda
  "𑇍",
  // 𑇍 Sharada Sutra Mark
  "𑇞",
  // 𑇞 Sharada Section Mark-1
  "𑇟",
  // 𑇟 Sharada Section Mark-2
  "𑈸",
  // 𑈸 Khojki Danda
  "𑈹",
  // 𑈹 Khojki Double Danda
  "𑈻",
  // 𑈻 Khojki Section Mark
  "𑈼",
  // 𑈼 Khojki Double Section Mark
  "𑊩",
  // 𑊩 Multani Section Mark
  "𑑋",
  // 𑑋 Newa Danda
  "𑑌",
  // 𑑌 Newa Double Danda
  "𑗂",
  // 𑗂 Siddham Danda
  "𑗃",
  // 𑗃 Siddham Double Danda
  "𑗉",
  // 𑗉 Siddham End Of Text Mark
  "𑗊",
  // 𑗊 Siddham Section Mark
  "𑗋",
  // 𑗋 Siddham Section Mark
  "𑗌",
  // 𑗌 Siddham Section Mark
  "𑗍",
  // 𑗍 Siddham Section Mark
  "𑗎",
  // 𑗎 Siddham Section Mark
  "𑗏",
  // 𑗏 Siddham Section Mark Double Ring
  "𑗐",
  // 𑗐 Siddham Section Mark Double Ring With Rays
  "𑗑",
  // 𑗑 Siddham Section Mark With Double Crescents
  "𑗒",
  // 𑗒 Siddham Section Mark With Triple Crescents
  "𑗓",
  // 𑗓 Siddham Section Mark With Quadruple Crescents
  "𑗔",
  // 𑗔 Siddham Section Mark With Septuple Crescents
  "𑗕",
  // 𑗕 Siddham Section Mark With Circles And Rays
  "𑗖",
  // 𑗖 Siddham Section Mark With Circles And Two Enclosures
  "𑗗",
  // 𑗗 Siddham Section Mark With Circles And Four Enclosures
  "𑙁",
  // 𑙁 Modi Danda
  "𑙂",
  // 𑙂 Modi Double Danda
  "𑜼",
  // 𑜼 Ahom Sign Small Section
  "𑜽",
  // 𑜽 Ahom Sign Section
  "𑜾",
  // 𑜾 Ahom Sign Rulai
  "𑥄",
  // 𑥄 Dives Akuru Double Danda
  "𑥆",
  // 𑥆 Dives Akuru End Of Text Mark
  "𑩂",
  // 𑩂 Zanabazar Square Mark Shad
  "𑩃",
  // 𑩃 Zanabazar Square Mark Double Shad
  "𑪛",
  // 𑪛 Soyombo Mark Shad
  "𑪜",
  // 𑪜 Soyombo Mark Double Shad
  "𑱁",
  // 𑱁 Bhaiksuki Danda
  "𑱂",
  // 𑱂 Bhaiksuki Double Danda
  "𑻷",
  // 𑻷 Makasar Passimbang
  "𑻸",
  // 𑻸 Makasar End Of Section
  "𑽃",
  // 𑽃 Kawi Danda
  "𑽄",
  // 𑽄 Kawi Double Danda
  "𖩮",
  // 𖩮 Mro Danda
  "𖩯",
  // 𖩯 Mro Double Danda
  "𖫵",
  // 𖫵 Bassa Vah Full Stop
  "𖬷",
  // 𖬷 Pahawh Hmong Sign Vos Thom
  "𖬸",
  // 𖬸 Pahawh Hmong Sign Vos Tshab Ceeb
  "𖭄",
  // 𖭄 Pahawh Hmong Sign Xaus
  "𖺘",
  // 𖺘 Medefaidrin Full Stop
  "𛲟",
  // 𛲟 Duployan Punctuation Chinook Full Stop
  "𝪈",
  // 𝪈 Signwriting Full Stop
  "。",
  // 。 Ideographic Full Stop
  "｡"
  // ｡ Halfwidth Ideographic Full Stop
], C = new Set(E);
function rn() {
  let r = [], n = [];
  for (let t of E)
    t.length === 1 ? r.push(y(t)) : n.push(y(t));
  let e = `[${r.join("")}]`;
  return n.length > 0 && (e = `(?:${e}|${n.join("|")})`), e;
}
const R = rn();
function an(r, n) {
  return n > r.start && n < r.end;
}
function tn(r) {
  return r.rangeType === "Quote";
}
const sn = /^[0-9a-z]/, M = /* @__PURE__ */ new Map();
function p(...r) {
  let n = [];
  for (let e of r)
    for (let t of e.split(`
`)) {
      let a = t.trim();
      a && !a.startsWith("#") && n.push(a);
    }
  return n;
}
function _(r, n) {
  let e = r.codePointAt(n);
  return e === void 0 ? 1 : e > 65535 ? 2 : 1;
}
class c {
  getAbbreviationChar() {
    return ".";
  }
  getSentenceBreakRegex() {
    let n = `${R}+`, e = M.get(n);
    return e || (e = new RegExp(n, "gu"), M.set(n, e)), e;
  }
  getSentenceBoundaries(n) {
    let e = [], t = /\n[\r]*\n/g, a = n.split(t), i = [], s = 0;
    for (let l = 0; l < a.length; l++)
      if (i.push(s), s += a[l].length, l < a.length - 1) {
        s += 2;
        let d = i[l] + a[l].length, u = n.slice(d).match(/^\n[\r]*\n/);
        u && (s = d + u[0].length);
      }
    let o = [];
    for (let l = 0; l < a.length; l++) {
      let d = a[l];
      if (l > 0) {
        let h = i[l];
        e.push({
          startIndex: h - 2,
          endIndex: h,
          text: `

`,
          boundarySymbol: null,
          isParagraphBreak: !0
        });
      }
      let g = i[l];
      o.length = 0, o.push(0);
      let u = this.getSentenceBreakRegex();
      u.lastIndex = 0;
      let f = [], z;
      for (; (z = u.exec(d)) !== null; )
        f.push([z.index, z.index + z[0].length]);
      let J = this.getSkippableRanges(d);
      for (let [h, k] of f) {
        let m = this.findBoundary(d, h, k);
        if (m === null)
          continue;
        let w = !1;
        for (let v of J)
          if (an(v, m)) {
            let A = this.getNextWordApprox(n, g + v.end), x = this.getBoundaryExtend(A), I = m + _(d, m);
            tn(v) && I === v.end && x >= 0 ? (m = v.end + x, w = !1) : w = !0;
            break;
          }
        w || o.push(m);
      }
      o[o.length - 1] !== d.length && o.push(d.length);
      for (let h = 0; h < o.length - 1; h++) {
        let k = o[h], m = o[h + 1];
        if (k >= d.length || m > d.length || k > m)
          continue;
        let w = d.slice(k, m), v = null;
        if (m > 0 && m <= d.length) {
          let N = d.slice(0, m).trimEnd();
          if (N.length > 0) {
            let T = [...N], B = T[T.length - 1];
            C.has(B) && (v = B);
          }
        }
        let A = g + k, x = g + m;
        e.push({
          startIndex: A,
          endIndex: x,
          text: w,
          boundarySymbol: v,
          isParagraphBreak: !1
        });
      }
    }
    return e;
  }
  segment(n) {
    let e = this.getSentenceBoundaries(n), t = [];
    for (let a of e)
      a.text.length > 0 && t.push(a.text);
    return t;
  }
  getBoundaryExtend(n) {
    if (this.continueInNextWord(n.trim()))
      return -1;
    let e = 0;
    for (let t of n)
      if (/\s/.test(t) || C.has(t))
        e += t.length;
      else
        break;
    return e;
  }
  isAbbreviation(n, e, t) {
    if (this.getAbbreviationChar() !== t)
      return !1;
    let a = this.getLastWord(n);
    if (!a)
      return !1;
    let i = this.getAbbreviations();
    return i.includes(a) || i.includes(a.toLowerCase()) || i.includes(a.toUpperCase());
  }
  getLastWord(n) {
    let e = n.split(/[\s.]/);
    return e[e.length - 1] || "";
  }
  isExclamation(n, e) {
    let a = `${this.getLastWord(n)}!`;
    return en.includes(a);
  }
  getNextWordApprox(n, e) {
    if (e >= n.length)
      return "";
    let a = Math.min(e + 30, n.length);
    return n.slice(e, a);
  }
  findBoundary(n, e, t) {
    let a = n.slice(0, e), i = e + _(n, e), s = this.getNextWordApprox(n, i), o = Z.exec(s);
    if (o)
      return i + o[0].length;
    if (this.continueInNextWord(s) || this.isAbbreviation(a, s, n.slice(e, t)) || this.isExclamation(a, s))
      return null;
    let l = nn.exec(s);
    return l ? i + l[0].length : t;
  }
  continueInNextWord(n) {
    return sn.test(n);
  }
  getSkippableRanges(n) {
    let e = [], t = new RegExp($.source, $.flags);
    for (let s of n.matchAll(t))
      e.push({
        start: s.index,
        end: s.index + s[0].length,
        rangeType: "Quote"
        /* Quote */
      });
    let a = new RegExp(O.source, O.flags);
    for (let s of n.matchAll(a))
      e.push({
        start: s.index,
        end: s.index + s[0].length,
        rangeType: "Parentheses"
        /* Parentheses */
      });
    let i = new RegExp(q.source, q.flags);
    for (let s of n.matchAll(i))
      e.push({
        start: s.index,
        end: s.index + s[0].length,
        rangeType: "Email"
        /* Email */
      });
    return e.sort((s, o) => s.start - o.start), e;
  }
}
function D(r, n) {
  if (n === 0 || r.length <= n)
    return [r];
  let e = [], t = /\n[\r]*\n/g, a = [], i = 0, s;
  for (; (s = t.exec(r)) !== null; )
    a.push([i, s.index]), i = s.index + s[0].length;
  if (i < r.length && a.push([i, r.length]), a.length === 0)
    return [r];
  let o = 0, l = 0, d = 0;
  for (; d < a.length; ) {
    let [g, u] = a[d];
    if (l === o) {
      o = g, l = u, d++;
      continue;
    }
    u - o > n && (e.push(r.slice(o, l)), o = g), l = u, d++;
  }
  return o < r.length && e.push(r.slice(o, l)), e;
}
const cn = /* @__PURE__ */ new Map([
  ["aae", ["it"]],
  ["ab", ["ru"]],
  ["abs", ["id"]],
  ["ace", ["id"]],
  ["acm", ["ar"]],
  ["ady", ["ady-cyrl"]],
  ["aeb", ["aeb-arab"]],
  ["aeb-arab", ["ar"]],
  ["aln", ["sq"]],
  ["als", ["gsw", "de"]],
  ["alt", ["ru"]],
  ["ami", ["zh-tw", "zh-hant", "zh", "zh-hans"]],
  ["an", ["es"]],
  ["anp", ["hi"]],
  ["apc", ["ar"]],
  ["arn", ["es"]],
  ["arq", ["ar"]],
  ["ary", ["ar"]],
  ["arz", ["ar"]],
  ["ast", ["es"]],
  ["atj", ["fr"]],
  ["av", ["ru"]],
  ["avk", ["fr", "es", "ru"]],
  ["awa", ["hi"]],
  ["ay", ["es"]],
  ["azb", ["fa"]],
  ["ba", ["ru"]],
  ["ban", ["id"]],
  ["ban-bali", ["ban"]],
  ["bar", ["de"]],
  ["bat-smg", ["sgs", "lt"]],
  ["bbc", ["bbc-latn"]],
  ["bbc-latn", ["id"]],
  ["bcc", ["fa"]],
  ["bci", ["fr"]],
  ["bdr", ["ms"]],
  ["be-tarask", ["be"]],
  ["be-x-old", ["be-tarask", "be"]],
  ["bew", ["id"]],
  ["bgn", ["fa"]],
  ["bh", ["bho"]],
  ["bjn", ["id"]],
  ["blk", ["my"]],
  ["bm", ["fr"]],
  ["bpy", ["bn"]],
  ["bqi", ["fa"]],
  ["btm", ["id"]],
  ["bug", ["id"]],
  ["bug-bugi", ["bug", "id"]],
  ["bxr", ["ru"]],
  ["ca", ["oc"]],
  ["cbk-zam", ["es"]],
  ["cdo", ["cdo-latn", "cdo-hant", "nan-hant", "zh-hant", "zh", "zh-hans"]],
  ["cdo-hant", ["cdo", "cdo-latn", "nan-hant", "zh-hant", "zh", "zh-hans"]],
  ["cdo-latn", ["cdo", "cdo-hant", "nan-hant", "zh-hant", "zh", "zh-hans"]],
  ["ce", ["ru"]],
  ["co", ["it"]],
  ["cpx", ["cpx-hant", "cpx-hans", "cpx-latn", "cdo", "zh-hant", "zh", "zh-hans"]],
  ["cpx-hans", ["cpx", "cpx-hant", "cpx-latn", "cdo", "zh-hans", "zh", "zh-hant"]],
  ["cpx-hant", ["cpx", "cpx-hans", "cpx-latn", "cdo", "zh-hant", "zh", "zh-hans"]],
  ["crh", ["crh-latn", "tr"]],
  ["crh-cyrl", ["tr"]],
  ["crh-latn", ["tr"]],
  ["cs", ["sk"]],
  ["csb", ["pl"]],
  ["cv", ["ru"]],
  ["de-at", ["de"]],
  ["de-ch", ["de"]],
  ["de-formal", ["de"]],
  ["dsb", ["hsb", "de"]],
  ["dtp", ["ms"]],
  ["dty", ["ne"]],
  ["dua", ["fr"]],
  ["egl", ["it"]],
  ["eml", ["it"]],
  ["es-formal", ["es"]],
  ["ext", ["es"]],
  ["fit", ["fi"]],
  ["fiu-vro", ["vro", "et"]],
  ["fon", ["fr"]],
  ["frc", ["fr"]],
  ["frp", ["fr"]],
  ["frr", ["de"]],
  ["fur", ["it"]],
  ["gag", ["tr"]],
  ["gan", ["gan-hant", "gan-hans", "zh-hant", "zh", "zh-hans"]],
  ["gan-hans", ["gan", "gan-hant", "zh-hans", "zh", "zh-hant"]],
  ["gan-hant", ["gan", "gan-hans", "zh-hant", "zh", "zh-hans"]],
  ["gcf", ["fr"]],
  ["gcr", ["fr"]],
  ["gl", ["pt"]],
  ["gld", ["ru"]],
  ["glk", ["fa"]],
  ["gn", ["es"]],
  ["gom", ["gom-deva", "gom-latn"]],
  ["gom-deva", ["gom-latn"]],
  ["gor", ["id"]],
  ["gsw", ["de"]],
  ["guc", ["es"]],
  ["hak", ["zh-hant", "zh", "zh-hans"]],
  ["hif", ["hif-latn"]],
  ["hke", ["fr"]],
  ["hrx", ["de"]],
  ["hsb", ["dsb", "de"]],
  ["hsn", ["zh-hant", "zh", "zh-hans"]],
  ["ht", ["fr"]],
  ["hu-formal", ["hu"]],
  ["hyw", ["hy"]],
  ["iba", ["ms"]],
  ["ii", ["zh-cn", "zh-hans", "zh", "zh-hant"]],
  ["ike-cans", ["iu"]],
  ["ike-latn", ["iu"]],
  ["inh", ["ru"]],
  ["io", ["eo"]],
  ["iu", ["ike-cans"]],
  ["jut", ["da"]],
  ["jv", ["id"]],
  ["kaa", ["kk-latn", "kk-cyrl"]],
  ["kab", ["fr"]],
  ["kbd", ["kbd-cyrl"]],
  ["kbp", ["fr"]],
  ["kea", ["pt"]],
  ["kge", ["id"]],
  ["khw", ["ur"]],
  ["kiu", ["tr"]],
  ["kjh", ["ru"]],
  ["kjp", ["my"]],
  ["kk", ["kk-cyrl"]],
  ["kk-arab", ["kk", "kk-cyrl"]],
  ["kk-cn", ["kk-arab", "kk", "kk-cyrl"]],
  ["kk-cyrl", ["kk"]],
  ["kk-kz", ["kk-cyrl", "kk"]],
  ["kk-latn", ["kk", "kk-cyrl"]],
  ["kk-tr", ["kk-latn", "kk", "kk-cyrl"]],
  ["kl", ["da"]],
  ["ko-kp", ["ko"]],
  ["koi", ["ru"]],
  ["kr", ["knc"]],
  ["krc", ["ru"]],
  ["krl", ["fi"]],
  ["ks", ["ks-arab"]],
  ["ksh", ["de"]],
  ["ksw", ["my"]],
  ["ku", ["ku-latn"]],
  ["ku-arab", ["ku", "ckb"]],
  ["ku-latn", ["ku"]],
  ["kum", ["ru"]],
  ["kv", ["ru"]],
  ["lad", ["es"]],
  ["lb", ["de"]],
  ["lbe", ["ru"]],
  ["lez", ["ru", "az"]],
  ["li", ["nl"]],
  ["lij", ["it"]],
  ["liv", ["et"]],
  ["ljp", ["id"]],
  ["lki", ["fa"]],
  ["lld", ["it", "rm", "fur"]],
  ["lmo", ["pms", "eml", "lij", "vec", "it"]],
  ["ln", ["fr"]],
  ["lrc", ["fa"]],
  ["ltg", ["lv"]],
  ["lua", ["fr"]],
  ["luz", ["fa"]],
  ["lzh", ["zh-hant", "zh", "zh-hans"]],
  ["lzz", ["tr"]],
  ["mad", ["id"]],
  ["mag", ["hi"]],
  ["mai", ["hi"]],
  ["map-bms", ["jv", "id"]],
  ["mdf", ["myv", "ru"]],
  ["mg", ["fr"]],
  ["mhr", ["mrj", "ru"]],
  ["min", ["id"]],
  ["mnc-latn", ["mnc"]],
  ["mnc-mong", ["mnc"]],
  ["mnw", ["my"]],
  ["mo", ["ro"]],
  ["mrj", ["mhr", "ru"]],
  ["ms-arab", ["ms"]],
  ["mui", ["id"]],
  ["mwl", ["pt"]],
  ["myv", ["mdf", "ru"]],
  ["mzn", ["fa"]],
  ["nah", ["es"]],
  ["nan", ["nan-latn-pehoeji", "nan-latn-tailo", "nan-hant", "cdo", "zh-hant", "zh", "zh-hans"]],
  ["nan-hant", ["nan", "nan-latn-pehoeji", "nan-latn-tailo", "cdo", "zh-hant", "zh", "zh-hans"]],
  [
    "nan-latn-pehoeji",
    ["nan-latn", "nan-latn-tailo", "nan", "nan-hant", "cdo", "zh-hant", "zh", "zh-hans"]
  ],
  [
    "nan-latn-tailo",
    ["nan-latn", "nan-latn-pehoeji", "nan", "nan-hant", "cdo", "zh-hant", "zh", "zh-hans"]
  ],
  ["nap", ["it"]],
  ["nb", ["no", "nn"]],
  ["nds", ["de"]],
  ["nds-nl", ["nl"]],
  ["nia", ["id"]],
  ["nl-informal", ["nl"]],
  ["nn", ["no", "nb"]],
  ["no", ["nb", "nn"]],
  ["nrm", ["nrf", "fr"]],
  ["nyo", ["ttj", "nyn", "lg", "sw"]],
  ["oc", ["ca", "fr"]],
  ["olo", ["fi"]],
  ["os", ["ru"]],
  ["pcd", ["fr"]],
  ["pdc", ["de"]],
  ["pdt", ["de"]],
  ["pfl", ["de"]],
  ["pms", ["it"]],
  ["pnt", ["el"]],
  ["pt", ["pt-br"]],
  ["pt-br", ["pt"]],
  ["pwn", ["zh-tw", "zh-hant", "zh", "zh-hans"]],
  ["qu", ["qug", "es"]],
  ["qug", ["qu", "es"]],
  ["rgn", ["it"]],
  ["rm", ["de"]],
  ["rmy", ["ro"]],
  ["roa-rup", ["rup", "ro"]],
  ["roa-tara", ["it"]],
  ["rsk", ["sr-cyrl", "sr-ec"]],
  ["rue", ["uk", "ru"]],
  ["rup", ["ro"]],
  ["ruq", ["ruq-latn", "ro"]],
  ["ruq-cyrl", ["mk"]],
  ["ruq-latn", ["ro"]],
  ["rut", ["ru"]],
  ["sa", ["hi"]],
  ["sah", ["ru"]],
  ["scn", ["it"]],
  ["sdc", ["it"]],
  ["sdh", ["ckb", "fa"]],
  ["se", ["nb", "fi"]],
  ["se-fi", ["se", "fi", "sv"]],
  ["se-no", ["se", "nb", "nn"]],
  ["se-se", ["se", "sv"]],
  ["ses", ["fr"]],
  ["sg", ["fr"]],
  ["sgs", ["lt"]],
  ["sh", ["sh-latn", "sh-cyrl", "bs", "sr-latn", "sr-el", "hr"]],
  ["sh-cyrl", ["sr-cyrl", "sr-ec", "sh", "sh-latn"]],
  ["sh-latn", ["sh", "sh-cyrl", "bs", "sr-latn", "sr-el", "hr"]],
  ["shi", ["shi-latn", "fr"]],
  ["shy", ["shy-latn"]],
  ["shy-latn", ["fr"]],
  ["sjd", ["ru"]],
  ["sk", ["cs"]],
  ["skr", ["skr-arab"]],
  ["skr-arab", ["skr"]],
  ["sli", ["de"]],
  ["sma", ["sv", "nb"]],
  ["smn", ["fi"]],
  ["sr", ["sr-cyrl", "sr-ec", "sr-latn", "sr-el"]],
  ["sr-cyrl", ["sr-ec", "sr"]],
  ["sr-ec", ["sr-cyrl", "sr"]],
  ["sr-el", ["sr-latn", "sr"]],
  ["sr-latn", ["sr-el", "sr"]],
  ["srn", ["nl"]],
  ["sro", ["it"]],
  ["stq", ["de"]],
  ["sty", ["ru"]],
  ["su", ["id"]],
  ["szl", ["pl"]],
  ["szy", ["zh-tw", "zh-hant", "zh", "zh-hans"]],
  ["tay", ["zh-tw", "zh-hant", "zh", "zh-hans"]],
  ["tcy", ["kn"]],
  ["tet", ["pt"]],
  ["tg", ["tg-cyrl"]],
  ["tg-cyrl", ["tg"]],
  ["tg-latn", ["tg"]],
  ["trv", ["zh-tw", "zh-hant", "zh", "zh-hans"]],
  ["tt", ["tt-cyrl", "ru"]],
  ["ttj", ["nyo", "nyn", "lg", "sw"]],
  ["tt-cyrl", ["ru"]],
  ["ty", ["fr"]],
  ["tyv", ["ru"]],
  ["udm", ["ru"]],
  ["ug", ["ug-arab"]],
  ["vec", ["it"]],
  ["vep", ["et"]],
  ["vls", ["nl"]],
  ["vmf", ["de"]],
  ["vmw", ["pt"]],
  ["vot", ["fi"]],
  ["vro", ["et"]],
  ["wa", ["fr"]],
  ["wls", ["fr"]],
  ["wo", ["fr"]],
  ["wuu", ["wuu-hans", "wuu-hant", "zh-hans", "zh", "zh-hant"]],
  ["wuu-hans", ["wuu", "wuu-hant", "zh-hans", "zh", "zh-hant"]],
  ["wuu-hant", ["wuu", "wuu-hans", "zh-hant", "zh", "zh-hans"]],
  ["xal", ["ru"]],
  ["xmf", ["ka"]],
  ["yi", ["he"]],
  ["yue", ["yue-hant", "yue-hans"]],
  ["yue-hans", ["yue", "yue-hant"]],
  ["yue-hant", ["yue", "yue-hans"]],
  ["za", ["zh-hans", "zh", "zh-hant"]],
  ["zh-classical", ["lzh", "zh-hant", "zh", "zh-hans"]],
  ["zh-cn", ["zh-hans", "zh", "zh-hant"]],
  ["zh-hans", ["zh-cn", "zh", "zh-hant"]],
  ["zh-hant", ["zh-tw", "zh-hk", "zh", "zh-hans"]],
  ["zh-hk", ["zh-hant", "zh-tw", "zh", "zh-hans"]],
  [
    "zh-min-nan",
    [
      "nan",
      "nan-latn-pehoeji",
      "nan-latn-tailo",
      "nan-hant",
      "cdo",
      "zh-hant",
      "zh",
      "zh-hans"
    ]
  ],
  ["zh-mo", ["zh-hk", "zh-hant", "zh-tw", "zh", "zh-hans"]],
  ["zh-my", ["zh-sg", "zh-hans", "zh-cn", "zh", "zh-hant"]],
  ["zh-sg", ["zh-hans", "zh-cn", "zh", "zh-hant"]],
  ["zh-tw", ["zh-hant", "zh-hk", "zh", "zh-hans"]],
  ["zh-yue", ["yue", "yue-hant", "yue-hans"]]
]), W = `ዓ
ም
`, on = p(W, W);
class ln extends c {
  getAbbreviations() {
    return on;
  }
}
const pn = `ا. د
ا.د
ا.ش.ا
ا
ت.ب
ج.ب
ج.م.ع
جم
س.ت
سم
ص.ب.
ص.ب
كج.
كلم.
م.ب
م
ه
`, b = `A
adj
adm
adv
al
ala
alta
apr
arc
ariz
ark
art
assn
asst
attys
aug
ave
B
bart
bld
bldg
blvd
brig
bros
btw
C
cal
calif
capt
cl
cmdr
co
col
colo
comdr
con
conn
corp
cpl
cres
ct
d.phil
D
dak
dec
del
dept
det
dist
dr.phil
dr.philos
dr
drs
e.g
E
ens
esp
esq
etc
exp
expy
ext
F
feb
fed
fig
fla
ft
fwy
fy
G
ga
gen
gov
H
hon
hosp
hr
hway
hwy
i.e
I
ia
id
ida
ill
inc
ind
ing
insp
J
jan
jr
jul
jun
K
kan
kans
ken
ky
L
la
lt
ltd
M
maj
// man
mar
// mass
may
md
me
med
messrs
mex
mfg
mich
min
minn
miss
mlle
mm
mme
mo
mont
mr
mrs
ms
msgr
mssrs
mt
mtn
Nº
N°
No̱
No
N
neb
nebr
nev
no
nos
nov
nr
O
oct
ok
okla
ont
op
ord
ore
p
P
pa
pd
pde
penn
penna
pfc
ph.d
ph
pl
plz
pp
prof
pvt
Q
que
R
rd
ref
rep
reps
res
rev
rs
rt
S
sask
sec
sen
sens
sep
sept
sfc
sgt
sr
st
supt
surg
T
tce
tenn
tex
u.s
U
univ
usafa
ut
v
V
va
ver
viz
vs
vt
W
// wash
wis
wisc
wy
wyo
X
Y
yuk
Z
`, dn = p(pn, b);
class mn extends c {
  getAbbreviations() {
    return dn;
  }
}
const gn = p(b);
class S extends c {
  getAbbreviations() {
    return gn;
  }
}
const un = new S();
function L(r) {
  return r.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function bn() {
  let r = E.filter((a) => a !== "."), n = [], e = [];
  for (let a of r)
    a.length === 1 ? n.push(L(a)) : e.push(L(a));
  n.push(";", "։", "՜", ":");
  let t = `[${n.join("")}]`;
  return e.length > 0 && (t = `(?:${t}|${e.join("|")})`), new RegExp(`${t}+`, "gu");
}
const hn = bn();
class vn extends c {
  getAbbreviations() {
    return un.getAbbreviations();
  }
  getSentenceBreakRegex() {
    return hn;
  }
}
const fn = `এ
বি
সি
ডি
ঈ
এফ
জি
এইচ
আই
জে
কে
এল
এম
এন
ও
পি
কিউ
আর
এস
টি
ইউ
ভি
ডাবলিউ
এক্স
ওয়াই
জেড
`, kn = p(fn, b);
class wn extends c {
  getAbbreviations() {
    return kn;
  }
}
const zn = `p.s
акад
ал
б.р
б.ред
бел.а
бел.пр
бр
бул
в
вж
вкл
вм
вр
г
ген
гр
дж
дм
доц
др
ем
заб
зам
инж
к.с
кв.м
кв
кг
км
кор
куб.м
куб
л
лв
м.г
м
мин
млн
млрд
мм
н.с
напр
пл
полк
проф
р
рис
с
св
сек
см
сп
срв
ст
стр
т.г
т.е
т.н
т.нар
т
табл
тел
у
ул
фиг
ха
хил
ч
чл
щ.д
`, xn = p(zn);
class jn extends c {
  getAbbreviations() {
    return xn;
  }
}
const yn = new S();
class An extends c {
  getAbbreviations() {
    return yn.getAbbreviations();
  }
  getSentenceBreakRegex() {
    return new RegExp(`(?:${R}|၏)+`, "gu");
  }
}
const F = `a.c
a
a/c
abr
adj
admón
aero
afmo
ago
almte
ambi
an
anfi
ante
anti
ap
apdo
archi
arci
arq
art
atte
auto
av
avda
bco
bi
bibl
bien
bis
bs. as
c.f
c.g
c
c/c
c/u
cap
cc.aa
cdad
cm
co
com
con
contra
cra
crio
cta
cuadri
cuasi
cuatri
cv
d.e.p
da
dcha
dcho
de
deci
dep
des
di
dic
dicc
dir
dis
dn
doc
dom
dpto
dr
dra
dto
ecto
ee
ej
en
endo
entlo
entre
epi
equi
esq
etc
ex
excmo
ext
extra
f.c
fca
fdo
febr
ff. aa
ff.cc
fig
fil
fra
g.p
g/p
geo
gob
gr
gral
grs
hemi
hetero
hiper
hipo
hnos
homo
hs
i
igl
iltre
im
imp
impr
impto
in
incl
infra
ing
inst
inter
intra
iso
izdo
izq
izqdo
j.c
jue
jul
jun
kg
km
lcdo
ldo
let
lic
ltd
lun
macro
mar
máx
may
mega
mg
micro
mié
min
mín
mini
mm
mono
mt
multi
n. del t
n.b
neo
no
nos
nov
ntra. sra
núm
oct
omni
p.a
p.d
p.ej
p.v.p
p
pág
págs
para
párr
párrf
pen
ph.d
ph
pluri
poli
pos
post
pp
ppal
pre
prev
pro
prof
prov
pseudo
ptas
pts
pza
q.e.g.e
q.e.p.d
q.e.s.m
re
reg
rep
retro
rr. hh
rte
s. a
s.a.r
s.e
s.l
s.r.c
s.r.l
s.s.s
s
s/n
sáb
sdad
seg
semi
sept
seudo
sig
sobre
sr
sra
sres
srta
sta
sto
sub
super
supra
t.v.e
tamb
tel
tfno
trans
tras
tri
ud
uds
ulter
ultra
un
uni
univ
uu
v.b
v.e
vd
vds
vice
vid
vie
vol
vs
vto
yuxta

`, En = p(F), Rn = /^[^\p{L}\p{N}_]*[0-9a-z]/u;
class Sn extends c {
  getAbbreviations() {
    return En;
  }
  continueInNextWord(n) {
    return Rn.test(n);
  }
}
const In = `adm
adr
afd
afs
al
alm
ang
ank
anm
ann
ansvh
apr
årg
årh
årl
arr
ass
att
aud
aug
aut
bd
bdt
bet
bhk
bio
biol
bk
bl.a
bot
br
bto
ca
cal
cirk
cit
co
cpr-nr
cvr-nr
d.å
d.æ
d.d
d.e
d.m
d.s.s
d.s
d.y
da
dav
dec
def
del
dep
diam
din
dir
disp
distr
do
dobb
dr
ds
dvs
e.b
e.kr
e.l
e.o
e.v.t
eftf
eftm
egl
eks
eksam
ekskl
eksp
ekspl
el
emer
endv
eng
enk
etc
eur
evt
exam
f.å
f.eks
f.kr
f.m
f.n
f.o.m
f.o
f.s.v
f.t
f.v.t
f
fa
fær
fakt
feb
fec
ff
fg
fhv
fig
fl
flg
fm
fmd
forb
foreg
foren
forf
forh
fork
form
forr
fors
forsk
forts
fp
fr
frk
fru
fuldm
fung
fys
g.d
g.m
g
gd
gdr
gg
gh
gl
gn
gns
gr
grdl
gross
h.a
h.c
hdl
henh
henv
hf
hft
hhv
hort
hosp
hpl
hr
hrs
hum
i.e
i
ib
ibid
if
ifm
ill
indb
indreg
ing
inkl
insp
instr
isl
istf
jan
jf
jfr
jnr
jr
jul
jun
jur
jvf
kal
kap
kat
kbh
kem
kgl
kin
kl
kld
km/t
knsp
komm
kons
korr
kp
kr
kst
kt
ktr
kv
kvt
l.c
l
lab
lat
lb.
lb.nr
lb
lejl
lgd
lic
lign
lin
ling.merc
litt
lø
lok
lrs
ltr
m.a.o
m.fl.st
m.m
m
m/
ma
mag
maks
mar
mat
matr.nr
md
mdl
mdr
mdtl
med
medd
medflg
medl
merc
mezz
mf
mfl
mgl
mhp
mht
mi
mia
mio
ml
mods
modsv
modt
mr
mrk
mrs
ms
mul
mv
mvh
n.br
n.f
n
nat
ned
nedenn
nedenst
nederl
nkr
nl
no
nord
nov
nr
nto
nuv
o.a
ø.f
o.fl.st
o.g
o.h
o.m.a
o
obj
obl
obs
odont
oecon
off
ofl
okt
omg
omr
omtr
on
op.cit
opg
opl
opr
org
orig
osfr
osv
øv
ovenn
ovenst
overs
ovf
øvr
oz
p.a
p.b.v
p.c
p.m.v
p.p
p.s
p.t
p.v.a
p.v.c
  p
  pæd
  par
  partc
  pass
  pct
  pd
  pens
  perf
  pers
  pg
  pga
  pgl
  ph.d
  ph
  pharm
  phil
  pinx
  pk
  pkt
  pl
  pluskv
  polit
  polyt
  port
  pos
  pp
  pr
  præd
  præf
  præp
  præs
  præt
  prc
  priv
  prod
  prof
  pron
  psych
  pt
  q.e.d
  rad
  red
  ref
  reg
  regn
  rel
  rep
  repr
  rest
  rk
  russ
  s.å
  s.br
  s.d
  s.e
  s.f
  s.m.b.a
  s.u
  s
  s/
  sa
  sædv
  såk
  sb
  sc
  scient
  sek
  sekr
  sem
  sen
  sep
  sept
  sg
  sign
  sj
  skr
  skt
  slutn
  sml
  smp
  sms
  smst
  sø
  soc
  sort
  sp
  spec
  spm
  spr
  spsk
  st
  stk
  str
  stud
  subj
  subst
  suff
  sup
  suppl
  sv
  t.h
  t.o.m
  t.v
  t
  tab
  td
  tdl
  tdr
  techn
  tekn
  temp
  th
  ti
  tidl
  tilf
  tilh
  till
  tilsv
  tjg
  tlf
  tlgr
  to
  tr
  trp
  tv
  ty
  u.å
  u.p
  u.st
  u
  uafh
  ubf
  ubøj
  udb
  udbet
  udd
  udg
  uds
  ugtl
  ulin
  ult
  undt
  univ
  v.f
  vær
  var
  vb
  vbsb
  vedk
  vedl
  vedr
  vejl
  vh
  vol
  vs
  vsa
  zool
`, Nn = p(In), Tn = /^[^\p{L}\p{N}_]*[0-9a-z]/u;
class Bn extends c {
  getAbbreviations() {
    return Nn;
  }
  continueInNextWord(n) {
    return Tn.test(n);
  }
}
const On = `
riv.dir.int."le priv
2d
3e
a.2d
a.a.j.b
a.a
a.f.t
a.g.j.b
a.h.v
a.h.w
a.hosp
a.i
a.j.b
a.j.t
a.m.r
a.m
a.p.m
a.p.r
a.p.t
a.s
a.t.d.f
a.u.b
a.v.a
a.w
aanbev.comm
aanbev
aant
aanv.st
aanw.vnw
aanw
abd
abm
abs
acc.& fisc
acc.act
acc.bedr.m
acc.bedr.t
"acc.themas m."
acc.thema’s m
achterv
act.dr.fam
act.dr
act.fisc
act.soc
adm.akk
adm.besl
adm.lex
adm.onderr
adm.ov
adv.bl
adv
afd
afl
aggl.verord
agr
al
alg.richts
alg
amén
ann.dr.lg
ann.dr.sc.pol
ann.dr
ann.ét.eur
ann.fac.dr.lg
ann.jur.créd.règl.coll
ann.jur.créd
ann.not
ann.parl
ann.prat.comm
app
arb
arbbl
arbh
arbit.besl
arbrb
arr.cass
arr.r.v.st
arr.verbr
arr
arrondrb
art
artw
aud
b.&w
b.a.s
b.a
b.b.o
b.best.dep
b.br.ex
b.coll.fr.gem.comm
b.coll.vl.gem.comm
b.d.cult.r
b.d.gem.ex
b.d.gem.reg
b.dep
b.e.b
b.f.r
b.fr.gem.ex
b.fr.gem.reg
b.i.h
b.inl.j.d
b.inl.s.reg
b.j
b.l
b.lid br.ex
b.lid d.gem.ex
b.lid fr.gem.ex
b.lid vl.ex
b.lid w.gew.ex
b.o.z
b.prov.r
b.r.h
b.s
b.sr
b.stb
b.t.i.r
b.t.s.z
b.t.w.rev
b.v
b.ver.coll.gem.gem.comm
b.verg.r.b
b.versl
b.vl.ex
b.voorl.reg
b.w.gew.ex
b.w
b.z.d.g
b.z.v
b
bab
bank fin.r
bank fin
bedr.org
begins
beheersov
bekendm.comm
bel.besch
bel.w.p
bel
beleidsov
belg
benelux jur
ber.w
ber
besch
besl
beslagr
besluitwet nr
best
bestuurswet
bet
betr
bevest
bew
bijbl.n.bijdr
bijbl
bijl
bijv
bijw
bijz.decr
bin.b
bkh
bl
blz
bm
bn
bnlx merkw
bnlx tek
bnlx uitl
bnw
bouwr
br drs
br.parl
bs
bt drs
btw rev
bull.adm.pénit
bull.ass
bull.b.m.m
bull.bel
bull.best.strafinr
bull.bmm
bull.c.b.n
bull.c.n.c
bull.cbn
bull.centr.arb
bull.cnc
bull.contr
bull.doc.min.fin
bull.f.e.b
bull.feb
bull.fisc.fin.r
bull.i.u.m
bull.inf.ass.secr.soc
bull.inf.i.e.c
bull.inf.i.n.a.m.i
bull.inf.i.r.e
bull.inf.iec
bull.inf.inami
bull.inf.ire
bull.inst.arb
bull.ium
bull.jur.imm
bull.lég.b
bull.off
bull.trim.b.dr.comp
bull.us
bull.v.b.o
bull.vbo
bull
bv i.o
bv
bw int.reg
bw
bxh
byz
c.& f.p
c.& f
c.a.-a
c.a.b.g
c.a
c.c.i
c.c.s
c.c
c.conc.jur
c.d.e
c.d.p.k
c.e
c.ex
c.f
c.h.a
c.i.f.i.c
c.i.f
c.j
c.l
c.n
c.o.d
c.p
c.pr.civ
c.q
c.r.a
c.r
c.s.a
c.s.q.n
c.s
c.v.a
c.v.o
c.v
c
ca
cadeaust
cah.const
cah.dr.europ
cah.dr.immo
cah.dr.jud
cal
cap
carg
cas
cass
cert
cf
ch
chr
chron.d.s
chron.dr.not
chron
cie
cir
circ.z
circ
cit.loc
cit
civ
cl.et.b
cmt
co
cognoss.v
coll
colp.w
com.v.min
com
comm.bijz.ov
comm.erf
comm.fin
comm.ger
comm.handel
comm.pers
comm.pub
comm.straf
comm.v.en v
comm.v
comm.venn
comm.verz
comm.voor
comm
comp
compt.w
computerr
con.m
concl
concr
conf
confl.w.huwbetr
confl.w
cons
conv
coöp
corr.bl
corr
cour de cass
cour.fisc
cour.immo
cridon
crim
crt
cur
curs
d.-g
d.a.v
d.a
d.b.f
d.c.c.r
d.c
d.d.p
d.d
d.e.t
d.gem.r
d.h.z
d.h
d.i.t
d.i
d.j
d.l.r
d.m.v
d.m
d.o.v
d.parl
d.w.z
d
dact
dat
dbesch
dbesl
de advoc
de belg.acc
de burg.st
de dr
de gem
de gerechtsd
de venn
de verz
decr.d
decr.fr
decr.vl
decr.w
decr
deelw
def
dep.opv
dep.rtl
derg
desp
det.mag
deurw.regl
dez
dgl
dhr
disp
diss
div.act
div.bel
div
dl
dln
dnotz
doc.jur.b
doc.min.fin
doc.parl
doc
doctr
dpl.besl
dpl
dr.banc.fin
dr.circ
dr.inform
dr.mr
dr.pén.entr
dr.q.m
dr
drs
dtp
dwz
dyn
e cont
e.a
e.b
e.c.a
e.c
e.d
e.e.a
e.e.g
e.e
e.g.a
e.g
e.h.a
e.i
e.j
e.m.a
e.n.a.c
e.o
e.p.c
e.r.c
e.r.f
e.r.h
e.r.o
e.r.p
e.r.v
e.s.r.a
e.s.t
e.v.a
e.v
e.w
e
e&o.e
ec.pol.r
echos log
econ
ed
ed(s)
eeg verd.v
eex san s
eff
eg rtl
eig.mag
eig
eil
elektr
en antw
en gew
en m
en prov
en s
en w
enmb
entr.et dr
enz
err
et al
et seq
etc
etq
eur.t.s
eur.verd.overdracht strafv
eur
ev rechtsh
ev uitl
ev
evt
ex.crim
ex
exec
f.a.o
f.a.q
f.a.s
f.i.b
f.j.f
f.o.b
f.o.r
f.o.s
f.o.t
f.r
f.supp
f.suppl
f
fa
facs
fare act
fasc
fg
fid.ber
fig
fin.verh.w
fin
fisc.act
fisc.koer
fisc
fl
form
foro
fr.cult.r
fr.gem.r
fr.parl
fr
fra
ft
g.a.v
g.a.w.v
g.a
g.g.d
g.m.t
g.o
g.omt.e
g.p
g.s
g.v
g.w.w
g
geb
gebr
gebrs
gec.decr
gec
ged.st
ged
gedipl
gedr.st
geh
gem.comm
gem.gem.comm
gem.st
gem.stem
gem.w
gem.wet gem.wet
gem
gemeensch.optr
gemeensch.standp
gemeensch.strat
gemeent.b
gemeent.regl
gemeent.verord
gemeent
gen
geol
geopp
gepubl
ger.deurw
ger.w
gerekw
gereq
gesch
get
getr
gev.m
gev.maatr
gew
ghert
gir.eff.verk
gk
gr
gramm
grat.w
gronopm.en leermed
grondw
grootb.w
grs
grur ausl
grur int
grvm
grw
gst
gw
h.a.v.o
h.a
h.b.o
h.e.a.o
h.e.g.a
h.e.geb
h.e.gestr
h.l
h.m
h.o
h.r
h.t.l
h.t.m
h.w.geb
hand
handelsn.w
handelspr
handelsr.w
handelsreg.w
handv
harv.l.rev
hc
herald
hert
herz
hfdst
hfst
hgrw
hhr
hist
hooggel
hoogl
hosp
hpw
hr.ms
hr
hregw
hrg
hst
huis.just
huisv.w
huurbl
hv.vn
hw
hyp.w
i.b.s
i.c.m.h
i.c
i.e
i.f.p
i.f
i.g.v
i.h.a
i.h.b
i.h
i.l.pr
i.o
i.p.o
i.p.r
i.p.v
i.pl.v
i.r.d.i
i.s.m
i.t.t
i.v.m
i.v.s
i.v
i.w.tr
i.z
ib
ibid
icip-ing.cons
iem
ind prop
ind
indic.soc
indiv
inf.i.d.a.c
inf.idac
inf.r.i.z.i.v
inf.riziv
inf.soc.secr
inf
ing.cons
ing
inst
"intl & comp.l.q."
int
interm
intern.fisc.act
intern.vervoerr
inv.w
inv.wet
inv
invord.w
inz
ir
irspr
it
iwtr
j.-cl
j.c.b
j.c.e
j.c.fl
j.c.j
j.c.p
j.d.e
j.d.f
j.d.s.c
j.dr.jeun
j.j.d
j.j.p
j.j.pol
j.l.m.b
j.l.o
j.l
j.ordre pharm
j.p.a
j.r.s
j.t.d.e
j.t.dr.eur
j.t.o
j.t.t
j.t
j
jaarl
jb.hand
jb.kred.c.s
jb.kred
jb.l.r.b
jb.lrb
jb.markt
jb.mens
jb.t.r.d
jb.trd
jeugdrb
jeugdwerkg.w
jg
jis
jl
journ.jur
journ.prat.dr.fisc.fin
journ.proc
jrg
jur.comm.fl
jur.dr.soc.b.l.n
jur.f.p.e
jur.fpe
jur.niv
jur.trav.brux
jur
jura falc
jurambt
jv.cass
jv.h.r.j
jv.hrj
jw
k.b
k.g
k.k
k.m.b.o
k.o.o
k.v.k
k.v.v.v
k
kadasterw
kaderb
kador
kbo-nr
kg
kh
kiesw
kind.bes.v
kkr
koopv
kr
krankz.w
ksbel
kt
ktg
ktr
kvdm
kw.r
kymr
kzr
kzw
l.b.o
l.b
l.bas
l.c
l.gew
l.j
l.k
l.l
l.o
l.r.b
l.u.v.i
l.v.r
l.v.w
l.w
"lexp.-compt.b."
l’exp.-compt.b
l
landinr.w
landscrt
larcier cass
lat
law.ed
lett
levensverz
lgrs
lidw
limb.rechtsl
lit
litt
liw
liwet
lk
ll.(l.)l.r
ll
loonw
losbl
ltd
luchtv.w
luchtv
m.a.v.o
m.a.w
m.b.o
m.b.r
m.b.t
m.b
m.d.g.o
m.e.a.o
m.e.r
m.h.d
m.h
m.i.v
m.j.t
m.k
m.m.a
m.m.h.h
m.m.v
m.m
m.n
m.not.fisc
m.nt
m.o
m.r
m.s.a
m.u.p
m.v.a
m.v.h.n
m.v.t
m.z
m
maatr.teboekgest.luchtv
maced
mand
max
mbl.not
me
med.b.u.f.r
med.bufr
med.vbo
med
meerv
meetbr.w
mém.adm
mgr
mgrs
mhd
mi.verantw
mil.bed
mil.ger
mil
min.j.omz
min.just.circ
min
mitt
mnd
mod
mon
monde ass
mouv.comm
mr
ms
muz
mv
mva ii inv
mva inv
n cont
n.a.g
n.a.v
n.a
n.b
n.c
n.chr
n.d.r
n.d
n.e.a
n.g
n.h.b.c
n.j.b
n.j.w
n.j
n.l
n.m.m
n.m
n.n.b
n.n.g
n.n.k
n.n
n.o.m
n.o.t.k
n.rapp
n.tijd.pol
n.v.d.r
n.v.d.v
n.v.h
n.v.o.b
n.v.t
n.v
n
nat.besch.w
nat.omb
nat.pers
ned.cult.r
neg.verkl
nhd
nieuw arch
njcm-bull
nl
nnd
no
not.fisc.m
not.w
not.wet
not
nr
nrs
nste
nt
numism
o.a
o.b
o.c
o.g.v
o.g
o.i.d
o.i
o.m
o.o.d
o.o.v
o.o
o.p
o.r
o.regl
o.s
o.t.s
o.t.t.t
o.t.t.z
o.t.t
o.tk.t
o.v.t.t
o.v.t
o.v.tk.t
o.v.v
o
ob
obsv
octr.gem.regl
octr.regl
octr
oe
oecd mod
off.pol
ofra
ohd
omb
omnia frat
omnil
omz
on.ww
onderr
onfrank
onteig.w
ontw
onuitg
onz
oorl.w
op.cit
opin.pa
opm
or
ord.br
ord.gem
ors
orth
os
osm
ov.w.i
ov.w.ii
ov.ww
ov
overg.w
overw
ovkst
ow kadasterw
oz
p.& b
p.a.o
p.a
p.b.o
p.e
p.g
p.j
p.m.a
p.m
p.o.j.t
p.o
p.p
p.v.s
p.v
p
pachtw
pag
pan
pand.b
pand.pér
parl.gesch
parl.st
parl
part.arb
pas
pasin
pat
pb.c
pb.l
pens
pensioenverz
per.ber.i.b.r
per.ber.ibr
pers
pft
pg wijz.rv
pk
pktg
pli jur
plv
po
pol.off
pol.r
pol.w
pol
politie j
postbankw
postw
pp
pr
preadv
pres
prf
prft
prg
prijz.w
pro jus
proc
procesregl
prof
prot
prov.b
prov.instr.h.m.g
prov.regl
prov.verord
prov.w
prov
publ.cour eur.d.h
publ.eur.court h.r
publ
pun
pw
q.b.d
q.e.d
q.q
q.r
r.a.b.g
r.a.c.e
r.a.j.b
r.b.d.c
r.b.d.i
r.b.s.s
r.c.b
r.c.d.c
r.c.j.b
r.c.s.j
r.c
r.cass
r.d.c
r.d.i.d.c
r.d.i
r.d.j.b
r.d.j.p
r.d.p.c
r.d.s
r.d.t.i
r.e
r.f.s.v.p
r.g.a.r
r.g.c.f
r.g.d.c
r.g.f
r.g.z
r.h.a
r.i.c
r.i.d.a
r.i.e.j
r.i.n
r.i.s.a
r.j.d.a
r.j.i
r.k
r.l.g.b
r.l
r.med.rechtspr
r.med
r.n.b
r.o
r.orde apoth
r.ov
r.p.d.b
r.p.o.t
r.p.r.j
r.p.s
r.p
r.r.d
r.r.s
r.s.v.p
r.s
r.stvb
r.t.d.f
r.t.d.h
r.t.l
r.trim.dr.eur
r.v.a
r.v.k
r.verkb
r.w.d
r.w
r
rap.ann.c.a
rap.ann.c.c
rap.ann.c.e
rap.ann.c.s.j
rap.ann.ca
rap.ann.cass
rap.ann.cc
rap.ann.ce
rap.ann.csj
rapp
rb.kh
rb.van kh
rb
rdn
rdnr
re.pers
rec.c.i.j
rec.c.j.c.e
rec.cij
rec.cjce
rec.cour eur.d.h
rec.gén.enr.not
rec.lois decr.arr
rec
rechtsh
rechtsk.t
rechtspl.zeem
rechtspr.arb.br
rechtspr.b.f.e
rechtspr.bfe
rechtspr.soc.r.b.l.n
recl.reg
rect
red
reg.huiz.bew
reg.w
reg
registr.w
regl.besl
regl.onderr
regl.r.t
regl
rep.eur.court h.r
rép.fisc
rép.not
rep.r.j
rep.rj
rep
req
res
resp
rev.acc.trav
rev.adm
rev.b.compt
rev.b.dr.const
rev.b.dr.intern
rev.b.séc.soc
rev.banc.fin
rev.comm
rev.cons.prud
rev.dr.b
rev.dr.commun
rev.dr.étr
rev.dr.fam
rev.dr.intern.comp
rev.dr.mil
rev.dr.min
rev.dr.pén.mil
rev.dr.pén
rev.dr.rur
rev.dr.u.l.b
rev.dr.ulb
rev.exp
rev.faill
rev.fisc
rev.gd
rev.hist.dr
rev.i.p.c
rev.ipc
rev.not.b
rev.prat.dr.comm
rev.prat.not.b
rev.prat.soc
rev.rec
rev.rw
rev.trav
rev.trim.d.h
rev.trim.dr.fam
rev.urb
rev
rh
richtl
riv.dir.int.priv.proc
riv.dir.int
rk
rln
roln
rom
rondz
rov
rprt
rtl
rubr
ruilv.wet
rv.verdr
rvkb
s.a
s.b.n
s.ct
s.d
s.e.c
s.e.et.o
s.e.w
s.exec.rept
s.hrg
s.j.b
s.l.e.a
s.l.n.d
s.l
s.p.a
s.s
s.t.b
s.t
s.v.p
s.v
s
samenw
sc
sch
scheidsr.uitspr
schepel.besl
secr.comm
secr.gen
sect.soc
sess
sir
soc.act
soc.best
soc.kron
soc.r
soc.sw
soc.weg
soc
sofi-nr
somm.ann
somm
sp.c.c
sr
ss
st.doc.b.c.n.a.r
st.doc.bcnar
st.vw
st
stagever
stas
stat
stb
stbl
stcrt
stichting i.v
strafz
stud.dipl
su
subs
subst
succ.w
suppl
sv
sw
t.a.a
t.a.n
t.a.p
t.a.s.n
t.a.v.w
t.a.v
t.a
t.aann
t.acc
t.agr.r
t.app
t.b.b.r
t.b.h
t.b.m
t.b.o
t.b.p
t.b.r
t.b.s
t.b.v
t.bankw
t.belg.not
t.desk
t.e.m
t.e.p
t.f.r
t.fam
t.fin.r
t.g.r
t.g.t
t.g.v
t.gem
t.gez
t.huur
t.i.n
t.in b.z
t.j.k
t.l.l
t.l.v
t.m.r
t.m.w
t.m
t.mil.r
t.mil.strafr
t.not
t.o.r.b
t.o.v
t.o
t.ontv
t.orde geneesh
t.p.r
t.pol
t.r.d.& i
t.r.g
t.r.o.s
t.r.v
t.r
t.s.r
t.strafr
t.t
t.u
t.v.c
t.v.g
t.v.m.r
t.v.o
t.v.v.d.b
t.v.v
t.v.w
t.verz
t.vred
t.vreemd
t.w.k
t.w.v.r
t.w.v
t.w
t.wrr
t.z.t
t.z.v
t.z
t
taalk
tar.burg.z
td
techn
tek.mod
telecomm
tijdschr
toel.st.v.w
toel
toep.regl
toep
tom
top
trans.b
transp.r
trav.com.ét.et lég.not
trb
trib.civ
trib.gr.inst
trib
trim
ts
turnh.rechtsl
tvpol
tvpr
tvrechtsgesch
tw
u.a.r
u.a.v
u.a
u.c.c
u.c
u.g
u.p
u.s.d.c
u.s
u
uitdr
uitl.w
uitv.besch.div.b
uitv.besl.bel.rv
uitv.besl.l.b
uitv.besl
uitv.reg.afd.verm
uitv.reg.bel.d
uitv.reg.lb
uitv.reg.succ.w
uitv.reg
univ.verkl
univ
v.& f
v.a.v
v.a
v.b.o
v.bp prot
v.c
v.chr
v.h
v.huw.verm
v.i.o
v.i
v.k.a
v.m
v.o.f
v.o.n
v.onderh.verpl
v.p
v.r
v.s.o
v.t.t.t
v.t.t
v.tk.t
v.toep.r.vert
v.v.b
v.v.g
v.v.t.t
v.v.t
v.v.tk.t
v.w.b
v.z.m
v
vb.bo
vb
vbb
vc
vd
veldw
ver.k
ver.verg.gem
ver
verbr
verd
verdr.v
verdr
verdrag benel.i.z
verenw
verg.fr.gem
verg
verkl.herz.gw
verkl
verl
vern
verord
vers.r
versch
versl.c.s.w
versl.csw
vert
verv
verw
verz.schr
verz.w
verz.wett.besl
verz.wett.decr.besl
verz
vgl
vid
vigiles jb
viss.w
vl.parl
vl.r
vl.t.gez
vl.w.reg
vl.w.succ
vlg
vn
vnl
vnw
vo.bl
vo
voegw
vol
volg
volt
voorl
voorz
vord.w
vorst.d
vr
vred
vrg
vrijgrs
vs
vt
vvsr jb
vw
vz
vzngr
vzr
w.a
w.b.r
w.c.h
w.conf.huw
w.conf.huwelijksb
w.consum.kr
w.f.r
w.g
w.gelijke beh
w.gew.r
w.ident.pl
w.just.doc
w.kh
w.l.r
w.l.v
w.mil.straf.spr
w.n
w.not.ambt
w.o.d.huurcomm
w.o.d.k
w.o
w.openb.manif
w.parl
w.r
w.reg
w.succ
w.u.b
w.uitv.pl.verord
w.v.k
w.v.m.s
w.v.r
w.v.w
w.v
w.venn
w
wac
wd
wet a.b
wet bel.rv
wet c.a.o
wet c.o
wet div.bel
wet ksbel
wet l.v
wetb
wgb
winkelt.w
wisk
wka-verkl
wnd
won.w
woningw
woonr.w
wrr.ber
wrr
wrsch
ws
wsch
wsr
wtvb
ww
x.d
z cont
z.a
z.g
z.i
z.j
z.o.z
z.p
z.s.m
zesde richtl
zg
zgn
zn
znw
zr.ms
zr
`, qn = p(On);
class $n extends c {
  getAbbreviations() {
    return qn;
  }
}
const Cn = `A
B
C
D
E
F
G
H
I
J
K
L
M
N
O
P
Q
R
S
T
U
V
W
X
Y
Z
Å
Ä
Ö
// List of titles.
// These are often followed by upper-case names but do not indicate sentence breaks
alik
alil
amir
apul
apul.prof
arkkit
ass
assist
dipl
dipl.arkkit
dipl.ekon
dipl.ins
dipl.kielenk
dipl.kirjeenv
dipl.kosm
dipl.urk
dos
Dr
erikoiseläinl
erikoishammasl
erikoisl
erikoist
ev.luutn
evp
fil
ft
hallinton
hallintot
hammaslääket
jatk
jääk
kansaned
kapt
kapt.luutn
kenr
kenr.luutn
kenr.maj
kers
kirjeenv
kom
kom.kapt
komm
konst
korpr
luutn
maist
maj
Mr
Mrs
Ms
M.Sc
neuv
nimim
Ph.D
prof
puh.joht
pääll
res
san
siht
suom
sähköp
säv
toht
toim
toim.apul
toim.joht
toim.siht
tuom
ups
vänr
vääp
ye.ups
ylik
ylil
ylim
ylimatr
yliop
yliopp
ylip
yliv
// misc - odd period-ending items that NEVER indicate breaks (p.m. does NOT fall
// into this category - it sometimes ends a sentence)
e.g
ent
esim
huom
i.e
ilm
l
mm
myöh
nk
nyk
par
po
t
v
`, Mn = p(Cn), _n = /^[^\p{L}\p{N}_]*[0-9a-z]/u, Wn = [
  "tammikuu",
  "helmikuu",
  "maaliskuu",
  "huhtikuu",
  "toukokuu",
  "kesäkuu",
  "heinäkuu",
  "elokuu",
  "syyskuu",
  "lokakuu",
  "marraskuu",
  "joulukuu"
], V = new Set(Wn);
class Ln extends c {
  getAbbreviations() {
    return Mn;
  }
  continueInNextWord(n) {
    if (_n.test(n))
      return !0;
    let e = n.trim().split(/\s+/)[0] || "";
    if (!e) return !1;
    if (V.has(e)) return !0;
    let t = e.charAt(0).toUpperCase() + e.slice(1);
    return !!V.has(t);
  }
}
const Vn = `a.c.n
a.m
al
ann
apr
art
auj
av
b.p
boul
c.-à-d
c.n.s
c.n
c.p.i
c.q.f.d
c.s
ca
cf
ch.-l
chap
co
contr
dir
e.g
e.v
éd
env
etc
ex
fasc
fém
fig
fr
hab
i.e
ibid
id
inf
l.d
lib
ll.aa.ii
ll.aa.rr
ll.aa.ss
ll.aa
ll.ee
ll.mm.ii.rr
ll.mm
loc.cit
ltd
masc
mm
ms
n.b
n.d.a
n.d.l.r
n.d.t
n.d
n.p.a.i
n.s
n/réf
nn.ss
p.c.c
p.ex
p.j
p.s
pl
pp
r.-v
r.a.s
r.i.p
r.p
s.a.i
s.a.r
s.a.s
s.a
s.e
s.m.i.r
s.m
s.s
sec
sect
sing
sq
sqq
ss
suiv
sup
suppl
t.s.v.p
tél
vb
vol
vs
x.o
z.i
`, Gn = p(Vn);
class Un extends c {
  getAbbreviations() {
    return Gn;
  }
}
const Pn = `ä
Ä
adj
adm
adv
ao.univ.prof
art
ass.prof
ass
asst
b.a
b.s
bart
bldg
brig
bros
bse
buchst
bzgl
bzw
c.-à-d
ca
capt
chr
cmdr
co
col
comdr
con
corp
cpl
d.h
d.j
dergl
dgl
di
dipl.-ing
dkr
dr 
ens
etc
ev 
evtl
ff
g.g.a
g.u
gen
ggf
gov
hon.prof
hon
hosp
i.f
i.h.v
ii
iii
insp
iv
ix
jun
k.o
kath
lfd
lt
ltd
m.e
mag
maj
med
messrs
mio
mlle
mm
mme
mr
mrd
mrs
ms
msgr
mwst
no
nos
nr
o.ä
o.univ.-prof
op
ord
pfc
ph
pp
prof
projektass
pvt
rep
reps
res
rev
rt
s
s.p.a
sa
sen
sens
sfc
sgt
sog
sogen
spp
sr
st
std
str  
stud.ass
supt
surg
T
u.a  
u.ä
u.e
u.s.w
u.u
univ.-doz
univ.-prof
univ.ass
usf
usw
v
vgl
vi
vii
viii
vs
x
xi
xii
xiii
xiv
xix
xv
xvi
xvii
xviii
xx
z.b
z.t
z.z
z.zt
zt
zzt
`, Xn = p(Pn, b), Dn = /^[^\p{L}\p{N}_]*[0-9a-z]/u, Fn = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember"
], G = new Set(Fn);
class Hn extends c {
  getAbbreviations() {
    return Xn;
  }
  continueInNextWord(n) {
    if (Dn.test(n))
      return !0;
    let e = (n.trim().split(/\s+/)[0] || "").replace(/[?!.]/g, "");
    if (!e) return !1;
    if (G.has(e)) return !0;
    let t = e.charAt(0).toUpperCase() + e.slice(1);
    return !!G.has(t);
  }
}
const Kn = `Δρ
κ
κα
δρ
κ
λπ
κλπ
π
χ
λ
χ
π
μ
π.χ
τ
Υ
Γ
Τ
Κ
`, Jn = p(Kn, b);
class Yn extends c {
  getAbbreviations() {
    return Jn;
  }
  getSentenceBreakRegex() {
    return new RegExp(`(?:${R}|;)+`, "gu");
  }
}
const Qn = `એ
બી
સી
ડી
ઈ
એફ
જી
એચ
આઈ
જે
કે
એલ
એમ
એન
ઓ
પી
ક્યૂ
આર
એસ
ટી
યૂ
વી
ડબલ્યૂ
એક્સ
વાય
જેડ
`, Zn = p(Qn, b);
class ne extends c {
  getAbbreviations() {
    return Zn;
  }
}
const ee = `ए
बी
सी
डी
ई
एफ
जी
एच
आई
जे
के
एल
एम
एन
ओ
पी
क्यू
आर
एस
टी
यू
भी
डब्लू
एक्स
वाई
जेड
`, re = p(ee, b);
class H extends c {
  getAbbreviations() {
    return re;
  }
}
const ae = `°c
°f
°n
°ra
°ré
1°
a.c
a.c/a
a.cam
a.civ
a.cor
a.d.r
a.gov
a.mil
a.mon
a.smv
a.v
a/a
a/c
a/i
aa
aaaa
aaal
aacst
aamct
aams
aar
aato
ab
abbigl
abbrev
abc
abi
abl
abm
abr
abs
absp
ac
acam
acb
acbi
acc
accorc
accr
acd
ace
acec
acep
aci
acli
acp
acro
acsit
actl
ad.mil
ad
ada
adap
adatt
adc
add
adei
adeion
adhd
adi
adisco
adj
adm
adp
adr
ads
adsi
adsl
adv
ae.b
aefi
aer
aerodin
aeron
afa
afc
afci
affl
afi
afic
afm
afp
ag
agcm
agcom
age
agecs
agesci
agg
agip
agis
agm
ago
agr
agric
agt
ai
aia
aiab
aiac
aiace
aiap
aias
aiat
aib
aic
aica
aicel
aici
aics
aid
aida
aidaa
aidac
aidama
aidda
aidim
aido
aids
aies
aif
aih
aiip
aimi
aip
aipsc
airi
ais
aisa
aism
aiss
aissca
aitc
aiti
aitr
aits
aka
al
alai
alch
alg
ali
alim
all
allev
allus
alp
alq
alt
am
amm
ama
amaci
amag
amami
amc
ammec
amn
ampas
amps
an
ana
anaai
anac
anaci
anad
anai
anaoo
anart
anat. comp
anat
ancci
anci
ancip
ancsa
andit
anec
anee
anem
anes
anffas
ani
ania
anica
anie
animi
anis
anisc
anm
anmfit
anmig
anmil
anmli
anms
anpa
anpas
anpci
anpe
anpi
ansi
ansv
ant
anta
antifr
antlo
anton
antrop
anusca
anvi
anx
ao
ap
apa
apd
apea
apec
apet
api
apos
app.sc
app
apr
aps
apt
aq
ar.ind
ar.rep
ar
arald
arame
arc
arch
archeol
arci
ardsu
are
arg
aritm
arpa
arpat
arred
arrt
arsia
art
arti min
artig
artigl
artt
as
asa
asae
asc
asci
ascii
ascom
ascop
asd
ase
asf
asfer
asg
asic
asifa
asl
asmdc
asmi
asp
aspic
aspp
assi
assic
assol
asst
aster
astr
astrol
astron
at
ata
atb
atic
atm
ats
att
attrav
atv
au
auc
aus
auser
aut
autom
av
avi
avis
avo
avv
avvers
awb
awdp
az
azh
b.a
b2b
b2c
ba
bafta
bal
ball
ban
banc
bar
bart
bas
bat
batt
bban
bbc
bbl
bbs
bbtc
bcc
bce
bcf
bdf
bei
bep
bers
bg
bi
bibl
bic
bioch
biol
bl
bld
bldg
blpc
bm
bmps
bmw
bn
bna
bncf
bncrm
bni
bnl
bo
bot
bpl
bpm
bpn
bpr
br
brd
bre
bric
brig.ca
brig.gen
brig
bros
bs
bsc
bsp
bsu
bt
btc
btg.l
btg
btr
bts
bu
bur
bz
c.a.p
c.a
c.c.p
c.cost
c.d a
c.d
c.le
c.m
c.opv
c.p
c.s
c.v.d
c.v
c/a
c/c
c/pag
ca.rep
ca.sm
ca.sz
ca.uf
ca
caaf
cab
cad
cae
cai
cal
cam
cap
capol
capt
car.sc
car
carat
card
cas
casaca
casd
cass.civ
cat
caus
cav
cavg
cb
cbd
cbr
cbs
cc
cca
ccap
ccda
ccdp
ccee
cciaa
ccie
ccip
cciss
ccna
ccnl
ccnp
ccpb
ccs
ccsp
cctld
cctv
ccv
cd
cda
cdma
cdo
cdpd
cdr
cds
cdw
ce
ced
cee
cei
cemat
cenelec
centr
cepis
ceps
cept
cerit
cese
cesis
cesvot
cet
cf
cfa
cfr
cg
cgi
cgil
cgs
ch
chf
chim. ind
chim
chir
ci-europa
ci
ciber
cicae
cid
cie
cif
cifej
cig
cigs
cii
cilea
cilo
cim
cime
cin
cinit
cio
cipe
cirm
cisal
ciscs
cisd
cisl
cism
citol
cl
class
cli
cm
cm²
cm³
cmdr
cme
cmo
cmr
cms
cmyk
cn
cna
cnb
cnc
cnel
cngei
cni
cnipa
cnit
cnn
cnr
cns
cnt
cnvvf
co.ing
co.sa
co
cobas
coc
cod. civ
cod. deont. not
cod. pen
cod. proc. civ
cod. proc. pen
cod
codec
coi
col
colf
coll
com
comdr
comm
comp
compar
compl
con
conai
conc
concl
condiz
confetra
confitarma
confr
cong
congeav
congiunt
coni
coniug
consec
consob
contab
contr
coreco
corp
corr
correl
corrisp
cosap
cospe
cost
costr
cpc
cpdel
cpe
cpi
cpl
cpt
cpu
cr
cral
credem
crf
cri
cric
cristall
crm
cro
cron
crsm
crt
cs
csa
csai
csc
csm
csn
css
ct
ctc
cte
cti
ctr
ctsis
cuc
cud
cun
cup
cusi
cvb
cvbs
cwt
cz
d.c
d.i.a
d
dab
dac
dam
dams
dat
dau
db
dbms
dc
dca
dccc
dda
ddp
ddr
ddt
dea
decoraz
dect
dek
denom
deriv
derm
determ
df
dfp
dg
dga
dhcp
di
dia
dial
dic
dicomac
dif
difett
dig. iv
digos
dimin
dimostr
din
dipart
diplom
dir. amm
dir. can
dir. civ
dir. d. lav
dir. giur
dir. internaz
dir. it
dir. pen
dir. priv
dir. proces
dir. pub
dir. rom
dir
disus
diy
dl
dlf
dm
dm²
dm³
dme
dmf
dmo
dmoz
dnr
dns
doa
doc
docg
dom
dop
dos
dott
dpa
dpi
dpl
dpof
dps
dpt
dr
dra
drm
drs
dry pt
ds
dslam
dspn
dss
dtc
dtmf
dtp
dts
dv
dvb-t
dvb
dvd
dvi
dwdm
e.g
e.p.c
ead
eafrd
ean
eap
easw
eb
eban
ebr
ebri
ebtn
ecc
eccl
ecdl
ecfa
ecff
ecg
ecm
econ. az
econ. dom
econ. pol
econ
ecpnm
ed agg
ed
edge
edi
edil
edit
ef
efa
efcb
efp
efsa
efta
eg
egiz
egl
egr
ei
eisa
elab
elettr
elettron
ellitt
emap
emas
embr
emdr
emi
emr
en
enaip
enal
enaoli
enapi
encat
enclic
enea
enel
eni
enigm
enit
enol
enpa
enpaf
enpals
enpi
enpmf
ens
entom
epd
epigr
epirbs
epl
epo
ept
erc
ercom
ermes
erp
es
esa
escl
esist
eso
esp
estens
estr. min
etacs
etf
eti
etim
etn
etol
eu
eufem
eufic
eula
eva®
f
f.a
f.b
f.m
f.p
fa
fabi
fac
facl
facs
fad
fai
faile
failp
failpa
faisa
falcri
fam
famar
fans
fao
fapav
faq
farm
fasi
fasib
fatt
fbe
fbi
fc
fco
fcp
fcr
fcu
fdi
fe
feaog
feaosc
feb
fedic
fema
feoga
ferr
fesco
fesr
fess
fg
fi
fiaf
fiaip
fiais
fialtel
fiap
fiapf
fiat
fiavet
fic
ficc
fice
fidal
fidam
fidapa
fieg
fifa
fifo
fig
figc
figs
filat
filcams
file
filol
filos
fim
fima
fimmg
fin
finco
fio
fioto
fipe
fipresci
fis
fisar
fisc
fisg
fisiol
fisiopatol
fistel
fit
fita
fitav
fits
fiv
fivet
fivl
flo
flpd
fluid pt
fm
fmcg
fmi
fmth
fnas
fnomceo
fnsi
fob
fod
folcl
fon
fop
fotogr
fp
fpc
fpld
fr
fra
fs
fsc
fse
fsf
fsfi
fsh
ft
ft²
ft³
ftase
ftbcc
fte
ftp
fts
fuaav
fut
fv
fvg
g.fv
g.u.el
g.u
gal
gats
gatt
gb
gc
gccc
gco
gcost
gd
gdd
gdf
gdi
gdo
gdp
ge
gea
gel
gen
geneal
geod
geofis
geogr. antr
geogr. fis
geogr
geol
geom
gep
germ
gescal
gg
ggv
gi
gia
gides
gift
gio
giorn
gis
gisma
gismo
giu
gm
gmdss
gme
gmo
go
gov
gp
gpl
gprs
gps
gr.sel.spec
gr.sel.tr
gr.sqd
gr
gra
gram
grano
grd
grtn
grv
gsa
gsm-r
gsm
gsr
gtld
gu
guce
gui
gus
ha
haart
haccp
hba
hcg
hcrp
hd-dvd
hdcp
hdi
hdml
hdtv
hepa
hfpa
hg
hifi
hiperlan
hiv
hm
hmld
hon
hosp
hpv
hr
hrh
hrm
hrt
html
http
hvac
hz
i.e
i.g.m
iana
iasb
iasc
iass
iat
iata
iatse
iau
iban
ibid
ibm
icann
icao
icbi
iccu
ice
icf
ici
icm
icom
icon
ics
icsi
icstis
ict
icta
id
iden
idl
idraul
iec
iedm
ieee
ietf
ifat
ifel
ifla
ifrs
ifto
ifts
ig
igm
igmp
igp
iims
iipp
ilm
ilo
ilor
ils
im
imaie
imap
imc
imdb
imei
imi
imms
imo
imp
imper
imperf
impers
imq
ims
imsi
in
in²
in³
inail
inca
incb
inci
ind. agr
ind. alim
ind. cart
ind. chim
ind. cuoio
ind. estratt
ind. graf
ind. mecc
ind. tess
ind
indecl
indef
indeterm
indire
inea
inf
infea
infm
inform
ing
ingl
inmarsat
inpdai
inpdap
inpgi
inps
inr
inran
ins
insp
int
inter
intr
invar
invim
ioma
iosco
ip
ipab
ipasvi
ipi
ippc
ips
iptv
iq
ira
irap
ircc
ircs
irda
iref
ires
iron
irpef
irpeg
irpet
irreg
is
isae
isbd
isbn
isc
isdn
isee
isef
isfol
isg
isi
isia
ism
ismea
isnart
iso
isp
ispearmi
ispel
ispescuole
ispesl
ispo
ispro
iss
issn
istat
istol
isvap
it
iti
itt
ittiol
itu
iud
iugr
iulm
iva
iveco
ivg
ivr
ivs
iyhp
j
jal
jit
jr
jv
k
kb
kee
kg
kkk
klm
km
km/h
km²
kmph
kmq
kr
kw
kwh
l.n
l'avv
l'ing
l
la
lag
lan
lanc
larn
laser
lat
lav. femm
lav. pubbl
lav
laz
lb
lc
lcca
lcd
le
led
lett
lh
li
liaf
lib
lic.ord
lic.strd
lic
licd
lice
lida
lidci
liff
lifo
lig
liit
lila
lilt
linfa
ling
lipu
lis
lisaac
lism
lit
litab
lnp
lo
loc. div
loc
lolo
lom
long
lp
lrm
lrms
lsi
lsu
lt
ltd
lu
lug
luiss
lun
lwt
lww
m.a
m.b
m.o
m/s
m²
m³
ma
mac
macch
mag
magg.(maj)
magg.gen.(maj.gen.)
mai
maj
mar.a
mar.ca
mar.ord
mar
marc
mat
mater
max
mb
mbac
mc
mcl
mcpc
mcs
md
mdf
mdp
me
mec
mecc
med
mediev
mef
mer
merc
merid
mesa
messrs
metall
meteor
metr
metrol
mg
mgc
mgm
mi
mibac
mica
microb
mifed
miglio nautico per ora
miglio nautico
miglio nautico²
miglio²
mil
mile
miles/h
milesph
min
miner
mips
miptv
mit
mitol
miur
ml
mlle
mls
mm
mm²
mme
mms
mn
mnp
mo
mod
mol
mons
morf
mos
mpaa
mpd
mpeg
mpi
mps
mq
mr
mrs
ms
msgr
mss
mt
mto
murst
mus
mvds
mws
n.a
n.b
na
naa
nafta
napt
nars
nasa
nat
natas
nato
nb
nba
nbc
ncts
nd
nda
nde
ndr
ndt
ne
ned
neg
neol
netpac
neur
news!
ngcc
nhmf
nlcc
nmr
no
nodo
nom
nos
nov
novissdi
npi
nr
nt
nta
nts
ntsc
nu
nuct
numism
nwt
nyc
nz
o.m.i
oai-pmh
oav
oc
occ
occult
oci
ocr
ocse
oculist
od
odg
odp
oecd
oem
ofdm
oft
og
ogg
ogi
ogm
ohim
oic
oics
olaf
oland
ole
oled
omi
oms
on
ong
onig
onlus
onomat
onpi
onu
op
opac
opec
opord
opsosa
or
ord. scol
ord
ore
oref
orient
ornit
orogr
orp
ort
os
osa
osas
osd
ot
ote
ott
oz
p.a
p.c.c
p.c
p.es
p.f
p.m
p.r
p.s
p.t
p.v
p
pa
pac
pag./p
pagg./pp
pai
pal
paleobot
paleogr
paleont
paleozool
paletn
pamr
pan
papir
par
parapsicol
part
partic
pass
pat
patol
pb
pc
pci
pcm
pcmcia
pcs
pcss
pct
pd
pda
pdf
pdl
pds
pe
pec
ped
pedag
peg
pegg
per.ind
pers
pert
pesq
pet
petr
petrogr
pfc
pg
pga
pgp
pgut
ph
php
pi
pics
pie
pif
pii
pil
pime
pin
pine
pip
pir
pit
pitt
piuss
pkcs
pki
pko
pl
pli
plr
pm
pma
pmi
pmr
pn
pnf
pnl
po
poet
pof
pol
pop
popitt
popol
port
pos
poss
post
pots
pp
ppa
ppc
ppga
ppp
pps
pptt
ppv
pr
pra
praa
pref
preist
prep
pres
pret
prg
pri
priv
pro.civ
prof
pron
pronom
propr
prov
prs
prtl
prusst
ps
pse
psi
psicoan
psicol
pso
psp
pstn
pt
ptc
pti
ptsd
ptt
pu
pug
puk
put
pv
pvb
pvc
pvt
pz
qb
qcs
qfd
qg
qi
qlco
qlcu
qos
qualif
r-lan
r.s
ra
racc
radar
radc
radiotecn
raee
raf
rag
raid
ram
rar
ras
rass. avv. stato
rc
rca
rcdp
rcs
rdc
rdco
rdf
rdi
rdp
rds
rdt
re
rea
recipr
recl
reg
region
rel
rem
rep
reps
res
retor
rev
rfi
rfid
rg
rgb
rgc
rge
rgi bdp
rgi
rgpt
rgt
ri
riaa
riaj
riba
ric
rid
rif
rifl
rina
rip
ris
rit
ritts
rm
rmn
rn
ro
roa
roc
roi
rom
roro
rov
rp
rpm
rr
rrf
rs
rsc
rspp
rss
rsu
rsvp
rt
rtdpc
rtg
rtn
rtp
rttt
rvm
s-dab
s.a
s.b.f
s.n.c
s.p.a
s.p.m
s.r.l
s.ten
s.v
s/m
sa
sab
saca
sace
sact
sad
sag
sahm
sai
saisa
sam
san
sanas
sape
sar
sars
sart
sas
sbaf
sbas
sbn
sc
sca.sm
scherz
scien
scn
scsi
scuba
scult
scut
sdds
sdiaf
sds
sdsl
se
seat
sebc
sec
seca
secam
secc
see
seg
segg
segredifesa
sem
sempo
sen
sens
seo
serg.magg.(sgm)
serg.magg.ca
serg
set
sfc
sfis
sfx
sg
sga
sgc
sgg
sgml
sgt
si
si@lt
sia
siae
siaic
siap
sias
sic
sicav
sid
sido
sie
sif
sig.na
sig.ra
sig
sige
sigg
sigill
sigo
siia
simb
simbdea
simg
simo
sin
sinalv
sing
sins
sinu
siocmf
siog
sioi
siommms
siot
sip
sipem
sips
sirf
sirm
sis
sisde
sismi
sissa
sit
siulp
siusa
sla
sldn
slm
slr
sm
sma
smau
smd
sme
smes
smm
smpt
sms
sn
snad
snai
snc
sncci
sncf
sngci
snit
so
soc
sociol
sogg
soho
soi
sol
somipar
somm
sonar
sp
spa
spe
spett
spi
spm
spot
spp
spreg
sq
sqd
sr
srd
srl
srr
ss
ssi
ssn
ssr
sss
st. d. arte
st. d. dir
st. d. filos
st. d. rel
st
stat
stg
stp
stw
su
suap
suem
suff
sup
superl
supt
surg
surl
susm
sut
suv
sv
svga
swics
swift
swot
sxga
sz
t-dab
t.sg
ta
taa
tac
tacan
tacs
taeg
tai
tan
tar
targa
tav
tb
tbt
tci
tcp
tcp/ip
tcsm
tdm
tdma
te
tecn
tecnol
ted
tel
telecom
temp
ten.(lt)
ten.col.(ltc)
ten.gen
teol
term
tesa
tese
tesol
tess
tet
tetra
tfr
tft
tfts
tgv
thx
tim
tipogr
tir
tit
tld
tm
tmc
tn
to
toefl
ton
top
topog
tos
tosap
tosc
tp
tpl
tr
trad
tramat
trasp
ts
tso
tuir
tuld
tv
twa
twain
u.ad
u.s
ucai
ucca
ucei
ucina
uclaf
ucoi
ucoii
ucsi
ud
udc
udi
udp
ue
uefa
uemri
ufo
ugc
uhci
uhf
uht
uibm
uic
uicc
uiga
uil
uilps
uisp
uits
uk
ul
ull
uma
umb
ummc
umss
umts
unac
unar
unasp
uncem
unctad
undp
unefa
unep
unesco
ungh
unhcr
uni
unicef
unitec
unpredep
unsa
upa
upc
urar
urban
url
urp
urss
usa
usb
usfi
usga
usl
usp
uspi
ussr
utap
v.brig
v.cte
v.m
v.p
v.r
v.s
v
va
vab
vaio
val
vas
vb
vbr
vc
vcc
vcr
vda
ve
ven
ves
vesa
veter
vezz
vfb
vfp
vfx
vga
vhf
vhs
vi
via
vip
vis
vn
vo
voc
voip
vol
volg
voll
vor
vpdn
vpn
vr
vs
vsp
vt
vtc
vts
vtt
vv
vvf
wai
wais
wan
wap
wasp
wc
wcdma
wcm
wga
wi-fi
wipo
wisp
wll
wml
wms
worm
wp
wpan
wssn
wto
wwan
wwf
www
wygiwys
xl
xml
xs
xxl
xxs
yaf
yb
yci
yd
yd²
yd³
ymca
zat
zb
zcs
zdf
zdg
zift
zool
zoot
ztc
ztl
µg
`, te = p(ae), se = /^[0-9a-z]/;
class ie extends c {
  getAbbreviations() {
    return te;
  }
  getLastWord(n) {
    let e = n.split(/[\s.]/), a = (e[e.length - 1] || "").split("l'");
    return a[a.length - 1] || "";
  }
  continueInNextWord(n) {
    return se.test(n);
  }
}
const ce = [];
class oe extends c {
  getAbbreviations() {
    return ce;
  }
}
const le = `ಎ
ಬಿ
ಸಿ
ಡಿ
ಈ
ಎಫ್
ಜಿ
ಹೆಚ್
ಐ
ಜೆ
ಕೆ
ಎಲ್
ಎಂ
ಎನ್
ಓ
ಪಿ
ಕ್ಯೂ
ಆರ್
ಎಸ್
ಟಿ
ಯೂ
ವಿ
ಡಬಲ್ಯೂ
ಎಕ್ಸ್
ವೈ
ಜೆಡ್
`, pe = p(le, b);
class de extends c {
  getAbbreviations() {
    return pe;
  }
}
const me = `afp
anp
atp
aбб
bae
bg
bp
cam
cctv
cd
cez
cgi
cnpc
dvd
eiti
epo
er
farc
fbi
gp
gps
has
hiv
hrh
http
icu
idf
imd
ime
ip
iso
kaz
kpa
kpo
kz
mgm
mri
nasa
nba
nbc
nds
ohl
omlt
pda
pkk
ppm
psm
psp
raf
rss
rtl
sas
sme
sms
tnt
udf
uefa
usb
utc
x
zdf
а.
аақ
авг.
аек
ак
акад.
акср
акцион.
ақ
ақш
амт
англ
аөсшк
апр.
апр
аум.
аф
ацат
әқбк
әөк
әч
б. з. б.
б. з. д.
б. т.
б. э. д.
б.б.
ббс
биікт.
биол.
биохим
бмтрк
боак
бө
бсн
бта
бұұ
бхооо
вич
всоонл
г
геогр.
геол.
гленкор
гсбп
гсдп
гулаг
гэс
ғ. с.
ғ.
дек.
дк
днқ
дсұ
еақк
еаэы
еқыұ
ембімұнайгаз
ео
еуразэқ
еуроодақ
еұу
еэы
ж.
жж.
жіө
жко
жкт
жққ
жоо
жсдп
жск
жтсх
жхл
жшс
жэк
зоо
и.
инта
исаф
іім
камаз
кг
кгб
кеу
кимеп
км
км²
км³
кмс
кокп
кота
кср
ксро
кту
кхдр
қ.
қазатомпром
қазкср
қазмұнайгаз
қазпошта
қазтаг
қазұу
қк
қкп
ққс
қмдб
қр
қхр
лат.
м.
м
м²
м³
магатэ
маж
май.
максам
мб
мбф
мвт
мемдум
мемл
мин
мқо
млн
млрд
мм.
мм
мр
мсоп
мт
мтк
мыс.
наса
нато
нквд
нояб.
нұсжп
оар
обб
обл.
огпу
оеб
окт.
оңт.
опек
өгк
өзенмұнайгаз
өұқ
өф
пәк
пед.
пиқ
р.
ржмб
ркфср
рлдп
рнқ
рсфср
ртж
руб
рф
рфкп
с.
с.ш.
сбд
сбл
свс
сву
сду
сент.
сес
см
снпс
солт.
сооно
спбму
сср
ссро
ссс
ссср
сэс
т. б.
т. с. с.
т.
т.с.с
т
тв
тереңд.
тех.
тж
тжқ
тим
тмд
төм.
тр
трлн
тэц
уаз
уефа
ук
ұқк
ұқшұ
февр.
фкққ
фққ
фсб
хвқ
хдо
хдп
хим.
хқко
хтқо
цас
цтп
ш.
ш.б.
шұар
шыұ
экон.
экспо
эқк
эөкк
эыдұ
юнеско
янв.
А
М
Т
`, ge = p(me), ue = /^[^\p{L}\p{N}_]*[0-9a-z\u0430-\u044f]/u;
class be extends c {
  getAbbreviations() {
    return ge;
  }
  getLastWord(n) {
    let e = n.split(/[\s.]/).filter((t) => t.length > 0);
    return e[e.length - 1] || "";
  }
  continueInNextWord(n) {
    return ue.test(n);
  }
}
const he = `ഡോ 
Dr
പ്രൊ    
പ്രൊഫ   
മി 
ശ്രീ    
ശ്രീമതി
ബഹു  
എ
ബി
സി
ഡി
എഫ്
ജി
എച്
എച്ച്
ഐ
ജെ
കെ
എൽ
എം
എൻ
ഒ
ഓ
പി
ക്യു
ക്യൂ
ആർ
എസ്
ടി
യു
യൂ
വി
ഡബ്ല്യു
ഡബ്ള്യു
എക്സ്
വൈ
ഇസഡ്
`, ve = p(he, b);
class fe extends c {
  getAbbreviations() {
    return ve;
  }
}
const ke = new H();
class we extends c {
  getAbbreviations() {
    return ke.getAbbreviations();
  }
}
const ze = `ags
alb
ang
aor
awest
bałt
bojkow
bret
brus
bsł
bułg
c.b.d.o
c.b.d.u
celt
chorw
cs
czakaw
czerw
czes
dłuż
dniem
dor
dubrow
duń
ekaw
fiń
franc
gal
germ
głuż
gniem
goc
gr
grudz
hebr
het
hol
I cont
ie
ikaw
irań
irl
islandz
itd
itd.
itp
jekaw
kajkaw
kasz
kirg
kwiec
łac
lip
listop
lit
łot
lp
maced
mar
młpol
moraw
n.e
nb.
ngr
niem
nord
norw
np
np.
ok.
orm
oset
osk
p.n
p.n.e
p.o
pazdz
pers
pie
pod red.
podhal
pol
połab
port
prekm
pskow
psł
R cont
rez
rom
rozdz.
rum
rus
rys.
sas
sch
scs
serb
sierp
śl
sła
słe
słi
słow
sp. z o.o
śrdniem
śrgniem
śrirl
stbułg
stind
stpol
stpr
str.
strus
stwniem
stycz
sztokaw
szwedz
t.
tj.
tłum.
toch
tur
tzn
ukr
ul
umbr
wed
węg
wlkpol
włos
wrzes
wyd.
zakarp
`, xe = p(ze);
class je extends c {
  getAbbreviations() {
    return xe;
  }
}
const ye = `Adj
Adm
Adv
Art
Ca
Capt
Cmdr
Col
Comdr
Con
Corp
Cpl
DR
DRA
Dr
Dra
Dras
Drs
Eng
Enga
Engas
Engos
Ex
Exo
Exmo
Fig
Gen
Hosp
Insp
Lda
MM
MR
MRS
MS
Maj
Mrs
Ms
Msgr
Op
Ord
Pfc
Ph
Prof
Pvt
Rep
Reps
Res
Rev
Rt
Sen
Sens
Sfc
Sgt
Sr
Sra
Sras
Srs
Sto
Supt
Surg
adj
adm
adv
art
cit
col
con
corp
cpl
dr
dra
dras
drs
eng
enga
engas
engos
ex
exo
exmo
fig
op
prof
sr
sra
sras
srs
sto
v
vs
i.e
rev
e.g
`, Ae = [
  ...p(ye),
  ...j,
  ...j.map((r) => r.toUpperCase())
];
class Ee extends c {
  getAbbreviations() {
    return Ae;
  }
}
const Re = `ਏ
ਬੀ
ਸੀ
ਡੀ
ਈ
ਐਫ
ਜੀ
ਐਚ
ਆਈ
ਜੇ
ਕੇ
ਐਲ
ਐਮ
ਐਨ
ਓ
ਪੀ
ਕਿਊ
ਆਰ
ਐਸ
ਟੀ
ਯੂ
ਵੀ
ਡਬਲਯੂ
ਐਕਸ
ਵਾਈ
ਜੇਡ
`, Se = p(Re, b);
class Ie extends c {
  getAbbreviations() {
    return Se;
  }
}
const Ne = `y.e
y
а
авт
адм.-терр
акад
в
вв
вкз
вост.-европ
г
гг
гос
гр
д
деп
дисс
дол
долл
ежедн
ж
жен
з
зап.-европ
зап
заруб
и
ин
иностр
инст
к
канд
кв
кг
куб
л.h
л.н
л
м
мин
моск
муж
н
нед
о
п
пгт
пер
пп
пр
просп
проф
р
руб
с
сек
см
спб
стр
т
тел
тов
тт
тыс
у.е
у
ул
ф
ч
`, Te = p(Ne), Be = /^[0-9a-z\u0430-\u044f]/;
class Oe extends c {
  getAbbreviations() {
    return Te;
  }
  continueInNextWord(n) {
    return Be.test(n);
  }
}
const qe = `a. d
a. g. p
a. i. i
a. k. a
a. m
a. r. k
a. s. a. p
a. s
a. v
a.d
a.g.p
a.i.i
a.k.a
a.m
a.s.a.p
a.s
a.v
akad
al
apod
arm
atď.
atd
atď
bc
bros
c. k
c.k
č
cca
co
corp
čs
csc
čsl
d. c
d.c
doc
dr
drsc
e. t
e.t
el
etc
ev
gen
hl
hod
i. b
i.b
ii
iii
inc
ind
ing
iv
jr
judr
k. o
k.o
kol
konkr
kt
ll. m
ll.m
ltd
m. n. m
m.n.m
m.o
max
mgr
mil
min
ml
mld
mr
mudr
mvdr
n. a
n. o
n. w. a
n.a
n.o
n.w.a
nám
napr
např
naprk
nár
nešp
no
nr
o. c. p
o. f. i
o. k
o. z
o.c.p
o.f.i
o.i
o.k
o.z
obr
obv
odd
ods
os
p. a
p. n. l
p. s
p.a
p.n.l
p.s
p
paeddr
pedg
ph. d
ph.d
phd
phdr
písm
plgr
pod
pok
pol. pr
pol.pr
por
pozn
pp
pr
prek
príp
prof
r. o
r.o
red
resp
rndr
roz
rozh
rsdr
rtg
s. a
s. e. g
š. p
s. r. o
s.a
s.e.g
š.p
s.r.o
skr
sl
slov
soc
sp
spol
sr
st
št
stor
str
stred
súkr
sv
sz
t. č
t. j
t. z
t.č
t.j
t.z
tel
tis
tj
tr
tu
tvz
tz
tzn
tzv
ú. p. v. o
u. s
ú.p.v.o
u.s
ul
v. sp
v.sp
var
vi
viď
vs
vyd
vz
xx
z. z
z.z
zák
zb
zdravot
zs
zz
`, $e = [
  ...p(qe),
  ...j,
  ...j.map((r) => r.toUpperCase())
], Ce = /^[^\p{L}\p{N}_]*[0-9a-z]/u, Me = [
  "Január",
  "Február",
  "Marec",
  "Apríl",
  "Máj",
  "Jún",
  "Júl",
  "August",
  "September",
  "Október",
  "November",
  "December",
  "Januára",
  "Februára",
  "Marca",
  "Apríla",
  "Mája",
  "Júna",
  "Júla",
  "Augusta",
  "Septembra",
  "Októbra",
  "Novembra",
  "Decembra"
], U = new Set(Me);
class _e extends c {
  getAbbreviations() {
    return $e;
  }
  continueInNextWord(n) {
    if (Ce.test(n))
      return !0;
    let e = (n.trim().split(/\s+/)[0] || "").replace(/[?!.]/g, "");
    if (!e) return !1;
    if (U.has(e)) return !0;
    let t = e.charAt(0).toUpperCase() + e.slice(1);
    return !!U.has(t);
  }
}
const We = p(F);
class Le extends c {
  getAbbreviations() {
    return We;
  }
}
const Ve = `ஏ
பி
சி
டி
ஈ
எஃப்
ஜி
ஹேச்
ஐ
ஜே
கே
எல்
எம்
என்
ஓ
// பி
க்யூ
ஆர்
எஸ்
// டி
யூ
வி
டபிள்யூ
எக்ஸ்
வை
ஜெட்
`;
function Ge() {
  let r = [
    "ா",
    "ி",
    "ீ",
    "ு",
    "ூ",
    "ே",
    "ே",
    "ৈ",
    "ো",
    "ો",
    "ৌ"
  ], n = [
    "அ",
    "ஆ",
    "இ",
    "ஈ",
    "உ",
    "ஊ",
    "எ",
    "ஏ",
    "ஐ",
    "ஒ",
    "ஓ",
    "ஔ"
  ], e = [
    "க",
    "ங",
    "ச",
    "ஞ",
    "ட",
    "ண",
    "த",
    "ந",
    "ப",
    "ம",
    "ய",
    "ர",
    "ல",
    "வ",
    "ழ",
    "ள",
    "ற",
    "ன"
  ], t = [];
  for (let a of e)
    for (let i of r)
      t.push(a + i);
  return [...p(Ve, b), ...n, ...e, ...t];
}
const Ue = Ge();
class P extends c {
  getAbbreviations() {
    return Ue;
  }
}
const Pe = /* @__PURE__ */ new Map([
  ["am", ln],
  ["ar", mn],
  ["bg", jn],
  ["bn", wn],
  ["ca", Sn],
  ["da", Bn],
  ["de", Hn],
  ["en", S],
  ["es", Le],
  ["el", Yn],
  ["gu", ne],
  ["hi", H],
  ["hy", vn],
  ["ja", oe],
  ["ml", fe],
  ["mr", we],
  ["sk", _e],
  ["my", An],
  ["nl", $n],
  ["pt", Ee],
  ["it", ie],
  ["ta", P],
  ["te", P],
  // Telugu maps to Tamil in Rust factory
  ["kn", de],
  ["kk", be],
  ["pa", Ie],
  ["pl", je],
  ["fr", Un],
  ["fi", Ln],
  ["ru", Oe]
]);
function K(r) {
  let n = r, e = /* @__PURE__ */ new Set();
  for (; ; ) {
    e.has(n) ? n = "en" : e.add(n);
    let t = Pe.get(n);
    if (t)
      return new t();
    let a = cn.get(n);
    if (a) {
      let i = !1;
      for (let s of a)
        if (!e.has(s)) {
          n = s, i = !0;
          break;
        }
      i || (n = "en");
    } else
      n = "en";
  }
}
const X = 10 * 1024;
function Xe(r, n) {
  let e = K(r);
  if (n.length > X) {
    let t = D(n, X), a = [];
    for (let i of t) {
      let s = e.segment(i);
      a.push(...s);
    }
    return a;
  }
  return e.segment(n);
}
function De(r, n) {
  let e = 1e3, t = K(r);
  if (n.length > e) {
    let a = D(n, e), i = [], s = 0;
    for (let o of a) {
      let l = t.getSentenceBoundaries(o), d = 0;
      for (let g of l) {
        let u = d > 0 ? d : [...n.slice(0, g.startIndex + s)].length, f = u + [...g.text].length;
        d = f, i.push({
          startIndex: u,
          endIndex: f,
          text: g.text,
          boundarySymbol: g.boundarySymbol,
          isParagraphBreak: g.isParagraphBreak
        });
      }
      s += o.length;
    }
    return i;
  }
  return t.getSentenceBoundaries(n);
}
export {
  cn as LANGUAGE_FALLBACKS,
  Pe as LANGUAGE_REGISTRY,
  c as Language,
  D as chunkText,
  De as getSentenceBoundaries,
  K as languageFactory,
  p as parseAbbreviations,
  Xe as segment
};
