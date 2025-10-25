function deepGet(ctx: any, path: string): any {
  if (path === "." || path === "this") return ctx;
  const tokens = path
    .trim()
    .replaceAll("[", ".")
    .replaceAll("]", "")
    .split(".")
    .filter(Boolean);
  let cur = ctx;
  for (const t of tokens) {
    if (cur == null) return "";
    cur = cur[t];
  }
  return cur ?? "";
}

// Very small Mustache-like templater supporting:
// - {{path.to.value}}
// - {{.}} for current value
// - {{#each path}} ... {{/each}}
export function compileTemplate(tpl: string): (ctx: unknown) => string {
  function renderTemplate(raw: string, ctx: any): string {
    // Handle loops
    const loopRe = /{{#each\s+([^}]+)}}([\s\S]*?){{\/each}}/g;
    raw = raw.replace(loopRe, (_, path: string, inner: string) => {
      const list = deepGet(ctx, path);
      if (!Array.isArray(list)) return "";
      return list.map((item) => renderTemplate(inner, item)).join("");
    });

    // Handle simple variables
    const varRe = /{{\s*([^}]+?)\s*}}/g;
    raw = raw.replace(varRe, (_, expr: string) => {
      const val = deepGet(ctx, expr);
      return (val == null) ? "" : String(val);
    });

    return raw;
  }

  return (ctx: unknown) => renderTemplate(tpl, ctx as any);
}