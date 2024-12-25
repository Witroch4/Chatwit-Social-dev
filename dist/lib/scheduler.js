"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLogs = getLogs;
exports.cancelAgendamento = cancelAgendamento;
exports.scheduleAgendamento = scheduleAgendamento;
exports.scheduleAgendamentoEspecial = scheduleAgendamentoEspecial;
exports.loadAllAgendamentosPendentes = loadAllAgendamentosPendentes;
// lib/scheduler.ts
var axios_1 = require("axios");
/**
 * Mapa para armazenar em memória os timers de cada agendamento.
 * chave: ID do Baserow (string ou number)
 * valor: objeto Timeout do Node
 */
var activeTimers = new Map();
/**
 * URL do webhook externo para onde enviar as requisições quando chegar o horário.
 */
var WEBHOOK_URL = "https://autofluxofilaapi.witdev.com.br/webhook/5f439037-6e1a-4d53-80ae-1cc0c4633c51";
// Armazenamento de logs
var logs = [];
/**
 * Função para adicionar logs tanto no console quanto no array de logs.
 * @param message Mensagem de log.
 */
function addLog(message) {
    console.log(message);
    logs.push(message);
}
/**
 * Função para recuperar os logs e limpar o array.
 * @returns Array de logs.
 */
function getLogs() {
    var currentLogs = __spreadArray([], logs, true);
    logs = [];
    return currentLogs;
}
/**
 * Cancela um agendamento se existir um timer ativo em memória.
 */
function cancelAgendamento(id) {
    var timer = activeTimers.get(String(id));
    if (timer) {
        clearTimeout(timer);
        activeTimers.delete(String(id));
        addLog("[Scheduler] Agendamento ".concat(id, " cancelado."));
    }
}
/**
 * Dispara o webhook para o agendamento especificado.
 */
