"use strict";
// components/agendamento/time-picker-input.tsx
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimePickerInput = void 0;
const input_1 = require("../../../../components/ui/input");
const utils_1 = require("../../../../lib/utils");
const react_1 = __importDefault(require("react"));
const time_picker_utils_1 = require("./time-picker-utils");
const TimePickerInput = react_1.default.forwardRef((_a, ref) => {
    var { className, type = "tel", value, id, name, date, setDate, onChange, onKeyDown, picker, period, onLeftFocus, onRightFocus } = _a, props = __rest(_a, ["className", "type", "value", "id", "name", "date", "setDate", "onChange", "onKeyDown", "picker", "period", "onLeftFocus", "onRightFocus"]);
    const [flag, setFlag] = react_1.default.useState(false);
    const [prevIntKey, setPrevIntKey] = react_1.default.useState("0");
    /**
     * allow the user to enter the second digit within 2 seconds
     * otherwise start again with entering first digit
     */
    react_1.default.useEffect(() => {
        if (flag) {
            const timer = setTimeout(() => {
                setFlag(false);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [flag]);
    const calculatedValue = react_1.default.useMemo(() => {
        return (0, time_picker_utils_1.getDateByType)(date !== null && date !== void 0 ? date : new Date(), picker);
    }, [date, picker]);
    const calculateNewValue = (key) => {
        /*
         * If picker is '12hours' and the first digit is 0, then the second digit is automatically set to 1.
         * The second entered digit will break the condition and the value will be set to 10-12.
         */
        if (picker === "12hours") {
            if (flag && calculatedValue.slice(1, 2) === "1" && prevIntKey === "0")
                return "0" + key;
        }
        return !flag ? "0" + key : calculatedValue.slice(1, 2) + key;
    };
    const handleKeyDown = (e) => {
        if (e.key === "Tab")
            return;
        e.preventDefault();
        if (e.key === "ArrowRight")
            onRightFocus === null || onRightFocus === void 0 ? void 0 : onRightFocus();
        if (e.key === "ArrowLeft")
            onLeftFocus === null || onLeftFocus === void 0 ? void 0 : onLeftFocus();
        if (["ArrowUp", "ArrowDown"].includes(e.key)) {
            const step = e.key === "ArrowUp" ? 1 : -1;
            const newValue = (0, time_picker_utils_1.getArrowByType)(calculatedValue, step, picker);
            if (flag)
                setFlag(false);
            const tempDate = new Date(date || new Date());
            setDate((0, time_picker_utils_1.setDateByType)(tempDate, newValue, picker, period));
        }
        if (e.key >= "0" && e.key <= "9") {
            if (picker === "12hours")
                setPrevIntKey(e.key);
            const newValue = calculateNewValue(e.key);
            if (flag)
                onRightFocus === null || onRightFocus === void 0 ? void 0 : onRightFocus();
            setFlag((prev) => !prev);
            const tempDate = new Date(date || new Date());
            setDate((0, time_picker_utils_1.setDateByType)(tempDate, newValue, picker, period));
        }
    };
    return (<input_1.Input ref={ref} id={id || picker} name={name || picker} className={(0, utils_1.cn)("w-[48px] text-center font-mono text-base tabular-nums caret-transparent focus:bg-accent focus:text-accent-foreground [&::-webkit-inner-spin-button]:appearance-none", className)} value={value || calculatedValue} onChange={(e) => {
            e.preventDefault();
            onChange === null || onChange === void 0 ? void 0 : onChange(e);
        }} type={type} inputMode="decimal" onKeyDown={(e) => {
            onKeyDown === null || onKeyDown === void 0 ? void 0 : onKeyDown(e);
            handleKeyDown(e);
        }} {...props}/>);
});
exports.TimePickerInput = TimePickerInput;
TimePickerInput.displayName = "TimePickerInput";
