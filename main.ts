import { XMLParser } from "fast-xml-parser";
import { PDFDocument, StandardFonts } from "pdf-lib";

// Simple XML parsing logic (replace with more robust solution if needed)
function parseXml(xmlContent: string): any {
  const parser = new XMLParser();
  const doc = parser.parse(xmlContent);
  if (!doc) throw new Error("Failed to parse XML.");
  return doc;
}

// Example function to generate a PDF with pdf-lib
async function createPdfFromHtml(_: string, outputPath: string) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  page.drawText("PDF created with pdf-lib!", {
    x: 50,
    y: height - 50,
    size: 24,
    font,
  });
  const pdfBytes = await pdfDoc.save();
  await Deno.writeFile(outputPath, pdfBytes);
}

if (import.meta.main) {
  const xmlData = await Deno.readTextFile("./bank_statements_1000.xml");
  const xmlDoc = parseXml(xmlData);

  // Placeholder HTML or template usage
  const htmlTemplate = "<html><body><h1>Sample PDF</h1></body></html>";

  await createPdfFromHtml(htmlTemplate, "output.pdf");
  console.log("PDF created successfully");
}
