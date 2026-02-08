import Handlebars from "handlebars";

// Register Helpers
Handlebars.registerHelper("formatCurrency", (value: any, currency: any) => {
  const num = Number(value);
  if (isNaN(num)) return value;
  const curr = typeof currency === "string" ? currency : "USD";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: curr }).format(num);
});

Handlebars.registerHelper("formatDate", (value: any, pattern: any) => {
  if (!value) return "";
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;

  if (typeof pattern === "string" && pattern === "YYYY.MM.DD") {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}.${m}.${d}`;
  }

  return new Intl.DateTimeFormat("hu-HU", { dateStyle: "medium" }).format(date);
});

Handlebars.registerHelper("formatNumber", (value: any, decimals: any, locale: any) => {
  const num = Number(value);
  if (isNaN(num)) return value;
  const opts: Intl.NumberFormatOptions = { style: "decimal" };
  if (typeof decimals === "number") {
    opts.minimumFractionDigits = decimals;
    opts.maximumFractionDigits = decimals;
  }
  const loc = typeof locale === "string" ? locale : "hu-HU";
  return new Intl.NumberFormat(loc, opts).format(num);
});

Handlebars.registerHelper("multiply", (a: any, b: any) => Number(a) * Number(b));

// Comparison helpers (for subexpressions like {{#if (eq a b)}})
Handlebars.registerHelper("eq", (a: any, b: any) => a === b || String(a) === String(b));
Handlebars.registerHelper("ne", (a: any, b: any) => a !== b && String(a) !== String(b));
Handlebars.registerHelper("gt", (a: any, b: any) => Number(a) > Number(b));
Handlebars.registerHelper("lt", (a: any, b: any) => Number(a) < Number(b));
Handlebars.registerHelper("gte", (a: any, b: any) => Number(a) >= Number(b));
Handlebars.registerHelper("lte", (a: any, b: any) => Number(a) <= Number(b));

// Logical helpers
Handlebars.registerHelper("and", (...args: any[]) => {
  args.pop(); // remove options object
  return args.every(Boolean);
});
Handlebars.registerHelper("or", (...args: any[]) => {
  args.pop(); // remove options object
  return args.some(Boolean);
});
Handlebars.registerHelper("not", (a: any) => !a);

// String helpers
Handlebars.registerHelper("lowercase", (str: any) => String(str || "").toLowerCase());
Handlebars.registerHelper("uppercase", (str: any) => String(str || "").toUpperCase());

// JSON helper for embedding data in scripts
Handlebars.registerHelper("json", (context: any) => {
  return new Handlebars.SafeString(JSON.stringify(context || []));
});

// Block helper: {{#ifEq a b}}...{{else}}...{{/ifEq}}
Handlebars.registerHelper("ifEq", function(this: any, a: any, b: any, options: any) {
  if (a === b || String(a) === String(b)) {
    return options.fn(this);
  }
  return options.inverse(this);
});

// Block helper: {{#ifGt a b}}...{{else}}...{{/ifGt}}
Handlebars.registerHelper("ifGt", function(this: any, a: any, b: any, options: any) {
  if (Number(a) > Number(b)) {
    return options.fn(this);
  }
  return options.inverse(this);
});

export function compileTemplate(tpl: string): (ctx: unknown) => string {
  const template = Handlebars.compile(tpl);
  return (ctx: unknown) => template(ctx);
}