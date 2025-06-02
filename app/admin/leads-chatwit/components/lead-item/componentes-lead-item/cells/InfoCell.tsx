import { TableCell } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone } from "lucide-react";
import { CellProps } from "../types";
import { getDisplayName, formatDate } from "../utils";

interface InfoCellProps extends CellProps {
  onViewDetails: () => void;
  onShowFullImage: () => void;
}

export function InfoCell({ lead, onViewDetails, onShowFullImage }: InfoCellProps) {
  const displayName = getDisplayName(lead);
  const formattedDate = formatDate(lead.createdAt ?? new Date());

  return (
    <TableCell className="w-[250px] p-2 align-middle">
      <div className="flex items-center gap-2">
        <Avatar className="h-9 w-9 cursor-pointer" onClick={onShowFullImage}>
          {lead.thumbnail ? (
            <AvatarImage src={lead.thumbnail} alt={displayName} />
          ) : null}
          <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <div 
            className="font-medium hover:text-primary hover:underline cursor-pointer" 
            onClick={onViewDetails}
          >
            {lead.name || "Lead sem nome"}
          </div>
          {lead.nomeReal && lead.nomeReal !== lead.name && (
            <div className="text-xs text-muted-foreground">
               {lead.nomeReal}
            </div>
          )}
          <div className="mt-1">
            {lead.phoneNumber && (
              <p className="text-sm">
                <Phone className="inline-block h-3 w-3 mr-1" />
                {lead.phoneNumber}
              </p>
            )}
            <p className="text-sm">{formattedDate}</p>
          </div>
        </div>
      </div>
    </TableCell>
  );
} 