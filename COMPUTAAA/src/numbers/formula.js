// Measure formulas like  food_purchases / net_sales * 100  — parsed, never eval'd.
// Grammar: expr := term (('+'|'-') term)* ; term := factor (('*'|'/') factor)* ;
//          factor := number | series | '(' expr ')' | '-' factor
// Series names: letters, digits, _ . : (e.g. purchases:produce)

export function compile(text) {
  const src = String(text || "");
  if (src.length > 500) throw new Error("Formula is too long.");
  const tokens = [];
  const re = /\s*(?:(\d+(?:\.\d+)?)|([a-zA-Z_][\w.:]*)|(.))/gy;
  let m;
  while (re.lastIndex < src.length && (m = re.exec(src))) {
    if (m[1]) tokens.push({ t: "num", v: Number(m[1]) });
    else if (m[2]) tokens.push({ t: "id", v: m[2].toLowerCase() });
    else if (m[3] && "+-*/()".includes(m[3])) tokens.push({ t: m[3] });
    else if (m[3] && m[3].trim()) throw new Error(`Unexpected "${m[3]}" in formula.`);
  }
  let i = 0;
  const peek = () => tokens[i]?.t;
  const series = new Set();
  function expr() {
    let node = term();
    while (peek() === "+" || peek() === "-") node = { op: tokens[i++].t, a: node, b: term() };
    return node;
  }
  function term() {
    let node = factor();
    while (peek() === "*" || peek() === "/") node = { op: tokens[i++].t, a: node, b: factor() };
    return node;
  }
  function factor() {
    const tk = tokens[i++];
    if (!tk) throw new Error("Formula ends too early.");
    if (tk.t === "num") return { num: tk.v };
    if (tk.t === "id") { series.add(tk.v); return { id: tk.v }; }
    if (tk.t === "-") return { op: "neg", a: factor() };
    if (tk.t === "(") {
      const n = expr();
      if (tokens[i++]?.t !== ")") throw new Error("Missing ) in formula.");
      return n;
    }
    throw new Error(`Unexpected "${tk.t}" in formula.`);
  }
  if (!tokens.length) throw new Error("Formula is empty.");
  const ast = expr();
  if (i !== tokens.length) throw new Error("Formula has extra pieces at the end.");
  return { ast, series: [...series] };
}

/** Evaluate with series values for one day. Missing series count as 0; division by zero gives null. */
export function evaluate(ast, values) {
  const ev = (n) => {
    if ("num" in n) return n.num;
    if ("id" in n) return values[n.id] ?? 0;
    const a = ev(n.a);
    if (a === null) return null;
    if (n.op === "neg") return -a;
    const b = ev(n.b);
    if (b === null) return null;
    if (n.op === "+") return a + b;
    if (n.op === "-") return a - b;
    if (n.op === "*") return a * b;
    if (n.op === "/") return b === 0 ? null : a / b;
    return null;
  };
  const r = ev(ast);
  return r === null || !Number.isFinite(r) ? null : r;
}
