"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const link_1 = __importDefault(require("next/link"));
const DeniedPage = () => {
    return (<div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>Acesso Negado</h1>
      <p>Você não tem permissão para acessar esta página.</p>
      <link_1.default href="/">Voltar para a Home</link_1.default>
    </div>);
};
exports.default = DeniedPage;
