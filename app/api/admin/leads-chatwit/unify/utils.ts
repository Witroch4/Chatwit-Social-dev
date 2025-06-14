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
 * @param files An array of objects containing the URL and name of the files to merge.
 * @returns A Promise that resolves to the merged PDF as a Buffer.
 */
export async function unifyFilesToPdf(files: { url: string; name: string }[]): Promise<Buffer> {
    try {
        console.log("[PDF-Lib] Starting unification for", files.length, "files.");
        
        // Validar e filtrar arquivos
        const validFiles = files.filter(file => {
            if (!file || !file.url) {
                console.log(`[PDF-Lib] Arquivo inválido:`, file);
                return false;
            }

            // URLs do Facebook/Instagram são sempre válidas para processamento
            if (file.url.includes('fbsbx.com') || file.url.includes('instagram.com')) {
                console.log(`[PDF-Lib] URL do Facebook/Instagram detectada: ${file.url}`);
                return true;
            }

            const url = file.url.toLowerCase();
            const isPdf = url.endsWith('.pdf') || 
                         url.includes('application/pdf') ||
                         url.includes('pdf');
            
            const isImage = url.endsWith('.jpg') || 
                           url.endsWith('.jpeg') || 
                           url.endsWith('.png') ||
                           url.includes('image/');
            
            if (!isPdf && !isImage) {
                console.log(`[PDF-Lib] Tipo de arquivo não suportado: ${file.url}`);
                return false;
            }

            return true;
        });

        if (validFiles.length === 0) {
            throw new Error("Nenhum arquivo válido encontrado para unificação.");
        }

        const mergedPdf = await PDFDocument.create();
        
        for (const file of validFiles) {
            try {
                console.log(`[PDF-Lib] Processando arquivo: ${file.name}`);
                
                // Tratar URLs do Facebook/Instagram
                let fileUrl = file.url;
                if (fileUrl.includes('fbsbx.com')) {
                    console.log(`[PDF-Lib] Processando URL do Facebook: ${fileUrl}`);
                    // Tentar extrair o ID do asset
                    const assetIdMatch = fileUrl.match(/asset_id=(\d+)/);
                    if (assetIdMatch) {
                        const assetId = assetIdMatch[1];
                        fileUrl = `https://www.facebook.com/messenger_media/?thread_id=${assetId}`;
                        console.log(`[PDF-Lib] URL convertida: ${fileUrl}`);
                    }
                }

                console.log(`[PDF-Lib] Buscando arquivo em: ${fileUrl}`);
                const response = await fetch(fileUrl);
                if (!response.ok) {
                    console.error(`[PDF-Lib] Falha ao buscar arquivo: ${response.statusText}`);
                    continue;
                }

                const fileBuffer = await response.arrayBuffer();
                const contentType = response.headers.get('content-type') || '';
                console.log(`[PDF-Lib] Content-Type do arquivo: ${contentType}`);
                
                // Verificar se é imagem ou PDF
                if (contentType.includes('image/') || 
                    file.url.toLowerCase().match(/\.(jpg|jpeg|png)$/) || 
                    file.url.includes('fbsbx.com')) {
                    console.log(`[PDF-Lib] Processando como imagem: ${file.name}`);
                    
                    let embeddedImage;
                    try {
                        if (contentType.includes('jpeg') || file.url.toLowerCase().endsWith('.jpg') || file.url.toLowerCase().endsWith('.jpeg')) {
                            embeddedImage = await mergedPdf.embedJpg(fileBuffer);
                        } else {
                            embeddedImage = await mergedPdf.embedPng(fileBuffer);
                        }

                        const page = mergedPdf.addPage([595.28, 841.89]); // A4
                        const { width, height } = page.getSize();
                        const { width: imgWidth, height: imgHeight } = embeddedImage.scale(1);

                        const widthRatio = width / imgWidth;
                        const heightRatio = height / imgHeight;
                        const ratio = Math.min(widthRatio, heightRatio);

                        const scaledWidth = imgWidth * ratio;
                        const scaledHeight = imgHeight * ratio;

                        page.drawImage(embeddedImage, {
                            x: (width - scaledWidth) / 2,
                            y: (height - scaledHeight) / 2,
                            width: scaledWidth,
                            height: scaledHeight,
                        });
                    } catch (error) {
                        console.error(`[PDF-Lib] Erro ao processar imagem: ${error}`);
                        continue;
                    }
                } else {
                    console.log(`[PDF-Lib] Processando como PDF: ${file.name}`);
                    try {
                        const pdf = await PDFDocument.load(fileBuffer);
                        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                        copiedPages.forEach(page => mergedPdf.addPage(page));
                    } catch (error) {
                        console.error(`[PDF-Lib] Erro ao processar PDF: ${error}`);
                        continue;
                    }
                }
                
                console.log(`[PDF-Lib] Arquivo processado com sucesso: ${file.name}`);
            } catch (error) {
                console.error(`[PDF-Lib] Erro ao processar arquivo ${file.name}:`, error);
                continue;
            }
        }

        if (mergedPdf.getPageCount() === 0) {
            throw new Error("Não foi possível processar nenhum dos arquivos fornecidos.");
        }

        return Buffer.from(await mergedPdf.save());
    } catch (error) {
        console.error("[PDF-Lib] Erro em unifyFilesToPdf:", error);
        throw error;
    }
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