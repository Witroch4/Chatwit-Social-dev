import { v4 as uuidv4 } from "uuid";
import * as fs from "fs";
import * as path from "path";
import ILovePDF from "@ilovepdf/ilovepdf-nodejs";
import ILovePDFFile from "@ilovepdf/ilovepdf-nodejs/ILovePDFFile";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Carrega as variáveis de ambiente
const publicKey = process.env.ILOVEPDF_PUBLIC_KEY || "";
const secretKey = process.env.ILOVEPDF_SECRET_KEY || "";

// Instância do iLovePDF
const ilovepdfInstance = new ILovePDF(publicKey, secretKey);

// Tipo para ambientes
export type Environment = "development" | "production" | "test";

/**
 * Salva um buffer em um arquivo temporário e retorna o caminho.
 */
export async function saveTempFile(buffer: Buffer, extension: string): Promise<string> {
  if (!buffer || buffer.length === 0) {
    throw new Error("Buffer vazio ou inválido");
  }
  const tempDir = path.join(process.cwd(), "temp");
  console.log(`[iLovePDF] Diretório temporário: ${tempDir}`);
  if (!fs.existsSync(tempDir)) {
    console.log(`[iLovePDF] Criando diretório temporário: ${tempDir}`);
    fs.mkdirSync(tempDir, { recursive: true });
    try {
      fs.chmodSync(tempDir, 0o777);
      console.log(`[iLovePDF] Permissões definidas com sucesso`);
    } catch (permError) {
      console.warn("[iLovePDF] Aviso: Não foi possível definir permissões para o diretório temp:", permError);
    }
  }
  const fileName = `${uuidv4()}.${extension}`;
  const filePath = path.join(tempDir, fileName);
  console.log(`[iLovePDF] Salvando arquivo temporário: ${filePath} (${buffer.length} bytes)`);
  await fs.promises.writeFile(filePath, buffer);
  console.log(`[iLovePDF] Arquivo temporário salvo: ${filePath}`);
  return filePath;
}

/**
 * Unifica múltiplos arquivos em um único PDF.
 */
export async function unifyFilesToPdf(fileUrls: string[]): Promise<Buffer> {
  console.log(`[iLovePDF] Iniciando unificação de ${fileUrls.length} arquivos em PDF`);
  
  if (fileUrls.length === 0) {
    throw new Error("Nenhum arquivo fornecido para unificação");
  }
  
  // Se houver apenas um arquivo e ele já for PDF, retorne-o diretamente
  if (fileUrls.length === 1) {
    const fileUrl = fileUrls[0];
    if (isPdf(fileUrl)) {
      return await downloadUrlAsBuffer(fileUrl);
    }
  }
  
  // Inicie a tarefa de mesclagem
  const mergeTask = ilovepdfInstance.newTask("merge");
  await mergeTask.start();
  
  // Array para rastrear arquivos temporários para exclusão
  const tempFiles: string[] = [];
  
  try {
    // Processar cada URL de arquivo
    for (const url of fileUrls) {
      console.log(`[iLovePDF] Processando arquivo: ${url}`);
      
      let tempFilePath: string;
      
      if (isPdf(url)) {
        // Se já for PDF, apenas baixe
        const pdfBuffer = await downloadUrlAsBuffer(url);
        tempFilePath = await saveTempFile(pdfBuffer, "pdf");
      } 
      else if (isImage(url)) {
        // Se for imagem, converta para PDF
        const pdfBuffer = await convertImageToPdf(url);
        tempFilePath = await saveTempFile(pdfBuffer, "pdf");
      } 
      else if (isOfficeFile(url)) {
        // Se for documento Office, converta para PDF
        const pdfBuffer = await convertOfficeToPdf(url);
        tempFilePath = await saveTempFile(pdfBuffer, "pdf");
      } 
      else {
        // Outro tipo de arquivo, tente baixar e tratar como PDF
        console.log(`[iLovePDF] Tipo de arquivo não reconhecido: ${url}`);
        const fileBuffer = await downloadUrlAsBuffer(url);
        tempFilePath = await saveTempFile(fileBuffer, "pdf");
      }
      
      tempFiles.push(tempFilePath);
      
      // Adicione o arquivo à tarefa
      const pdfFile = new ILovePDFFile(tempFilePath);
      await mergeTask.addFile(pdfFile);
    }
    
    // Processe e baixe o PDF final
    console.log(`[iLovePDF] Processando mesclagem...`);
    await mergeTask.process();
    console.log(`[iLovePDF] Baixando PDF final...`);
    const resultBuffer = await mergeTask.download();
    return Buffer.from(resultBuffer);
  } finally {
    // Limpe os arquivos temporários
    for (const file of tempFiles) {
      try {
        await fs.promises.unlink(file);
        console.log(`[iLovePDF] Arquivo temporário removido: ${file}`);
      } catch (error) {
        console.error(`[iLovePDF] Erro ao remover arquivo temporário ${file}:`, error);
      }
    }
  }
}

