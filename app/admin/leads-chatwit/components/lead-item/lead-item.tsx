"use client";

import { TableRow } from "@/components/ui/table";
import { LeadItemProps } from "./componentes-lead-item/types";
import { useLeadState, useDialogState, useLeadHandlers } from "./componentes-lead-item/hooks";
import { 
  SelectCell,
  InfoCell,
  UserCell,
  FilesCell,
  PdfCell,
  ImagesCell,
  ManuscritoCell,
  EspelhoCell,
  AnaliseCell,
  ConsultoriaCell,
  RowActionsCell
} from "./componentes-lead-item/cells";
import { LeadDialogs } from "./componentes-lead-item/dialogs";

export function LeadItem({
  lead,
  isSelected,
  onSelect,
  onDelete,
  onEdit,
  onUnificar,
  onConverter,
  onDigitarManuscrito,
  isUnifying,
  isConverting,
}: LeadItemProps) {
  
  // Estados do lead
  const leadState = useLeadState(lead);
  
  // Estados dos diálogos
  const dialogState = useDialogState();
  
  // Handlers e lógica
  const handlers = useLeadHandlers({
    lead,
    onEdit,
    onDelete,
    onUnificar,
    onConverter,
    onDigitarManuscrito,
    ...dialogState,
    ...leadState
  });

  return (
    <>
      <TableRow 
        className={`group hover:bg-secondary/30 ${
          leadState.consultoriaAtiva 
            ? 'border-2 border-[#AFDAFE] bg-[#4BB8EB]/10 hover:bg-[#4BB8EB]/20' 
            : ''
        }`}
      >
        {/* Célula de Seleção */}
        <SelectCell
          isSelected={isSelected}
          onSelect={onSelect}
          leadId={lead.id}
        />
        
        {/* Célula de Informações */}
        <InfoCell
          lead={lead}
          onEdit={onEdit}
          onViewDetails={handlers.handleViewDetails}
          onShowFullImage={handlers.handleShowFullImage}
        />
        
        {/* Célula do Usuário */}
        <UserCell lead={lead} onEdit={onEdit} />
        
        {/* Célula de Arquivos */}
        <FilesCell
          lead={lead}
          onEdit={onEdit}
          onDelete={onDelete}
          onContextMenuAction={handlers.handleContextMenuAction}
          onDeleteFile={handlers.handleDeleteFile}
          onReloadAfterDelete={handlers.reloadAfterDelete}
        />
        
        {/* Célula de PDF */}
        <PdfCell
          lead={lead}
          onEdit={onEdit}
          onUnificar={handlers.handleUnificarArquivos}
          isUnifying={isUnifying}
          onContextMenuAction={handlers.handleContextMenuAction}
          onDeleteFile={handlers.handleDeleteFile}
          onReloadAfterDelete={handlers.reloadAfterDelete}
        />
        
        {/* Célula de Imagens */}
        <ImagesCell
          lead={lead}
          onEdit={onEdit}
          onConverter={() => handlers.handlePdfToImages()}
          isConverting={isConverting}
          onContextMenuAction={handlers.handleContextMenuAction}
          onDeleteFile={handlers.handleDeleteFile}
          onReloadAfterDelete={handlers.reloadAfterDelete}
          onShowGallery={handlers.handleShowGallery}
        />
        
        {/* Célula de Manuscrito */}
        <ManuscritoCell
          lead={lead}
          onEdit={onEdit}
          onDigitarManuscrito={onDigitarManuscrito}
          manuscritoProcessadoLocal={leadState.manuscritoProcessadoLocal}
          isDigitando={dialogState.isDigitando}
          refreshKey={leadState.refreshKey}
          onContextMenuAction={handlers.handleContextMenuAction}
          onDigitarClick={handlers.handleDigitarClick}
        />
        
        {/* Célula de Espelho */}
        <EspelhoCell
          lead={lead}
          onEdit={onEdit}
          manuscritoProcessadoLocal={leadState.manuscritoProcessadoLocal}
          hasEspelho={leadState.hasEspelho}
          consultoriaAtiva={leadState.consultoriaAtiva}
          isEnviandoEspelho={dialogState.isEnviandoEspelho}
          isUploadingEspelho={dialogState.isUploadingEspelho}
          refreshKey={leadState.refreshKey}
          onContextMenuAction={handlers.handleContextMenuAction}
          onEspelhoClick={handlers.handleEspelhoClick}
          onOpenFileUpload={handlers.handleOpenFileUpload}
        />
        
        {/* Célula de Análise */}
        <AnaliseCell
          lead={lead}
          onEdit={onEdit}
          localAnaliseState={leadState.localAnaliseState}
          consultoriaAtiva={leadState.consultoriaAtiva}
          isEnviandoAnalise={dialogState.isEnviandoAnalise}
          refreshKey={leadState.refreshKey}
          onContextMenuAction={handlers.handleContextMenuAction}
          onAnaliseClick={handlers.handleAnaliseClick}
        />
        
        {/* Célula de Consultoria */}
        <ConsultoriaCell
          lead={lead}
          onEdit={onEdit}
          consultoriaAtiva={leadState.consultoriaAtiva}
          isUploadingEspelho={dialogState.isUploadingEspelho}
          onConsultoriaToggle={handlers.handleConsultoriaToggle}
        />
        
        {/* Célula de Ações */}
        <RowActionsCell
          lead={lead}
          onEdit={onEdit}
          onDelete={onDelete}
          onViewDetails={handlers.handleViewDetails}
          onConfirmDelete={() => dialogState.setConfirmDelete(true)}
        />
      </TableRow>

      {/* Todos os Diálogos */}
      <LeadDialogs
        lead={lead}
        convertedImages={handlers.getConvertedImages()}
        {...dialogState}
        {...leadState}
        onEdit={handlers.handleEditLead}
        onDelete={handlers.handleDelete}
        onSendSelectedImages={() => Promise.resolve()} // TODO: implementar
        onEnviarManuscrito={handlers.handleEnviarManuscrito}
        onSaveManuscrito={handlers.handleSaveManuscrito}
        onEnviarEspelho={() => Promise.resolve()} // TODO: implementar 
        onSaveEspelho={() => Promise.resolve()} // TODO: implementar
        onExcluirEspelho={handlers.handleExcluirEspelho}
        onSaveAnotacoes={() => Promise.resolve()} // TODO: implementar
        onEnviarPdf={() => Promise.resolve()} // TODO: implementar
        onCancelarAnalise={() => Promise.resolve()} // TODO: implementar
        onSaveAnalisePreliminar={() => Promise.resolve()} // TODO: implementar
        onValidarAnalise={handlers.handleValidarAnalise}
        onExecuteDeleteAllFiles={() => Promise.resolve()} // TODO: implementar
        onExecuteManuscritoDelete={handlers.handleExcluirManuscrito}
      />
    </>
  );
} 