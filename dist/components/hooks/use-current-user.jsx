"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useCurrentUser = void 0;
const react_1 = require("next-auth/react");
const useCurrentUser = () => {
    var _a;
    const session = (0, react_1.useSession)();
    return (_a = session.data) === null || _a === void 0 ? void 0 : _a.user;
};
exports.useCurrentUser = useCurrentUser;
