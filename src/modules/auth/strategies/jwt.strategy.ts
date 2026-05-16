import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { UsersService } from '../../users/services/users.service';
import { RedisService } from '../../../common/redis/redis.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly usersService: UsersService,
    private readonly redisService: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('jwt.secret'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload): Promise<User> {
    if (payload.jti) {
      const blacklisted = await this.redisService.get(
        `blacklist:${payload.jti}`,
      );
      if (blacklisted) throw new UnauthorizedException();
    }

    req.tokenJti = payload.jti;
    req.tokenExp = payload.exp;

    try {
      return await this.usersService.findById(payload.sub);
    } catch {
      throw new UnauthorizedException();
    }
  }
}
