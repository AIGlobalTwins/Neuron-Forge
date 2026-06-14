/**
 * Structural repair for generated HTML.
 *
 * The model occasionally drops a </div> or a </section>, which makes later
 * sections nest inside an earlier one (e.g. the team cards ending up inside an
 * absolutely-positioned container → squished columns + vertical text + overlap).
 *
 * balanceBlocks() walks div/section/footer tags with a stack and:
 *  - flattens sections/footers to body-level siblings (closing any open divs and
 *    a still-open previous section before a new section/footer opens),
 *  - balances <div> (drops stray </div>, appends missing </div>),
 *  - closes anything still open at the end.
 *
 * Our generated templates always use sections as flat siblings, so this is safe
 * and deterministically fixes malformed output.
 */
export function balanceBlocks(html: string): string {
  const tokenRe = /<\/?(?:div|section|footer)\b[^>]*?>/gi;
  let result = "";
  let last = 0;
  const stack: ("div" | "section" | "footer")[] = [];
  let m: RegExpExecArray | null;

  const closeOpenDivs = () => {
    while (stack.length && stack[stack.length - 1] === "div") {
      result += "</div>";
      stack.pop();
    }
  };
  const closeOpenSections = () => {
    while (stack.length && (stack[stack.length - 1] === "section" || stack[stack.length - 1] === "footer")) {
      result += `</${stack.pop()}>`;
    }
  };

  while ((m = tokenRe.exec(html))) {
    result += html.slice(last, m.index);
    last = tokenRe.lastIndex;
    const tok = m[0];
    const isClose = tok[1] === "/";
    const name = (isClose ? tok.slice(2) : tok.slice(1)).match(/^[a-z]+/i)![0].toLowerCase() as
      | "div" | "section" | "footer";
    const selfClosing = /\/>$/.test(tok);

    if (!isClose) {
      if (name === "section" || name === "footer") {
        // Flatten: a new section/footer is always a body-level sibling.
        closeOpenDivs();
        closeOpenSections();
      }
      result += tok;
      if (!selfClosing) stack.push(name);
    } else {
      if (name === "div") {
        if (stack[stack.length - 1] === "div") {
          result += tok;
          stack.pop();
        }
        // else: stray </div> with no matching open — drop it.
      } else {
        // section/footer close: shut any open divs first.
        closeOpenDivs();
        if (stack[stack.length - 1] === name) {
          result += tok;
          stack.pop();
        } else if (stack.includes(name)) {
          while (stack.length) {
            const t = stack.pop()!;
            result += `</${t}>`;
            if (t === name) break;
          }
        }
        // else: stray close — drop it.
      }
    }
  }
  result += html.slice(last);
  while (stack.length) result += `</${stack.pop()}>`;
  return result;
}
