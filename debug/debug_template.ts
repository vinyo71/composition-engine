import { compileTemplate } from "../src/services/template.ts";

const template = `
Hello {{Customer.Name}}!
Bill: {{Bill.Number}}
`;

const data = {
    Customer: { Name: "Test User" },
    Bill: { Number: "12345" }
};

const dataNested = {
    Bill: {
        Customer: { Name: "Test User" },
        Bill: { Number: "12345" }
    }
};

console.log("--- Flat Data ---");
console.log(compileTemplate(template)(data));

console.log("--- Nested Data ---");
console.log(compileTemplate(template)(dataNested));
