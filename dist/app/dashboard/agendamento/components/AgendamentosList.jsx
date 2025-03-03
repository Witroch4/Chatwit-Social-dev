"use strict";
// components/agendamento/AgendamentosList.tsx
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const AgendamentoItem_1 = __importDefault(require("./AgendamentoItem"));
const AgendamentosList = ({ agendamentos, refetch, userID }) => {
    return (<ul className="space-y-4">
      {agendamentos.map((agendamento) => (<AgendamentoItem_1.default key={agendamento.id} agendamento={agendamento} // ou ajuste dentro do AgendamentoItem para lidar com parciais
         onExcluir={() => { }} refetch={refetch} userID={userID}/>))}
    </ul>);
};
exports.default = AgendamentosList;
