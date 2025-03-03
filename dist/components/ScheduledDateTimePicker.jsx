"use strict";
//components/ScheduledDateTimePicker.tsx
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const ScheduledDateTimePicker = ({ label = "Data e Hora Agendada", value, onChange, required = false, minDateTime, maxDateTime, className = "", }) => {
    return (<div className={`flex flex-col ${className}`}>
      {label && (<label className="block text-sm font-medium mb-1" htmlFor="scheduledDateTime">
          {label}
        </label>)}
      <input type="datetime-local" id="scheduledDateTime" name="scheduledDateTime" value={value} onChange={(e) => onChange(e.target.value)} required={required} min={minDateTime} max={maxDateTime} className="mt-1 block w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
    </div>);
};
exports.default = ScheduledDateTimePicker;
