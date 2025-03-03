"use strict";
// components/agendamento/AgendarFooter.tsx
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const button_1 = require("@/components/ui/button");
const drawer_1 = require("@/components/ui/drawer");
const AgendarFooter = ({ onAgendar, uploading }) => {
    return (<div className="p-4 flex justify-end space-x-2">
      <button_1.Button onClick={onAgendar} disabled={uploading}>
        {uploading ? "Enviando..." : "Agendar"}
      </button_1.Button>
      <drawer_1.DrawerClose asChild>
        <button_1.Button variant="outline">Cancelar</button_1.Button>
      </drawer_1.DrawerClose>
    </div>);
};
exports.default = AgendarFooter;
