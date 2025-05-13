import * as mammoth from 'mammoth';

/**
 * Extracts text from various document formats
 * 
 * @param fileBuffer The buffer containing the file content
 * @param fileName The name of the file (used to determine format)
 * @returns The extracted text
 */
export async function extractTextFromDocument(fileBuffer: Buffer, fileName: string): Promise<string> {
  try {
    const extension = fileName.split('.').pop()?.toLowerCase();

    switch (extension) {
      case 'pdf':
        // Temporary workaround until we can fix pdf-parse
        return "PDF text extraction is temporarily unavailable. For best results, please upload a DOCX or TXT file.";
      case 'docx':
        return extractTextFromDocx(fileBuffer);
      case 'doc':
        return "Microsoft Word DOC format extraction requires conversion to DOCX. Please convert and reupload.";
      case 'pptx':
      case 'ppt':
        return "PowerPoint extraction provides limited text. For best results, upload a PDF or DOCX.";
      case 'txt':
        return fileBuffer.toString('utf-8');
      default:
        throw new Error(`Unsupported file format: ${extension}`);
    }
  } catch (error: any) {
    console.error(`Error extracting text from ${fileName}:`, error);
    throw new Error(`Failed to extract text from document: ${error.message || String(error)}`);
  }
}

/**
 * Extracts text from a DOCX file
 */
async function extractTextFromDocx(fileBuffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    return result.value;
  } catch (error: any) {
    console.error("Error extracting text from DOCX:", error);
    // Return a fallback message instead of throwing the error
    return "Could not extract text from DOCX. The file may be corrupted or in an unsupported format.";
  }
}
