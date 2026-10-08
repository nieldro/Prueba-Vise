import { plainToInstance } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Max, Min, MinLength, validateSync } from 'class-validator';

/** Variables de entorno obligatorias. La app no arranca si alguna falta o es inválida. */
class EnvironmentVariables {
  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  @IsString()
  @MinLength(32, { message: 'JWT_SECRET debe tener al menos 32 caracteres' })
  JWT_SECRET: string;

  @IsString()
  @IsNotEmpty()
  JWT_EXPIRES_IN: string = '1h';

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  @IsString()
  @IsNotEmpty()
  CORS_ORIGIN: string = 'http://localhost:5173';

  @IsInt()
  @Min(0)
  LOW_STOCK_THRESHOLD: number = 10;

  @IsString()
  @IsNotEmpty()
  TZ_NAME: string = 'America/Bogota';
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    const detail = errors.map((e) => Object.values(e.constraints ?? {}).join(', ')).join('; ');
    throw new Error(`Configuración de entorno inválida: ${detail}`);
  }
  return validated;
}
