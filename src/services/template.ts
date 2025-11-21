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

Handlebars.registerHelper("eq", (a: any, b: any) => a === b);
Handlebars.registerHelper("gt", (a: any, b: any) => a > b);
Handlebars.registerHelper("lt", (a: any, b: any) => a < b);

export function compileTemplate(tpl: string): (ctx: unknown) => string {
  const template = Handlebars.compile(tpl);
  return (ctx: unknown) => template(ctx);
}