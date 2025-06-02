import { TableCell } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { SelectCellProps } from "../types";

export function SelectCell({ isSelected, onSelect, leadId }: SelectCellProps) {
  return (
    <TableCell className="w-[40px] p-2 align-middle">
      <Checkbox 
        checked={isSelected} 
        onCheckedChange={(checked) => onSelect(leadId, checked as boolean)}
        aria-label="Selecionar lead"
      />
    </TableCell>
  );
} 