/**
 * Converte uma imagem em PDF usando iLovePDF.
 */
export async function convertImageToPdf(imageUrl: string): Promise<Buffer> {
  console.log(`[iLovePDF] Convertendo imagem para PDF: ${imageUrl}`);
  const imageTask = ilovepdfInstance.newTask("imagepdf");
  await imageTask.start();
  
  // Baixar a imagem
  const imageBuffer = await downloadUrlAsBuffer(imageUrl);
  
  // Determinar a extensão correta
  let extension = "jpg";
  if (imageUrl.toLowerCase().endsWith("png")) extension = "png";
  if (imageUrl.toLowerCase().endsWith("gif")) extension = "gif";
  if (imageUrl.toLowerCase().endsWith("webp")) extension = "webp";
  
  // Salvar em arquivo temporário
  const tempFilePath = await saveTempFile(imageBuffer, extension);
  
  try {
    // Adicionar à tarefa
    const imageFile = new ILovePDFFile(tempFilePath);
    await imageTask.addFile(imageFile);
    
    // Processar e baixar
    await imageTask.process();
    const pdfBuffer = await imageTask.download();
    return Buffer.from(pdfBuffer);
  } finally {
    // Limpar arquivo temporário
    try {
      await fs.promises.unlink(tempFilePath);
    } catch (error) {
      console.error(`[iLovePDF] Erro ao excluir arquivo temporário ${tempFilePath}:`, error);
    }
  }
}

/**
 * Converte um arquivo Office em PDF usando iLovePDF.
 */
export async function convertOfficeToPdf(officeUrl: string): Promise<Buffer> {
  console.log(`[iLovePDF] Convertendo arquivo Office para PDF: ${officeUrl}`);
  const officeTask = ilovepdfInstance.newTask("officepdf");
  await officeTask.start();
  
  // Baixar o arquivo Office
  const officeBuffer = await downloadUrlAsBuffer(officeUrl);
  
  // Determinar a extensão correta
  let extension = "docx";
  try {
    const urlObj = new URL(officeUrl);
    const pathname = urlObj.pathname;
    const fileExtension = pathname.split(".").pop()?.toLowerCase();
    if (fileExtension && ["doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt", "ods", "odp"].includes(fileExtension)) {
      extension = fileExtension;
    }
  } catch (error) {
    console.warn("[iLovePDF] Não foi possível determinar a extensão do arquivo, usando .docx");
  }
  
  // Salvar em arquivo temporário
  const tempFilePath = await saveTempFile(officeBuffer, extension);
  
  try {
    // Adicionar à tarefa
    const officeFile = new ILovePDFFile(tempFilePath);
    await officeTask.addFile(officeFile);
    
    // Processar e baixar
    await officeTask.process();
    const pdfBuffer = await officeTask.download();
    return Buffer.from(pdfBuffer);
  } finally {
    // Limpar arquivo temporário
    try {
      await fs.promises.unlink(tempFilePath);
    } catch (error) {
      console.error(`[iLovePDF] Erro ao excluir arquivo temporário ${tempFilePath}:`, error);
    }
  }
}

/**
 * Baixa o arquivo de uma URL e retorna como Buffer.
 */
