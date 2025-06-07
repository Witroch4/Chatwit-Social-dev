// chatwit-atual/app/api/admin/leads-chatwit/unify/utils.ts
import { PDFDocument, PageSizes } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { uploadToMinIO } from '../../../../../lib/minio';

// --- Type Definitions ---
export type Environment = "development" | "production" | "test";

// --- Helper Functions ---

/**
 * Downloads a file from a URL and returns it as a Buffer.
 * @param url The URL of the file to download.
 * @returns A Promise that resolves to a Buffer.
 */
async function downloadUrlAsBuffer(url: string): Promise<Buffer> {
    try {
        console.log(`[PDF-Lib] Attempting to download file: ${url}`);
        let correctedUrl = url;
        if (url.includes('objstore.witdev.com.br')) {
            console.warn(`[PDF-Lib] Incorrect endpoint URL detected, correcting: ${url}`);
            correctedUrl = url.replace('objstore.witdev.com.br', process.env.S3Endpoint || 'objstoreapi.witdev.com.br');
        }

        const response = await fetch(correctedUrl, {
            headers: { 'Accept': '*/*', 'User-Agent': 'Chatwit-Social/1.0' }
        });

        if (!response.ok) {
            throw new Error(`Failed to download file (status ${response.status}): ${url}`);
        }
        
        const arrayBuf = await response.arrayBuffer();
        return Buffer.from(arrayBuf);
    } catch (error) {
        console.error(`[PDF-Lib] Error downloading file ${url}:`, error);
        throw error;
    }
}

/**
 * Checks if a URL points to an image file.
 */
function isImage(url: string): boolean {
    if (!url) return false;
    const imageExtensions = ['jpg', 'jpeg', 'png']; // Apenas extensões suportadas pelo pdf-lib
    try {
        const extension = new URL(url).pathname.split('.').pop()?.toLowerCase() || '';
        return imageExtensions.includes(extension);
    } catch {
        return imageExtensions.some(ext => url.toLowerCase().endsWith(`.${ext}`));
    }
}

/**
 * Checks if a URL points to a PDF file.
 */
function isPdf(url: string): boolean {
    if (!url) return false;
    try {
        return new URL(url).pathname.toLowerCase().endsWith('.pdf');
    } catch {
        return url.toLowerCase().endsWith('.pdf');
    }
}


// --- Core Unification Logic ---

/**
 * Unifies multiple files (PDFs and images) into a single PDF using pdf-lib.
 * @param fileUrls An array of URLs for the files to merge.
 * @returns A Promise that resolves to the merged PDF as a Buffer.
 */
export async function unifyFilesToPdf(fileUrls: string[]): Promise<Buffer> {
    console.log(`[PDF-Lib] Starting unification for ${fileUrls.length} files.`);
    const pdfDoc = await PDFDocument.create();

    for (const url of fileUrls) {
        try {
            if (isImage(url)) {
                console.log(`[PDF-Lib] Processing and embedding image file: ${url}`);
                const imageBuffer = await downloadUrlAsBuffer(url);
                const extension = url.split('.').pop()?.toLowerCase() || '';

                let embeddedImage;
                if (extension === 'jpg' || extension === 'jpeg') {
                    embeddedImage = await pdfDoc.embedJpg(imageBuffer);
                } else if (extension === 'png') {
                    embeddedImage = await pdfDoc.embedPng(imageBuffer);
                } else {
                    console.warn(`[PDF-Lib] Skipping unsupported image type: ${extension}`);
                    continue;
                }

                const page = pdfDoc.addPage(PageSizes.A4);
                const { width: pageWidth, height: pageHeight } = page.getSize();
                const { width: imgWidth, height: imgHeight } = embeddedImage.scale(1);

                const widthRatio = pageWidth / imgWidth;
                const heightRatio = pageHeight / imgHeight;
                const ratio = Math.min(widthRatio, heightRatio);

                const scaledWidth = imgWidth * ratio;
                const scaledHeight = imgHeight * ratio;
                
                page.drawImage(embeddedImage, {
                    x: (pageWidth - scaledWidth) / 2,
                    y: (pageHeight - scaledHeight) / 2,
                    width: scaledWidth,
                    height: scaledHeight,
                });

                console.log(`[PDF-Lib] Successfully embedded image from: ${url}`);

            } else if (isPdf(url)) {
                console.log(`[PDF-Lib] Merging PDF file: ${url}`);
                const pdfBuffer = await downloadUrlAsBuffer(url);
                const donorPdfDoc = await PDFDocument.load(pdfBuffer);
                const copiedPages = await pdfDoc.copyPages(donorPdfDoc, donorPdfDoc.getPageIndices());
                copiedPages.forEach((page) => pdfDoc.addPage(page));
                console.log(`[PDF-Lib] Successfully merged PDF from: ${url}`);
            } else {
                console.warn(`[PDF-Lib] Skipping unsupported file type: ${url}`);
            }

        } catch (error) {
            console.error(`[PDF-Lib] Failed to process file ${url}:`, error);
        }
    }

    if (pdfDoc.getPageCount() === 0) {
        throw new Error("Could not process any of the provided files into a PDF.");
    }
    
    const mergedPdfBytes = await pdfDoc.save();
    console.log(`[PDF-Lib] Unification complete. Final PDF size: ${mergedPdfBytes.length} bytes.`);
    return Buffer.from(mergedPdfBytes);
}

/**
 * Saves the unified PDF buffer to MinIO storage.
 * @param pdfBuffer The buffer of the final PDF.
 * @param fileName The desired file name for the uploaded PDF.
 * @returns A Promise resolving to the public URL of the uploaded PDF.
 */
export async function savePdfToMinIO(
    pdfBuffer: Buffer,
    fileName: string,
    bucket: string,
    environment: string
): Promise<string> {
    console.log(`[PDF-Lib] Uploading final PDF to MinIO as ${fileName}`);
    if (!pdfBuffer || pdfBuffer.length === 0) {
        throw new Error('PDF buffer is empty and cannot be uploaded.');
    }

    const response = await uploadToMinIO(pdfBuffer, fileName, 'application/pdf');
    console.log(`[PDF-Lib] PDF successfully uploaded: ${response.url}`);
    return response.url;
}