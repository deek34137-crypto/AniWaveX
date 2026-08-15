var enc = new TextEncoder();
var dec = new TextDecoder();

var __name = (fn, _) => fn;

export async function sha256hex(s) {
  const buf = await crypto.subtle.digest("SHA-256", typeof s === "string" ? enc.encode(s) : s);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(sha256hex, "sha256hex");

export function b64toU8(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
__name(b64toU8, "b64toU8");

async function deriveFields(seed) {
  let e = seed;
  for (let i = 0; i < 3; i++) e = await sha256hex(e + i);
  let l = e;
  for (let i = 0; i < 3; i++) l = await sha256hex(l + i);
  return {
    keyField: "kf_" + e.substring(8, 16),
    ivField: "ivf_" + e.substring(16, 24),
    containerName: "cd_" + e.substring(24, 32),
    arrayName: "ad_" + e.substring(32, 40),
    objectName: "od_" + e.substring(40, 48),
    tokenField: e.substring(48, 64) + "_" + e.substring(56, 64),
    keyFrag2Field: l.substring(0, 16) + "_" + l.substring(16, 24)
  };
}
__name(deriveFields, "deriveFields");

function extractSsrObj(html) {
  const m = html.match(/\{type:"data",data:(\{)/);
  if (!m) throw new Error("SSR data block not found");
  let depth = 0;
  const start = html.indexOf("{", m.index + m[0].length - 1);
  for (let i = start; i < html.length; i++) {
    if (html[i] === "{") depth++;
    else if (html[i] === "}") {
      if (--depth === 0) return html.slice(start, i + 1);
    }
  }
  throw new Error("SSR brace matching failed");
}
__name(extractSsrObj, "extractSsrObj");

function parseJsLiteral(src) {
  let i = 0;
  function ws() {
    while (i < src.length && /\s/.test(src[i])) i++;
  }
  __name(ws, "ws");
  function parseValue() {
    ws();
    if (src[i] === "{") return parseObject();
    if (src[i] === "[") return parseArray();
    if (src[i] === '"') return parseDStr();
    if (src[i] === "'") return parseSStr();
    if (src.startsWith("true", i)) { i += 4; return true; }
    if (src.startsWith("false", i)) { i += 5; return false; }
    if (src.startsWith("null", i)) { i += 4; return null; }
    if (src.startsWith("undefined", i)) { i += 9; return null; }
    if (src.startsWith("!0", i)) { i += 2; return true; }
    if (src.startsWith("!1", i)) { i += 2; return false; }
    const m = src.slice(i).match(/^-?[\d.]+([eE][+-]?\d+)?/);
    if (m) { i += m[0].length; return parseFloat(m[0]); }
    throw new Error(`JS parse error at pos ${i}: ...${src.slice(i, i + 20)}`);
  }
  __name(parseValue, "parseValue");
  function parseDStr() {
    let r = "";
    i++;
    while (i < src.length && src[i] !== '"') {
      if (src[i] === "\\") { i++; const e = { n: "\n", t: "\t", r: "\r", '"': '"', "\\": "\\" }; r += e[src[i]] ?? src[i]; i++; }
      else r += src[i++];
    }
    i++;
    return r;
  }
  __name(parseDStr, "parseDStr");
  function parseSStr() {
    let r = "";
    i++;
    while (i < src.length && src[i] !== "'") {
      if (src[i] === "\\") { i++; r += src[i] === "'" ? "'" : { n: "\n", t: "\t", r: "\r", "\\": "\\" }[src[i]] ?? src[i]; i++; }
      else r += src[i++];
    }
    i++;
    return r;
  }
  __name(parseSStr, "parseSStr");
  function parseKey() {
    ws();
    if (src[i] === '"') return parseDStr();
    if (src[i] === "'") return parseSStr();
    const m = src.slice(i).match(/^[a-zA-Z_$][a-zA-Z0-9_$]*/);
    if (m) { i += m[0].length; return m[0]; }
    throw new Error(`Bad key at pos ${i}: ${src.slice(i, i + 20)}`);
  }
  __name(parseKey, "parseKey");
  function parseObject() {
    const obj = {};
    i++;
    ws();
    while (i < src.length && src[i] !== "}") {
      if (src[i] === ",") { i++; ws(); continue; }
      const k = parseKey();
      ws();
      i++;
      obj[k] = parseValue();
      ws();
    }
    i++;
    return obj;
  }
  __name(parseObject, "parseObject");
  function parseArray() {
    const arr = [];
    i++;
    ws();
    while (i < src.length && src[i] !== "]") {
      if (src[i] === ",") { i++; ws(); continue; }
      arr.push(parseValue());
      ws();
    }
    i++;
    return arr;
  }
  __name(parseArray, "parseArray");
  return parseValue();
}
__name(parseJsLiteral, "parseJsLiteral");

function parseWasmDecrypt(wasmBytes) {
  const b = wasmBytes;
  let pos = 8;
  while (pos < b.length) {
    const secId = b[pos++];
    let sz = 0, sh = 0, by;
    do { by = b[pos++]; sz |= (by & 127) << sh; sh += 7; } while (by & 128);
    if (secId === 10) {
      pos++;
      let sbs = 0, sh2 = 0, by2;
      do { by2 = b[pos++]; sbs |= (by2 & 127) << sh2; sh2 += 7; } while (by2 & 128);
      pos += sbs;
      break;
    }
    pos += sz;
  }
  let rbs = 0, sh3 = 0, by3;
  do { by3 = b[pos++]; rbs |= (by3 & 127) << sh3; sh3 += 7; } while (by3 & 128);
  const r = b.slice(pos, pos + rbs);
  function leb(arr, i2) {
    let v = 0, s = 0, b2;
    do { b2 = arr[i2++]; v |= (b2 & 127) << s; s += 7; } while (b2 & 128);
    return [v, i2];
  }
  __name(leb, "leb");
  const XOR_END = [32, 2, 32, 5, 106, 45, 0, 0, 115, 33, 6];
  let txStart = -1;
  outer: for (let i2 = 0; i2 < r.length - XOR_END.length; i2++) {
    for (let j = 0; j < XOR_END.length; j++) if (r[i2 + j] !== XOR_END[j]) continue outer;
    txStart = i2 + XOR_END.length;
    break;
  }
  if (txStart < 0) throw new Error("WASM: transform start not found");
  let txEnd = -1, step = 36;
  for (let i2 = txStart; i2 < r.length - 4; i2++) {
    if (r[i2] === 32 && r[i2 + 1] === 5 && r[i2 + 2] === 65) {
      const [val, ni] = leb(r, i2 + 3);
      if (r[ni] === 108) { txEnd = i2; step = val; break; }
    }
  }
  if (txEnd < 0) throw new Error("WASM: keystream not found");
  const code = r.slice(txStart, txEnd);
  function transform(inputByte) {
    let local6 = inputByte & 255;
    const stk = [];
    let i2 = 0;
    while (i2 < code.length) {
      const op = code[i2++];
      if (op === 32) { const [idx, ni] = leb(code, i2); i2 = ni; stk.push(idx === 6 ? local6 : 0); }
      else if (op === 33) { const [idx, ni] = leb(code, i2); i2 = ni; const v = stk.pop(); if (idx === 6) local6 = v & 255; }
      else if (op === 65) { const [v, ni] = leb(code, i2); i2 = ni; stk.push(v); }
      else if (op === 106) { const b2 = stk.pop(), a = stk.pop(); stk.push(a + b2 & 255); }
      else if (op === 107) { const b2 = stk.pop(), a = stk.pop(); stk.push(a - b2 + 256 & 255); }
      else if (op === 113) { const b2 = stk.pop(), a = stk.pop(); stk.push(a & b2 & 255); }
      else if (op === 114) { const b2 = stk.pop(), a = stk.pop(); stk.push((a | b2) & 255); }
      else if (op === 115) { const b2 = stk.pop(), a = stk.pop(); stk.push((a ^ b2) & 255); }
      else if (op === 116) { const b2 = stk.pop(), a = stk.pop(); stk.push(a << (b2 & 7) & 255); }
      else if (op === 118) { const b2 = stk.pop(), a = stk.pop(); stk.push(a >>> (b2 & 7) & 255); }
    }
    return local6;
  }
  __name(transform, "transform");
  return { step, transform };
}
__name(parseWasmDecrypt, "parseWasmDecrypt");

function runDecrypt(wasmBytes, frag1, kf2, T, seedInt) {
  const { step, transform } = parseWasmDecrypt(wasmBytes);
  const out = new Uint8Array(frag1.length);
  for (let i = 0; i < frag1.length; i++) {
    const c = (frag1[i] ^ kf2[i] ^ T[i]) & 255;
    out[i] = transform(c) ^ i * step + seedInt & 255;
  }
  return out;
}
__name(runDecrypt, "runDecrypt");

export async function decryptEmbed(html) {
  const raw = extractSsrObj(html);
  const data = parseJsLiteral(raw);
  const seed = data.obfuscation_seed;
  if (!seed) { const e = new Error("obfuscation_seed missing"); e.debug = { topKeys: Object.keys(data).slice(0, 20) }; throw e; }
  const fields = await deriveFields(seed);
  const ocd = data.obfuscated_crypto_data;
  if (!ocd) { const e = new Error("obfuscated_crypto_data missing"); e.debug = { fields, topKeys: Object.keys(data).slice(0, 20) }; throw e; }
  const container = ocd[fields.containerName];
  if (!container) { const e = new Error(`containerName "${fields.containerName}" not in ocd`); e.debug = { fields, ocdKeys: Object.keys(ocd).slice(0, 10) }; throw e; }
  const arr = container[fields.arrayName];
  if (!arr) { const e = new Error(`arrayName "${fields.arrayName}" not in container`); e.debug = { fields, containerKeys: Object.keys(container).slice(0, 10) }; throw e; }
  const obj = arr[0][fields.objectName];
  if (!obj) { const e = new Error(`objectName "${fields.objectName}" not in arr[0]`); e.debug = { fields, arr0Keys: Object.keys(arr[0]).slice(0, 10) }; throw e; }
  const frag1 = b64toU8(obj[fields.keyField]);
  const iv = b64toU8(obj[fields.ivField]);
  const kf2raw = data[fields.keyFrag2Field];
  if (!kf2raw) { const e = new Error(`kf2 field "${fields.keyFrag2Field}" not in data`); e.debug = { fields, topKeys: Object.keys(data).slice(0, 20) }; throw e; }
  const kf2 = b64toU8(kf2raw);
  const token = data[fields.tokenField];
  if (!token) { const e = new Error(`tokenField "${fields.tokenField}" missing`); e.debug = { fields, topKeys: Object.keys(data).slice(0, 20) }; throw e; }
  const tokData = await fetch(`https://flixcloud.cc/api/m3u8/${token}`, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36", Accept: "application/json, */*", Referer: `https://reanime.to/` } }).then((r) => { if (!r.ok) throw new Error(`Token API ${r.status}`); return r.json(); });
  const vidKey = (await sha256hex(token + "vid")).substring(0, 10);
  const keyKey = (await sha256hex(token + "key")).substring(0, 10);
  const v_bytes = b64toU8(tokData[vidKey]);
  const T_bytes = b64toU8(tokData[keyKey]);
  if (!v_bytes.length || !T_bytes.length) { const e = new Error(`Token fields missing. vidKey="${vidKey}" keyKey="${keyKey}"`); e.debug = { tokKeys: Object.keys(tokData).slice(0, 10) }; throw e; }
  const seedInt = parseInt(seed.substring(0, 8), 16);
  const wPayload = b64toU8(data.w_payload ?? "");
  if (!wPayload.length) throw new Error("w_payload missing from embed data");
  let wasmOut;
  try { wasmOut = runDecrypt(wPayload, frag1, kf2, T_bytes, seedInt); } catch (pe) { pe.wasmHex = Array.from(wPayload).map((b) => b.toString(16).padStart(2, "0")).join(""); throw pe; }
  const keyMat = await crypto.subtle.importKey("raw", wasmOut, { name: "PBKDF2" }, false, ["deriveBits"]);
  const derived = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", salt: enc.encode(seed), iterations: 1e3, hash: "SHA-256" }, keyMat, 256));
  for (let i = 0; i < 32; i++) derived[i] ^= seed.charCodeAt(i % seed.length);
  const aesKeyBytes = new Uint8Array(await crypto.subtle.digest("SHA-256", derived));
  const aesKey = await crypto.subtle.importKey("raw", aesKeyBytes, { name: "AES-CBC" }, false, ["decrypt"]);
  let plain;
  try { plain = await crypto.subtle.decrypt({ name: "AES-CBC", iv }, aesKey, v_bytes); } catch (err) {
    err.debug = { seedInt: "0x" + seedInt.toString(16), frag1Len: frag1.length, kf2Len: kf2.length, T_bytesLen: T_bytes.length, ivLen: iv.length, v_bytesLen: v_bytes.length, wPayloadLen: wPayload.length, wasmOutHex: Array.from(wasmOut).map((b) => b.toString(16).padStart(2, "0")).join("") };
    throw err;
  }
  const url = dec.decode(plain).trim().replace(/\0+$/, "");
  if (!url.startsWith("http")) throw new Error(`Unexpected decrypted value: ${url.substring(0, 60)}`);
  return {
    url,
    subtitles: data.subtitles ?? [],
    thumbnails_vtt: data.thumbnails_vtt ?? null,
    video_title: data.video_title ?? null,
    intro_chapter: data.intro_chapter ?? null,
    outro_chapter: data.outro_chapter ?? null,
    video_id: data.video_id ?? null
  };
}
__name(decryptEmbed, "decryptEmbed");
