import Handlebars from "handlebars";

// Register Helpers
Handlebars.registerHelper("formatCurrency", (value: any, currency: any) => {
  const num = Number(value);
  if (isNaN(num)) return value;
  const curr = typeof currency === "string" ? currency : "USD";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: curr }).format(num);
});

Handlebars.registerHelper("formatDate", (value: any) => {
  if (!value) return "";
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
});

Handlebars.registerHelper("formatNumber", (value: any) => {
  const num = Number(value);
  if (isNaN(num)) return value;
  return new Intl.NumberFormat("en-US").format(num);
});

Handlebars.registerHelper("eq", (a: any, b: any) => a === b);
Handlebars.registerHelper("gt", (a: any, b: any) => a > b);
Handlebars.registerHelper("lt", (a: any, b: any) => a < b);

export function compileTemplate(tpl: string): (ctx: unknown) => string {
  const template = Handlebars.compile(tpl);
  return (ctx: unknown) => template(ctx);
}