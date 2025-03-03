"use strict";
"use client";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DateTimePicker = DateTimePicker;
const React = __importStar(require("react"));
const date_fns_1 = require("date-fns");
const locale_1 = require("date-fns/locale");
const lucide_react_1 = require("lucide-react");
const utils_1 = require("@/lib/utils");
const button_1 = require("@/components/ui/button");
const calendar_1 = require("@/components/ui/calendar");
const popover_1 = require("@/components/ui/popover");
const time_picker_demo_1 = require("./time-picker-demo");
function DateTimePicker({ date, setDate }) {
    const handleSelect = (selectedDay) => {
        if (!selectedDay)
            return;
        // Preserva a hora do "date" atual
        const oldHours = date.getHours();
        const oldMinutes = date.getMinutes();
        const oldSeconds = date.getSeconds();
        const oldMs = date.getMilliseconds();
        // Cria nova data juntando o dia/mes/ano do 'selectedDay'
        // com a hora do 'date' atual
        const newDateWithOldTime = new Date(selectedDay.getFullYear(), selectedDay.getMonth(), selectedDay.getDate(), oldHours, oldMinutes, oldSeconds, oldMs);
        setDate(newDateWithOldTime);
    };
    return (<div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Escolha Data e Hora
      </label>

      <popover_1.Popover>
        <popover_1.PopoverTrigger asChild>
          <button_1.Button variant={"outline"} className={(0, utils_1.cn)("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
            <lucide_react_1.CalendarIcon className="mr-2 h-4 w-4"/>
            {date
            ? (0, date_fns_1.format)(date, "dd/MM/yyyy HH:mm:ss", { locale: locale_1.ptBR })
            : <span>Selecionar data e hora</span>}
          </button_1.Button>
        </popover_1.PopoverTrigger>
        {/* Adicione as classes 'z-50' e 'pointer-events-auto' */}
        <popover_1.PopoverContent className="w-auto p-0 z-50 pointer-events-auto" align="start">
          <calendar_1.Calendar mode="single" selected={date} onSelect={handleSelect} initialFocus locale={locale_1.ptBR} className="border border-gray-300 rounded-md"/>
          <div className="p-3 border-t border-border">
            <time_picker_demo_1.TimePickerDemo setDate={setDate} date={date}/>
          </div>
        </popover_1.PopoverContent>
      </popover_1.Popover>
    </div>);
}
