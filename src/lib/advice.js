/* BetterWebWork: plain-language notes on an answer WeBWorK didn't accept. WeBWorK's own message (MathObjects' checker,
   e.g. "Variable 'X' is not defined in this context") always shows first and unchanged; these notes sit under it,
   marked as BetterWebWork's, and only say what is certain from what you typed and what WeBWorK said. They never
   guess at the right answer, which the page doesn't have until WeBWorK shows it.

   BW.advice({ entered, message, result }) → [{ t, why }] (at most three), where t is the note and why the rule's id
   (tests/core.test.js checks each rule). */
(function (g) {
  const BW = (g.BW = g.BW || {});

  const FN = ["arcsin", "arccos", "arctan", "asin", "acos", "atan", "sinh", "cosh", "tanh", "sin", "cos", "tan", "sec", "csc", "cot", "log10", "ln", "log", "sqrt", "exp", "abs"];
  /** The first function written without parentheses: "sin x", "sinx", "sqrt2" → { fn, input }; "sinh(x)" and "log10(x)" are fine. */
  function bareFunction(e) {
    const re = /[a-zA-Z]+(?:10)?/g;
    let m;
    while ((m = re.exec(e))) {
      const w = m[0], lw = w.toLowerCase(), tail = e.slice(m.index + w.length);
      let fn = FN.includes(lw) ? lw : null, rest = "";
      if (!fn) { const f = FN.filter((x) => lw.startsWith(x)).sort((a, b) => b.length - a.length)[0]; if (f) { fn = f; rest = w.slice(f.length); } }
      if (!fn) continue;
      const input = rest ? rest + (tail.match(/^[a-zA-Z0-9.]*/) || [""])[0] : ((tail.match(/^\s*([a-zA-Z0-9.]+)/) || [])[1] || "");
      if (input) return { fn, input };
    }
    return null;
  }
  const q = (s) => `"${s}"`;
  // a number power followed by a letter: e^2x, e^-2x
  const POW_TIMES = /(\b[a-zA-Z0-9]+)\s*\^\s*(-?\d+(?:\.\d+)?)([a-zA-Z])/;

  // [id, test(entered, message) → note or null]; message rules first (they explain WeBWorK's own words)
  const RULES = [
    ["empty", (e) => (e.trim() === "" ? "This blank was empty when you submitted." : null)],
    ["isnt", (e, m) => {
      const x = m.match(/Your answer isn't (an? [^(]+?) \(it looks like (an? [^)]+?)\)/i);
      if (!x) return null;
      const want = x[1].trim(), got = x[2].trim();
      if (/formula/.test(got) && /\bnumber\b/.test(want) && !/formula/.test(want)) return "This blank wants one number, but your answer still has a variable in it. Work it out to a single value.";
      if (/number/.test(got) && /formula/.test(want)) return "This blank wants a formula (an expression with the variable), but your answer is a plain number.";
      if (/list/.test(got) && !/list/.test(want)) return `WeBWorK read your answer as a list because of a comma. This blank wants ${want}; leave out commas, including in numbers like 1,000.`;
      if (/interval/.test(want)) return "This blank wants an interval like (2, 5], [0, inf) or (-inf, 3) U (4, inf).";
      if (/point/.test(want)) return "This blank wants a point, written with parentheses: (3, -1).";
      if (/vector/.test(want)) return "This blank wants a vector, written <1, 2, 3> (or with i, j, k if the problem uses them).";
      if (/equation/.test(want)) return "This blank wants an equation, with an = sign, like y = 2x + 1.";
      return `This blank wants ${want}, and WeBWorK read your answer as ${got}.`;
    }],
    ["undefinedVar", (e, m) => {
      const x = m.match(/Variable '([^']+)' is not defined/i) || m.match(/'([^']+)' is not defined in this context/i);
      if (!x) return null;
      const v = x[1];
      if (/^[A-Z]$/.test(v) && new RegExp(`\\b${v.toLowerCase()}\\b`).test(e.toLowerCase())) return `Letters are case-sensitive: WeBWorK doesn't know ${q(v)} here. Try ${q(v.toLowerCase())} if that's the variable the problem uses.`;
      if (v.length > 1 && /^[a-z]+$/i.test(v)) return `WeBWorK read ${q(v)} as a name it doesn't know. If it's a function, check the spelling and put its input in parentheses, like sin(x). If it's letters multiplied together, put * between them.`;
      return `WeBWorK doesn't know the variable ${q(v)} in this answer. Use only the variables the problem uses.`;
    }],
    ["notAllowed", (e, m) => {
      const x = m.match(/(?:Function|Operator|Constant)? *'([^']+)' is not allowed/i) || m.match(/Can't use '([^']+)' in this context/i);
      return x ? `The problem doesn't let you use ${q(x[1])} in this answer, usually so you work the value out yourself. Simplify it away.` : null;
    }],
    ["unexpected", (e, m) => {
      const x = m.match(/Unexpected character '(.+?)'/i);
      if (!x) return null;
      const c = x[1];
      const alt = { "×": "*", "·": "*", "÷": "/", "−": "-", "–": "-", "—": "-", "√": "sqrt( )", "π": "pi", "∞": "inf", "²": "^2", "³": "^3", "°": "nothing (angles are usually radians)", "\\": "nothing" }[c];
      return alt ? `WeBWorK can't read ${q(c)}. Type ${alt} instead.` : `WeBWorK can't read ${q(c)}. Type the answer with the keys on your keyboard: * for times, ^ for powers, sqrt( ) for roots.`;
    }],
    ["operand", (e, m) => (/Missing operand (before|after) '([^']+)'/i.test(m) ? `Something is missing next to ${q(m.match(/Missing operand (?:before|after) '([^']+)'/i)[1])}: an operator needs a value on both sides, as in 2*x, not 2* or *x.` : null)],
    ["parens", (e, m) => {
      if (!/Missing close|Extra close|Unmatched|mismatched/i.test(m)) return null;
      const opens = (e.match(/[([{]/g) || []).length, closes = (e.match(/[)\]}]/g) || []).length;
      return opens === closes ? "Your brackets are paired up wrong: each ( closes with ), each [ with ]. An interval like [2, 5) is fine; (2, 5] is too." : null;
    }],
    ["inputs", (e, m) => { const x = m.match(/Function '([^']+)' has too (many|few) inputs/i) || m.match(/Function '([^']+)' requires/i); return x ? `${q(x[1])} got the wrong number of inputs. Check the commas and parentheses inside ${x[1]}( ).` : null; }],
    ["divzero", (e, m) => (/divi(sion|de) by zero/i.test(m) ? "Your expression divides by zero at a value WeBWorK tried. Check denominators, and whether a factor cancels to 0." : null)],
    ["points", (e, m) => (/enough valid points|Can't (?:take|generate)|undefined at/i.test(m) ? "WeBWorK checks formulas by plugging in numbers, and yours couldn't be worked out at enough of them (a square root or log of a negative, or division by zero). Check the domain of each piece." : null)],
    ["reduce", (e, m) => (/reduced|simplif|lowest terms/i.test(m) ? "The value may be right but the form isn't accepted: simplify it (reduce fractions, combine terms)." : null)],
    ["decimal", (e, m) => (/decimal/i.test(m) ? "This blank wants an exact answer, not a decimal: write fractions like 2/3, and roots like sqrt(2)." : null)],
    ["units", (e, m) => (/\bunits?\b/i.test(m) ? "Check the units: put a space between the number and its unit (12 m/s), and use the unit the problem asks for." : null)],
    ["count", (e, m) => (/values in your list|number of (?:values|entries)|too (?:many|few) (?:values|answers|entries)/i.test(m) ? "Your list has the wrong number of entries. Separate entries with commas, and don't repeat any." : null)],
    ["endpoints", (e, m) => (/endpoint/i.test(m) ? "Check the interval: the left endpoint must be smaller, ( ) leaves an endpoint out and [ ] includes it, and infinity always gets ( )." : null)],
    ["dimension", (e, m) => (/dimension/i.test(m) ? "Your vector or matrix has the wrong size. Count the entries the problem expects." : null)],
    // what you typed
    ["unbalanced", (e) => {
      const n = (re) => (e.match(re) || []).length;
      // ( and [ count together, because an interval like (2, 5] mixes them
      const a = n(/[([]/g), b = n(/[)\]]/g), square = /[[\]]/.test(e);
      if (a !== b) return square ? `Your answer opens ${a} brackets, ( or [, but closes ${b}. Every opening bracket needs a closing one.` : `Your answer has ${a} ${q("(")} but ${b} ${q(")")}. Every opening parenthesis needs a closing one.`;
      const c = n(/\{/g), d = n(/\}/g);
      return c !== d ? `Your answer has ${c} ${q("{")} but ${d} ${q("}")}. Every opening brace needs a closing one.` : null;
    }],
    ["fracPow", (e) => (/\^\s*-?\d+\s*\/\s*\d/.test(e) ? "A power like x^1/2 is read as (x^1)/2. For a fractional power, wrap it: x^(1/2)." : null)],
    ["expProduct", (e) => { const x = e.match(POW_TIMES); return x ? `WeBWorK reads ${x[1]}^${x[2]}${x[3]} as (${x[1]}^${x[2]})·${x[3]}. If ${x[2]}${x[3]} is the whole power, write ${x[1]}^(${x[2]}${x[3]}).` : null; }],
    // only when expProduct is quiet (e^-xy), so e^-2x gets one note, not two
    ["expNeg", (e) => { const x = !POW_TIMES.test(e) && e.match(/(\b[a-zA-Z0-9]+)\s*\^\s*-\s*([a-zA-Z0-9]*[a-zA-Z][a-zA-Z0-9*]*)/); return x && x[2].length > 1 ? `A negative power with more than one piece needs parentheses: ${x[1]}^(-${x[2]}), not ${x[1]}^-${x[2]}.` : null; }],
    ["ambiguousDiv", (e) => { const x = e.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*([a-zA-Z])/); return x ? `${x[1]}/${x[2]}${x[3]} can be read two ways. Write ${x[1]}/(${x[2]}${x[3]}) or (${x[1]}/${x[2]})${x[3]} so there's only one, then preview it.` : null; }],
    ["funcParens", (e) => { const x = bareFunction(e); return x ? `Put the input of ${x.fn} in parentheses: ${x.fn}(${x.input}). Without them WeBWorK may read only part of it as the input, or read the letters as variables multiplied.` : null; }],
    ["log", (e) => (/\blog\s*\(/.test(e) && !/log10|logb|log_/.test(e) ? "In WeBWorK, log usually means the natural log, the same as ln. For base 10, write log10( )." : null)],
    ["symbols", (e) => {
      const map = [[/[×·]/, "* for times"], [/÷/, "/ for divide"], [/[−–—]/, "the - key for minus"], [/√/, "sqrt( ) for a square root"], [/π/, "pi for π"], [/∞/, "inf for infinity"], [/[²³]/, "^2 or ^3 for powers"]];
      const hit = map.filter(([re]) => re.test(e)).map(([, s]) => s);
      return hit.length ? `Your answer has symbols WeBWorK may not read. Type ${hit.join(", ")}.` : null;
    }],
    ["degrees", (e) => (/°|\bdeg\b|degrees?/.test(e) ? "Angles are in radians unless the problem says degrees. Leave out the degree sign." : null)],
    ["thousands", (e) => (/\d,\d{3}(?!\d)/.test(e) && !/[([]/.test(e) ? "Leave out thousands separators: write 1000, not 1,000. A comma separates list entries." : null)],
    ["label", (e) => (/^\s*[a-zA-Z]\w*\s*(\([a-z]\))?\s*=/.test(e) && !/=.*=/.test(e) ? "Enter just the answer, without the label in front (write 5, not x = 5), unless the problem asks for an equation." : null)],
    ["percent", (e) => (/\d\s*%/.test(e) ? "If the % isn't accepted, enter the decimal instead (25% is 0.25)." : null)],
    ["rounded", (e, m, r) => {
      const x = e.trim().match(/^-?(\d*)\.(\d+)$/);
      if (!x || m || r !== "bad") return null;
      const sig = (x[1].replace(/^0+/, "") + x[2]).replace(/^0+/, "").length;
      return sig <= 3 ? "If your method is right, this may be rounded too far: WeBWorK usually wants about 0.1% accuracy, so give at least 4 significant digits (0.3333, not 0.33), or the exact value (1/3)." : null;
    }],
  ];

  function advice(part) {
    const e = String((part && part.entered) || ""), m = String((part && part.message) || ""), r = part && part.result;
    if (r === "ok" || r === "essay") return [];
    const out = [];
    for (const [why, fn] of RULES) {
      if (out.length >= 3) break;
      let t = null;
      try { t = fn(e, m, r); } catch (err) { t = null; }
      if (t && !out.some((o) => o.t === t)) out.push({ t, why });
      if (why === "empty" && t) break;
    }
    if (r === "part" && out.length < 3) out.push({ t: "Part of this answer is right. Lists, intervals and multi-part blanks give credit for each correct piece, so keep the pieces you're sure of.", why: "partial" });
    return out;
  }

  BW.advice = advice;
  BW.advice.RULES = RULES.map(([id]) => id);
})(globalThis);
