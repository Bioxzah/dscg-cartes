// Extracts the text of a PDF with PDFKit (built into macOS). Usage: pdftext <file.pdf>
// Prints "--- page N ---" separators so the text keeps its page structure.
import Foundation
import PDFKit

guard CommandLine.arguments.count > 1, let doc = PDFDocument(url: URL(fileURLWithPath: CommandLine.arguments[1])) else {
  FileHandle.standardError.write("cannot open PDF\n".data(using: .utf8)!)
  exit(1)
}
for i in 0..<doc.pageCount {
  print("--- page \(i + 1) ---")
  print(doc.page(at: i)?.string ?? "")
}
