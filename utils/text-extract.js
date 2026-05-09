/**
 * Extract text content from uploaded files (PDF, DOCX, TXT)
 */

export async function extractText(filePath, mimeType, originalName) {
  const ext = originalName?.toLowerCase().split('.').pop();

  // Plain text
  if (ext === 'txt' || mimeType === 'text/plain') {
    const fs = await import('fs');
    return fs.readFileSync(filePath, 'utf-8').slice(0, 50000);
  }

  // PDF
  if (ext === 'pdf' || mimeType === 'application/pdf') {
    try {
      const fs = await import('fs');
      const pdfParse = (await import('pdf-parse')).default;
      const buffer = fs.readFileSync(filePath);
      const data = await pdfParse(buffer);
      return data.text?.slice(0, 50000) || '';
    } catch {
      return '';
    }
  }

  // DOCX
  if (ext === 'docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    try {
      const fs = await import('fs');
      const mammoth = await import('mammoth');
      const buffer = fs.readFileSync(filePath);
      const result = await mammoth.extractRawText({ buffer });
      return result.value?.slice(0, 50000) || '';
    } catch {
      return '';
    }
  }

  return '';
}