export async function downloadUrlAsBuffer(url: string): Promise<Buffer> {
  try {
    console.log(`[iLovePDF] Baixando arquivo: ${url}`);
    
    // Verificar se a URL é válida
    if (!url || typeof url !== 'string') {
      throw new Error(`URL inválida: ${url}`);
    }
    
    // Garantir que a URL tenha um protocolo
    let fullUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      fullUrl = `https://${url}`;
      console.log(`[iLovePDF] URL sem protocolo detectada, adicionando HTTPS: ${fullUrl}`);
    }
    
    const response = await fetch(fullUrl);
    if (!response.ok) {
      throw new Error(`Falha ao baixar arquivo (status ${response.status}): ${fullUrl}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    console.log(`[iLovePDF] Arquivo baixado com sucesso: ${fullUrl} (${arrayBuffer.byteLength} bytes)`);
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error(`[iLovePDF] Erro ao baixar arquivo: ${url}`, error);
    throw error;
  }
}

/**
 * Verifica se uma URL indica um arquivo de imagem.
 */
export function isImage(url: string): boolean {
  try {
    const urlPath = url.split('?')[0].split('#')[0]; // Remove query params e hash
    const filename = urlPath.split('/').pop() || "";
    // Extrai a extensão até o primeiro caractere especial após ela
    const extensionMatch = filename.match(/\.([^.-]+)(?:[-*]|$)/);
    const ext = extensionMatch ? extensionMatch[1].toLowerCase() : "";
    return ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "tiff", "tif"].includes(ext);
  } catch (error) {
    return false;
  }
}

/**
 * Verifica se uma URL indica um arquivo Office.
 */
export function isOfficeFile(url: string): boolean {
  try {
    const urlPath = url.split('?')[0].split('#')[0]; // Remove query params e hash
    const filename = urlPath.split('/').pop() || "";
    // Extrai a extensão até o primeiro caractere especial após ela
    const extensionMatch = filename.match(/\.([^.-]+)(?:[-*]|$)/);
    const ext = extensionMatch ? extensionMatch[1].toLowerCase() : "";
    return ["doc", "docx", "ppt", "pptx", "xls", "xlsx", "odt", "odp", "ods"].includes(ext);
  } catch (error) {
    return false;
  }
}

/**
 * Verifica se uma URL indica um arquivo PDF.
 */
export function isPdf(url: string): boolean {
  try {
    const urlPath = url.split('?')[0].split('#')[0]; // Remove query params e hash
    const filename = urlPath.split('/').pop() || "";
    // Extrai a extensão até o primeiro caractere especial após ela
    const extensionMatch = filename.match(/\.([^.-]+)(?:[-*]|$)/);
    const ext = extensionMatch ? extensionMatch[1].toLowerCase() : "";
    return ext === "pdf";
  } catch (error) {
    return false;
  }
}

/**
 * Salva o PDF em um bucket MinIO.
 */
export async function savePdfToMinIO(
  pdfBuffer: Buffer,
  filename: string,
  bucket: string,
  env: Environment
): Promise<string> {
  try {
    // Configuração do client S3
    const endpoint = `https://${process.env.S3Endpoint || 'objstoreapi.witdev.com.br'}`;
    console.log(`[iLovePDF] Endpoint S3: ${endpoint}`);
    
    // Inicializando o client S3
    const s3Client = new S3Client({
      region: "us-east-1",
      endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.S3AccessKey!,
        secretAccessKey: process.env.S3SecretKey!,
      },
    });

    // Criando o comando para upload
    const key = `${env}/${filename}`;
    const uploadCommand = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: pdfBuffer,
      ContentType: "application/pdf",
    });

    // Executa o upload
    console.log(`[iLovePDF] Iniciando upload para: bucket=${bucket}, key=${key}`);
    await s3Client.send(uploadCommand);
    console.log(`[iLovePDF] Upload concluído com sucesso`);

    // Garante que a URL retornada está completa e correta
    const host = process.env.S3Endpoint || 'objstoreapi.witdev.com.br';
    const url = `https://${host}/${bucket}/${key}`;
    console.log(`[iLovePDF] URL gerada: ${url}`);
    
    return url;
  } catch (error) {
    console.error("[iLovePDF] Erro ao salvar arquivo no MinIO:", error);
    throw error;
  }
} 