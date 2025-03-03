"use strict";
// components/AgendamentosTable.tsx
"use client";
// components/AgendamentosTable.tsx
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
const axios_1 = __importDefault(require("axios"));
const material_1 = require("@mui/material");
const AgendamentosTable = () => {
    const [agendamentos, setAgendamentos] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)("");
    (0, react_1.useEffect)(() => {
        const fetchAgendamentos = async () => {
            try {
                const response = await axios_1.default.get("/api/admin/agendamentos");
                setAgendamentos(response.data.agendamentos);
            }
            catch (err) {
                setError("Erro ao carregar agendamentos.");
                console.error(err);
            }
            finally {
                setLoading(false);
            }
        };
        fetchAgendamentos();
    }, []);
    const handleDelete = async (id) => {
        if (!confirm("Tem certeza que deseja excluir este agendamento?"))
            return;
        try {
            await axios_1.default.delete(`/api/admin/agendamentos/${id}`);
            setAgendamentos(agendamentos.filter((ag) => ag.id !== id));
        }
        catch (err) {
            setError("Erro ao excluir agendamento.");
            console.error(err);
        }
    };
    if (loading)
        return <material_1.CircularProgress />;
    if (error)
        return <material_1.Alert severity="error">{error}</material_1.Alert>;
    return (<material_1.TableContainer component={material_1.Paper}>
      <material_1.Typography variant="h6" component="div" style={{ padding: "16px" }}>
        Lista de Agendamentos
      </material_1.Typography>
      <material_1.Table>
        <material_1.TableHead>
          <material_1.TableRow>
            <material_1.TableCell>ID</material_1.TableCell>
            <material_1.TableCell>User ID</material_1.TableCell>
            <material_1.TableCell>Data</material_1.TableCell>
            <material_1.TableCell>Descrição</material_1.TableCell>
            <material_1.TableCell>Status</material_1.TableCell>
            <material_1.TableCell>Ações</material_1.TableCell>
          </material_1.TableRow>
        </material_1.TableHead>
        <material_1.TableBody>
          {agendamentos.map((agendamento) => (<material_1.TableRow key={agendamento.id}>
              <material_1.TableCell>{agendamento.id}</material_1.TableCell>
              <material_1.TableCell>{agendamento.userID}</material_1.TableCell>
              <material_1.TableCell>{new Date(agendamento.Data).toLocaleString()}</material_1.TableCell>
              <material_1.TableCell>{agendamento.Descrição}</material_1.TableCell>
              <material_1.TableCell>{agendamento.status}</material_1.TableCell>
              <material_1.TableCell>
                <material_1.Button variant="contained" color="secondary" onClick={() => handleDelete(agendamento.id)}>
                  Excluir
                </material_1.Button>
              </material_1.TableCell>
            </material_1.TableRow>))}
        </material_1.TableBody>
      </material_1.Table>
    </material_1.TableContainer>);
};
exports.default = AgendamentosTable;
