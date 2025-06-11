import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, Play, Pause, X, CheckCircle2, AlertCircle } from "lucide-react";
import { BatchProcessState } from "./lead-item/componentes-lead-item/hooks/useBatchProcessor";

interface BatchProgressDialogProps {
  isOpen: boolean;
  onClose: () => void;
  state: BatchProcessState;
  onCancel: () => void;
  onContinue?: () => void;
}

export function BatchProgressDialog({
  isOpen,
  onClose,
  state,
  onCancel,
  onContinue,
}: BatchProgressDialogProps) {
  const progressPercentage = state.totalCount > 0 
    ? Math.round((state.processedCount / state.totalCount) * 100)
    : 0;

  const getStatusIcon = () => {
    if (state.isProcessing && !state.isPaused) {
      return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
    }
    if (state.isPaused) {
      return <Pause className="h-5 w-5 text-yellow-500" />;
    }
    if (state.processedCount === state.totalCount && state.totalCount > 0) {
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    }
    return <AlertCircle className="h-5 w-5 text-gray-500" />;
  };

  const getStatusColor = () => {
    if (state.isProcessing && !state.isPaused) return "bg-blue-500";
    if (state.isPaused) return "bg-yellow-500";
    if (state.processedCount === state.totalCount && state.totalCount > 0) return "bg-green-500";
    return "bg-gray-400";
  };

  const getStatusText = () => {
    if (state.isPaused && state.pauseReason === 'manuscrito') {
      return "Pausado - Aguardando processamento de manuscritos";
    }
    if (state.isPaused && state.pauseReason === 'espelho') {
      return "Pausado - Aguardando processamento de espelhos";
    }
    if (state.isProcessing) {
      return "Processando...";
    }
    if (state.processedCount === state.totalCount && state.totalCount > 0) {
      return "Processamento concluído";
    }
    return "Preparando processamento";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getStatusIcon()}
            Processamento em Lote
          </DialogTitle>
          <DialogDescription>
            {getStatusText()}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-4">
          {/* Barra de progresso */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progresso</span>
              <span>{state.processedCount} de {state.totalCount}</span>
            </div>
            <Progress 
              value={progressPercentage} 
              className="w-full"
            />
            <div className="text-xs text-center text-muted-foreground">
              {progressPercentage}% concluído
            </div>
          </div>

          {/* Status atual */}
          <div className="bg-muted/50 p-3 rounded-md">
            <div className="text-sm font-medium mb-1">Status Atual</div>
            <div className="text-sm text-muted-foreground">
              {state.currentStep}
            </div>
          </div>

          {/* Informações sobre pausas */}
          {state.isPaused && (
            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-md">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <div className="font-medium text-yellow-800 mb-1">
                    Ação Necessária
                  </div>
                  <div className="text-yellow-700">
                    {state.pauseReason === 'manuscrito' 
                      ? `${state.leadsNeedingManuscrito.length} leads precisam de manuscrito. Os dialogs serão abertos sequencialmente.`
                      : state.pauseReason === 'espelho'
                      ? `${state.leadsNeedingEspelho.length} leads precisam de espelho. Os dialogs serão abertos sequencialmente.`
                      : "O processamento foi pausado e requer ação manual."
                    }
                  </div>
                  <div className="text-xs text-yellow-600 mt-2">
                    💡 Execute o processamento novamente após concluir as ações manuais.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Lista de leads processados */}
          {state.leadsNeedingManuscrito.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Leads aguardando manuscrito:</div>
              <div className="max-h-32 overflow-y-auto bg-muted/30 p-2 rounded text-xs space-y-1">
                {state.leadsNeedingManuscrito.map((lead, index) => (
                  <div key={lead.id} className="flex items-center gap-2">
                    <span className="w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center text-white text-xs">
                      {index + 1}
                    </span>
                    <span>{lead.nomeReal || lead.name || `Lead ${lead.id}`}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {state.leadsNeedingEspelho.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Leads aguardando espelho:</div>
              <div className="max-h-32 overflow-y-auto bg-muted/30 p-2 rounded text-xs space-y-1">
                {state.leadsNeedingEspelho.map((lead, index) => (
                  <div key={lead.id} className="flex items-center gap-2">
                    <span className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                      {index + 1}
                    </span>
                    <span>{lead.nomeReal || lead.name || `Lead ${lead.id}`}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {state.isProcessing ? (
            <Button 
              variant="destructive" 
              onClick={onCancel}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Cancelar
            </Button>
          ) : state.isPaused && onContinue ? (
            <>
              <Button variant="outline" onClick={onClose}>
                Fechar
              </Button>
              <Button 
                onClick={onContinue}
                className="flex items-center gap-2"
              >
                <Play className="h-4 w-4" />
                Continuar Depois
              </Button>
            </>
          ) : (
            <Button onClick={onClose}>
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 