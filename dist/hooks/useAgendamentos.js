"use strict";
// hooks/useAgendamentos.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
const axios_1 = __importDefault(require("axios"));
const useAgendamentos = (userID) => {
    const [agendamentos, setAgendamentos] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const fetchAgendamentos = async () => {
        var _a, _b;
        if (!userID)
            return;
        setLoading(true);
        try {
            const response = await axios_1.default.get("/api/agendar", {
                headers: {
                    "user-id": userID, // Enviar userID nos headers
                },
            });
            setAgendamentos(response.data.results || []);
        }
        catch (err) {
            setError(((_b = (_a = err.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.error) || "Erro ao buscar agendamentos.");
        }
        finally {
            setLoading(false);
        }
    };
    (0, react_1.useEffect)(() => {
        fetchAgendamentos();
    }, [userID]);
    return { agendamentos, loading, error, refetch: fetchAgendamentos };
};
exports.default = useAgendamentos;
