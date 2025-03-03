"use strict";
// bull-board-server.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const api_1 = require("@bull-board/api");
const bullMQAdapter_1 = require("@bull-board/api/bullMQAdapter");
const express_2 = require("@bull-board/express");
const agendamento_queue_1 = require("./lib/queue/agendamento.queue"); // Ajuste o caminho conforme necessário
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const serverAdapter = new express_2.ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');
(0, api_1.createBullBoard)({
    queues: [new bullMQAdapter_1.BullMQAdapter(agendamento_queue_1.agendamentoQueue)],
    serverAdapter,
});
app.use('/admin/queues', serverAdapter.getRouter());
const PORT = process.env.BULL_BOARD_PORT || 3005;
app.listen(PORT, () => {
    console.log(`Bull Board rodando em http://localhost:${PORT}/admin/queues`);
});
