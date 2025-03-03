"use strict";
// app/dashboard/automação/components/ToggleActions.tsx
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ToggleActions;
const toggle_group_1 = require("@/components/ui/toggle-group");
function ToggleActions({ toggleValue, setToggleValue }) {
    return (<div style={{ marginTop: "30px" }}>
      <toggle_group_1.ToggleGroup type="single" value={toggleValue} onValueChange={(v) => v && setToggleValue(v)}>
        <toggle_group_1.ToggleGroupItem value="publicar">Publicar</toggle_group_1.ToggleGroupItem>
        <toggle_group_1.ToggleGroupItem value="comentarios">Comentários</toggle_group_1.ToggleGroupItem>
        <toggle_group_1.ToggleGroupItem value="dm">DM</toggle_group_1.ToggleGroupItem>
      </toggle_group_1.ToggleGroup>
    </div>);
}
