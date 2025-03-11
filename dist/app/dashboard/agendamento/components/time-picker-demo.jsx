"use strict";
// components/agendamento/time-picker-demo.tsx
"use client";
// components/agendamento/time-picker-demo.tsx
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
exports.TimePickerDemo = TimePickerDemo;
const React = __importStar(require("react"));
const lucide_react_1 = require("lucide-react");
const label_1 = require("../../../../components/ui/label");
const time_picker_input_1 = require("./time-picker-input");
function TimePickerDemo({ date, setDate }) {
    const minuteRef = React.useRef(null);
    const hourRef = React.useRef(null);
    const secondRef = React.useRef(null);
    return (<div className="flex items-end gap-2">
      <div className="grid gap-1 text-center">
        <label_1.Label htmlFor="hours" className="text-xs">
          Horas
        </label_1.Label>
        <time_picker_input_1.TimePickerInput picker="hours" date={date} setDate={setDate} ref={hourRef} onRightFocus={() => { var _a; return (_a = minuteRef.current) === null || _a === void 0 ? void 0 : _a.focus(); }}/>
      </div>
      <div className="grid gap-1 text-center">
        <label_1.Label htmlFor="minutes" className="text-xs">
          Minutos
        </label_1.Label>
        <time_picker_input_1.TimePickerInput picker="minutes" date={date} setDate={setDate} ref={minuteRef} onLeftFocus={() => { var _a; return (_a = hourRef.current) === null || _a === void 0 ? void 0 : _a.focus(); }} onRightFocus={() => { var _a; return (_a = secondRef.current) === null || _a === void 0 ? void 0 : _a.focus(); }}/>
      </div>
      <div className="grid gap-1 text-center">
        <label_1.Label htmlFor="seconds" className="text-xs">
          Segundos
        </label_1.Label>
        <time_picker_input_1.TimePickerInput picker="seconds" date={date} setDate={setDate} ref={secondRef} onLeftFocus={() => { var _a; return (_a = minuteRef.current) === null || _a === void 0 ? void 0 : _a.focus(); }}/>
      </div>
      <div className="flex h-10 items-center">
        <lucide_react_1.Clock className="ml-2 h-4 w-4"/>
      </div>
    </div>);
}