function dispararWebhook(agendamento) {
    return __awaiter(this, void 0, void 0, function () {
        var id, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    id = agendamento.id;
                    addLog("[Scheduler] Disparando webhook para agendamento ".concat(id, "..."));
                    // Remover do map de timers para não disparar novamente
                    activeTimers.delete(String(id));
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    // 1) Dispara requisição ao seu webhook externo
                    return [4 /*yield*/, axios_1.default.post(WEBHOOK_URL, {
                            baserowId: id,
                            dataAgendada: agendamento.Data,
                            userID: agendamento.userID,
                        })];
                case 2:
                    // 1) Dispara requisição ao seu webhook externo
                    _a.sent();
                    addLog("[Scheduler] Webhook disparado com sucesso para agendamento ".concat(id, "."));
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _a.sent();
                    if (error_1.response) {
                        addLog("[Scheduler] Erro ao disparar webhook do agendamento ".concat(id, ": ").concat(error_1.response.status, " - ").concat(JSON.stringify(error_1.response.data)));
                    }
                    else {
                        addLog("[Scheduler] Erro ao disparar webhook do agendamento ".concat(id, ": ").concat((error_1 === null || error_1 === void 0 ? void 0 : error_1.message) || error_1));
                    }
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Agenda um agendamento "normal" com base em data/hora completa (campo Data).
 */
function scheduleAgendamento(agendamento) {
    cancelAgendamento(agendamento.id);
    var now = new Date();
    var dataExec = new Date(agendamento.Data);
    var delay = dataExec.getTime() - now.getTime();
    if (delay <= 0) {
        addLog("[Scheduler] (Normal) Data de agendamento ".concat(agendamento.id, " j\u00E1 passou ou \u00E9 agora. Disparando imediatamente."));
        dispararWebhook(agendamento);
        return;
    }
    var timer = setTimeout(function () {
        dispararWebhook(agendamento);
    }, delay);
    activeTimers.set(String(agendamento.id), timer);
    addLog("[Scheduler] (Normal) Agendamento ".concat(agendamento.id, " marcado para ").concat(dataExec.toISOString(), " (delay ").concat(delay, "ms)."));
}
/**
 * Agenda um agendamento "especial", ignorando o dia e usando apenas a hora/minuto/segundo.
 */
function scheduleAgendamentoEspecial(agendamento) {
    cancelAgendamento(agendamento.id);
    var now = new Date();
    var parsed = new Date(agendamento.Data);
    // Extrair somente hora/min/seg
    var h = parsed.getHours();
    var m = parsed.getMinutes();
    var s = parsed.getSeconds();
    // Montar "hoje" com essa hora
    var dataExec = new Date(now);
    dataExec.setHours(h, m, s, 0);
    if (dataExec.getTime() <= now.getTime()) {
        // Se já passou hoje, agenda pra amanhã
        dataExec.setDate(dataExec.getDate() + 1);
        addLog("[Scheduler] (Especial) Hora de agendamento ".concat(agendamento.id, " j\u00E1 passou hoje. Marcado para amanh\u00E3 => ").concat(dataExec.toISOString()));
    }
    var delay = dataExec.getTime() - now.getTime();
    if (delay <= 0) {
        addLog("[Scheduler] (Especial) Hora de agendamento ".concat(agendamento.id, " j\u00E1 passou ou \u00E9 agora. Disparando imediatamente."));
        dispararWebhook(agendamento);
        return;
    }
    // Criar timeout
    var timer = setTimeout(function () {
        dispararWebhook(agendamento);
    }, delay);
    activeTimers.set(String(agendamento.id), timer);
    addLog("[Scheduler] (Especial) Agendamento ".concat(agendamento.id, " marcado para ").concat(dataExec.toISOString(), " (delay ").concat(delay, "ms)."));
}
/**
 * Carrega todos os agendamentos "pendentes" do Baserow e agenda-os.
 * - Linhas NORMAIS: Concluido_IG vazio + Diario vazio => (Data + hora)
 * - Linhas ESPECIAIS: Concluido_IG vazio + Diario marcado => ignora data (só hora)
 */
function loadAllAgendamentosPendentes() {
    return __awaiter(this, void 0, void 0, function () {
        var BASEROW_TOKEN, BASEROW_TABLE_ID, normalParams, specialParams, BASE_URL, normalResponse, specialResponse, normalRows, specialRows, totalAgendados, now, _i, normalRows_1, ag, dataExec, _a, specialRows_1, ag, dataParsed, h, m, s, today, finalAgendamento, error_2;
        var _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    addLog("[Scheduler] Carregando agendamentos pendentes do Baserow...");
                    _d.label = 1;
                case 1:
                    _d.trys.push([1, 4, , 5]);
                    BASEROW_TOKEN = process.env.BASEROW_TOKEN || "";
                    BASEROW_TABLE_ID = process.env.BASEROW_TABLE_ID || "";
                    if (!BASEROW_TABLE_ID || !BASEROW_TOKEN) {
                        addLog("[Scheduler] BASEROW_TABLE_ID ou BASEROW_TOKEN não está definido. Impossível carregar agendamentos.");
                        return [2 /*return*/];
                    }
                    normalParams = {
                        user_field_names: 'true', // Deve ser string 'true'
                        filter__Concluido_IG__empty: 'true', // pendente como string 'true'
                        filter__Diario__empty: 'true', // "não especial" como string 'true'
                        size: 200,
                    };
                    specialParams = {
                        user_field_names: 'true', // Deve ser string 'true'
                        filter__Concluido_IG__empty: 'true', // pendente como string 'true'
                        filter__Diario__not_empty: true, // "especial" (booleano) como booleano true
                        size: 200,
                    };
                    BASE_URL = "https://planilhatecnologicabd.witdev.com.br/api/database/rows/table/".concat(BASEROW_TABLE_ID, "/");
                    // Requisição para linhas NORMAIS
                    addLog("[Scheduler] --> Fazendo GET para linhas NORMAIS...");
                    return [4 /*yield*/, axios_1.default.get(BASE_URL, {
                            headers: { Authorization: "Token ".concat(BASEROW_TOKEN) },
                            params: normalParams,
                        })];
                case 2:
                    normalResponse = _d.sent();
                    addLog("[Scheduler] --> GET Normal finalizado. Status: ".concat(normalResponse.status));
                    // Requisição para linhas ESPECIAIS
                    addLog("[Scheduler] --> Fazendo GET para linhas ESPECIAIS...");
                    return [4 /*yield*/, axios_1.default.get(BASE_URL, {
                            headers: { Authorization: "Token ".concat(BASEROW_TOKEN) },
                            params: specialParams,
                        })];
                case 3:
                    specialResponse = _d.sent();
                    addLog("[Scheduler] --> GET Especial finalizado. Status: ".concat(specialResponse.status));
                    normalRows = ((_b = normalResponse.data) === null || _b === void 0 ? void 0 : _b.results) || [];
                    specialRows = ((_c = specialResponse.data) === null || _c === void 0 ? void 0 : _c.results) || [];
                    addLog("[Scheduler] Linhas NORMAIS pendentes: ".concat(normalRows.length));
                    addLog("[Scheduler] Linhas ESPECIAIS pendentes: ".concat(specialRows.length));
                    totalAgendados = 0;
                    now = new Date();
                    // 1) Agendar as linhas NORMAIS
                    for (_i = 0, normalRows_1 = normalRows; _i < normalRows_1.length; _i++) {
                        ag = normalRows_1[_i];
                        dataExec = new Date(ag.Data);
                        if (dataExec.getTime() > now.getTime()) {
                            scheduleAgendamento(ag);
                            totalAgendados++;
                        }
                        else {
                            addLog("[Scheduler] (Normal) Ag ".concat(ag.id, " j\u00E1 passou a data. N\u00E3o agendado."));
                        }
                    }
                    // 2) Agendar as linhas ESPECIAIS
                    for (_a = 0, specialRows_1 = specialRows; _a < specialRows_1.length; _a++) {
                        ag = specialRows_1[_a];
                        dataParsed = new Date(ag.Data);
                        h = dataParsed.getHours();
                        m = dataParsed.getMinutes();
                        s = dataParsed.getSeconds();
                        today = new Date();
                        today.setHours(h, m, s, 0);
                        // Se já passou hoje, jogamos pra amanhã
                        if (today.getTime() <= now.getTime()) {
                            today.setDate(today.getDate() + 1);
                            addLog("[Scheduler] (Especial) Hora de agendamento ".concat(ag.id, " j\u00E1 passou hoje. Marcado para amanh\u00E3 => ").concat(today.toISOString()));
                        }
                        finalAgendamento = {
                            id: ag.id,
                            Data: today.toISOString(),
                            userID: ag.userID || "", // adicione se tiver userID
                        };
                        scheduleAgendamentoEspecial(finalAgendamento);
                        totalAgendados++;
                    }
                    addLog("[Scheduler] Total de post(s) agendado(s) agora: ".concat(totalAgendados));
                    return [3 /*break*/, 5];
                case 4:
                    error_2 = _d.sent();
                    if (error_2.response) {
                        addLog("[Scheduler] Erro ao carregar agendamentos: ".concat(error_2.response.status, " - ").concat(JSON.stringify(error_2.response.data)));
                    }
                    else {
                        addLog("[Scheduler] Erro ao carregar agendamentos: ".concat((error_2 === null || error_2 === void 0 ? void 0 : error_2.message) || error_2));
                    }
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    });
}
