"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useForwardedRef = useForwardedRef;
const react_1 = require("react");
function useForwardedRef(ref) {
    const innerRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        if (!ref)
            return;
        if (typeof ref === 'function') {
            ref(innerRef.current);
        }
        else {
            ref.current = innerRef.current;
        }
    });
    return innerRef;
}
