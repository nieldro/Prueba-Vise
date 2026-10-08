import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

/**
 * Traduce los errores conocidos de Prisma a codigos HTTP correctos para que
 * ningún detalle interno de la base de datos llegue al cliente.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { status, message } = this.translate(exception);

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`${exception.code}: ${exception.message}`);
    }

    response.status(status).json({ statusCode: status, message, error: HttpStatus[status] });
  }

  private translate(e: Prisma.PrismaClientKnownRequestError): { status: number; message: string } {
    switch (e.code) {
      case 'P2002':
        return { status: HttpStatus.CONFLICT, message: 'Ya existe un registro con ese valor único' };
      case 'P2003':
        return {
          status: HttpStatus.CONFLICT,
          message: 'La operación viola una relación con otros registros',
        };
      case 'P2025':
        return { status: HttpStatus.NOT_FOUND, message: 'El registro solicitado no existe' };
      default:
        return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Error interno del servidor' };
    }
  }
}
