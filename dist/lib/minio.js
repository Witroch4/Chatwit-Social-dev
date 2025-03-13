"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToMinIO = uploadToMinIO;
exports.uploadMultipleToMinIO = uploadMultipleToMinIO;
exports.generatePresignedUrl = generatePresignedUrl;
exports.extractObjectKeyFromUrl = extractObjectKeyFromUrl;
// lib/minio.ts
const client_s3_1 = require("@aws-sdk/client-s3");
const uuid_1 = require("uuid");
const stream_1 = require("stream");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
// Configuração do cliente S3 para MinIO
const s3Client = new client_s3_1.S3Client({
    region: 'us-east-1', // Região padrão, pode ser qualquer uma para MinIO
    endpoint: `https://${process.env.S3Endpoint || 'objstoreapi.witdev.com.br'}`,
    credentials: {
        accessKeyId: process.env.S3AccessKey || 'WOmhXdGA7q45h6eUd76E',
        secretAccessKey: process.env.S3SecretKey || 'VBFbOh6VMW1flrwyzWS4CoR4dtibpfeSRwYhjkbs',
    },
    forcePathStyle: true, // Necessário para MinIO
});
const BUCKET_NAME = process.env.S3Bucket || 'chatwit-social';
const HOST = process.env.S3Host || 'objstore.witdev.com.br';
/**
 * Converte um Buffer ou ArrayBuffer para um Readable Stream
 */
function bufferToStream(buffer) {
    const readable = new stream_1.Readable();
    // _read é necessário mas pode ficar vazio
    readable._read = () => { };
    readable.push(buffer);
    readable.push(null);
    return readable;
}
/**
 * Faz upload de um arquivo para o MinIO
 * @param file Arquivo a ser enviado (Buffer ou ArrayBuffer)
 * @param fileName Nome original do arquivo (opcional)
 * @param mimeType Tipo MIME do arquivo
 * @returns Objeto com URL, tipo MIME e a resposta completa do MinIO
 */
async function uploadToMinIO(file, fileName, mimeType) {
    try {
        // Calcula o tamanho do arquivo para evitar cabeçalho "undefined"
        const fileSize = file instanceof Buffer ? file.length : file.byteLength;
        // Gera um nome único para o arquivo
        const uniqueFileName = fileName
            ? `${(0, uuid_1.v4)()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`
            : `${(0, uuid_1.v4)()}.${(mimeType === null || mimeType === void 0 ? void 0 : mimeType.split('/')[1]) || 'bin'}`;
        // Converte o arquivo para um stream
        const fileStream = bufferToStream(file);
        // Configura o comando de upload
        const command = new client_s3_1.PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: uniqueFileName,
            Body: fileStream,
            ContentType: mimeType || 'application/octet-stream',
            ContentLength: fileSize, // IMPORTANTE para evitar erro de x-amz-decoded-content-length
        });
        // Executa o upload e obtém a resposta completa do S3/MinIO
        const response = await s3Client.send(command);
        console.log('MinIO Upload Response:', response);
        // Monta a URL final
        const url = `https://${HOST}/${BUCKET_NAME}/${uniqueFileName}`;
        return {
            url,
            mime_type: mimeType || 'application/octet-stream',
            s3RawResponse: response,
        };
    }
    catch (error) {
        console.error('Erro ao fazer upload para o MinIO:', error);
        throw new Error(`Falha ao fazer upload para o MinIO: ${error}`);
    }
}
/**
 * Faz upload de múltiplos arquivos para o MinIO
 * @param files Array de arquivos a serem enviados
 * @returns Array de objetos com URL, tipo MIME e resposta completa de cada upload
 */
async function uploadMultipleToMinIO(files) {
    try {
        const uploadPromises = files.map(file => uploadToMinIO(file.buffer, file.fileName, file.mimeType));
        return await Promise.all(uploadPromises);
    }
    catch (error) {
        console.error('Erro ao fazer upload múltiplo para o MinIO:', error);
        throw new Error(`Falha ao fazer upload múltiplo para o MinIO: ${error}`);
    }
}
/**
 * Gera uma URL pré-assinada para acesso direto a um objeto no MinIO
 * @param objectKey Chave do objeto no bucket
 * @param expiresIn Tempo de expiração em segundos (padrão: 24 horas)
 * @returns URL pré-assinada
 */
async function generatePresignedUrl(objectKey, expiresIn = 86400) {
    try {
        const command = new client_s3_1.GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: objectKey,
        });
        const url = await (0, s3_request_presigner_1.getSignedUrl)(s3Client, command, { expiresIn });
        console.log(`[MinIO] URL pré-assinada gerada para ${objectKey}:`, url);
        return url;
    }
    catch (error) {
        console.error(`[MinIO] Erro ao gerar URL pré-assinada para ${objectKey}:`, error);
        throw new Error(`Falha ao gerar URL pré-assinada: ${error}`);
    }
}
/**
 * Extrai a chave do objeto de uma URL do MinIO
 * @param url URL completa do MinIO
 * @returns Chave do objeto
 */
function extractObjectKeyFromUrl(url) {
    try {
        // Remove o protocolo e o domínio para obter apenas o caminho
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        // Remove a primeira parte vazia e o nome do bucket
        const bucketName = process.env.MINIO_BUCKET_NAME || 'chatwit-social';
        const bucketIndex = pathParts.findIndex(part => part === bucketName);
        if (bucketIndex === -1) {
            throw new Error(`Bucket ${bucketName} não encontrado na URL`);
        }
        // Junta as partes restantes do caminho para formar a chave do objeto
        const objectKey = pathParts.slice(bucketIndex + 1).join('/');
        return objectKey;
    }
    catch (error) {
        console.error(`[MinIO] Erro ao extrair chave do objeto da URL ${url}:`, error);
        // Fallback: tenta extrair a parte final da URL
        const parts = url.split('/');
        return parts[parts.length - 1];
    }
}
