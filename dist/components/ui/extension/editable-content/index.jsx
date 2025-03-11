"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EditableContent = void 0;
const input_1 = require("../../../../components/ui/input");
const utils_1 = require("../../../../lib/utils");
const lucide_react_1 = require("lucide-react");
const react_1 = require("react");
const EditableContent = ({ initialValue, clipAt = 25, action, className }) => {
    const [isEditing, setEditing] = (0, react_1.useState)(false);
    const [value, setValue] = (0, react_1.useState)(initialValue);
    const KEYS = ["Escape", "Enter", "Tab"];
    const inputRef = (0, react_1.useRef)(null);
    const handleKeyDown = (e) => {
        const { key } = e;
        const value = e.currentTarget.children[0].value;
        if (KEYS.indexOf(key) != -1) {
            setEditing(false);
            action(value);
        }
    };
    const changeValue = (e) => {
        const { value } = e.target;
        setValue(value);
    };
    (0, react_1.useEffect)(() => {
        if (inputRef && inputRef.current && isEditing === true) {
            inputRef.current.focus();
        }
    }, [isEditing, inputRef]);
    return (<section className={(0, utils_1.cn)("group min-w-24 max-w-64", className)}>
        <div>
            {isEditing && (<div onBlur={() => setEditing(!isEditing)} onKeyDown={(e) => handleKeyDown(e)}>
                        <input_1.Input type="text" value={value} ref={inputRef} onChange={changeValue}/>
                    </div>)}
        </div>
        <div onClick={() => setEditing(!isEditing)}>
            {!isEditing && (<span className="flex flex-row bg-muted p-2 gap-2 rounded-md group-hover:bg-muted/70 transition-all">{value.substring(0, clipAt)} <lucide_react_1.Pencil width={12} height={12} className="fill-primary group-hover:text-primary group-hover:fill-primary-foreground transition-colors"/></span>)}
        </div>
    </section>);
};
exports.EditableContent = EditableContent;
