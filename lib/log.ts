/**
 * Módulo simples de logs para a aplicação
 */

// Interface para os métodos do logger
interface Logger {
  info(message: string): void;
  error(message: string): void;
  warn(message: string): void;
  debug(message: string): void;
}

/**
 * Logger simples que escreve no console com timestamps e cores
 */
class ConsoleLogger implements Logger {
  info(message: string): void {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`);
  }

  error(message: string): void {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`);
  }

  warn(message: string): void {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`);
  }

  debug(message: string): void {
    console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`);
  }
}

// Exportar uma instância do logger
const log = new ConsoleLogger();

export default log; 