"use strict";
// app/api/upload/route.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const axios_1 = __importDefault(require("axios"));
async function POST(request) {
    var _a;
    try {
        // Extrair o FormData da request
        const formData = await request.formData();
        const file = formData.get('file');
        if (!file) {
            console.error('Nenhum arquivo foi enviado na requisição.');
            return server_1.NextResponse.json({ message: 'Nenhum arquivo enviado.' }, { status: 400 });
        }
        // Criar novo FormData para enviar ao Baserow
        const uploadFormData = new FormData();
        uploadFormData.append('file', file, file.name);
        console.log('Enviando arquivo para o Baserow:', file.name);
        // Enviar requisição ao Baserow
        const response = await axios_1.default.post(process.env.BASEROW_UPLOAD_URL, uploadFormData, {
            headers: {
                Authorization: `Token ${process.env.BASEROW_TOKEN}`,
                // 'Content-Type': multipart/form-data é definido automaticamente pelo Axios ao enviar FormData
            },
        });
        console.log('Resposta do Baserow:', response.data);
        // Retornar a resposta do Baserow
        return server_1.NextResponse.json(response.data, { status: 200 });
    }
    catch (error) {
        console.error('Erro ao fazer upload:', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
        return server_1.NextResponse.json({ message: 'Erro ao fazer upload do arquivo.' }, { status: 500 });
    }
}
