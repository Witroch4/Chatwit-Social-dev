/**
 * Configurações especiais para templates problemáticos
 * Este arquivo contém definições para templates que precisam de tratamento especial
 */

interface TemplateConfig {
  hasCopyCodeButton: boolean;
  copyCodeButtonIndex: number;
  defaultCouponCode: string;
  hasFooter: boolean;
  requiresButtonText?: boolean;
}

interface ProblematicTemplatesConfig {
  [templateName: string]: TemplateConfig;
}

/**
 * Templates que precisam de tratamento especial devido a problemas na API
 * ou estrutura não padrão que não conseguimos detectar automaticamente
 */
export const problematicTemplates: ProblematicTemplatesConfig = {
  // Template com botão copy_code que não é detectado corretamente
  'novo_teste_de_template_via_sistema222retre': {
    hasCopyCodeButton: true,
    copyCodeButtonIndex: 0,
    defaultCouponCode: 'CODE123',
    hasFooter: false,
    requiresButtonText: false
  }
};

/**
 * Verifica se um template está na lista de templates problemáticos
 */
export function isProblematicTemplate(templateName: string): boolean {
  return templateName in problematicTemplates;
}

/**
 * Obtém a configuração para um template problemático
 * @returns A configuração do template ou null se não for problemático
 */
export function getProblematicTemplateConfig(templateName: string): TemplateConfig | null {
  if (isProblematicTemplate(templateName)) {
    return problematicTemplates[templateName];
  }
  return null;
} 