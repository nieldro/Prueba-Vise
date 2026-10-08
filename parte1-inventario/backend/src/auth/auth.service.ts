import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { BCRYPT_ROUNDS } from './auth.constants';

export interface LoginResult {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: AuthUser;
}

/** Hash valido para gastar el mismo tiempo cuando el correo no existe (evita enumerar usuarios). */
const DUMMY_HASH = bcrypt.hashSync('contrasena-de-relleno', BCRYPT_ROUNDS);

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string): Promise<LoginResult> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !valid) throw new UnauthorizedException('Credenciales inválidas');

    const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email });
    const { exp, iat } = this.jwt.decode<{ exp: number; iat: number }>(accessToken);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: exp - iat,
      user: { id: user.id, email: user.email, name: user.name },
    };
  }
}
