import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
  OnModuleInit,
} from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Observable, firstValueFrom } from 'rxjs';
import { Request } from 'express'; // Import Request type từ express

interface AuthGrpcService {
  validateToken(data: { token: string }): Observable<{
    valid: boolean;
    userId: string;
    email: string;
    age: number;
  }>;
}

@Injectable()
export class JwtRemoteAuthGuard implements CanActivate, OnModuleInit {
  private authService: AuthGrpcService;

  constructor(@Inject('AUTH_PACKAGE') private client: ClientGrpc) {}

  onModuleInit() {
    this.authService = this.client.getService<AuthGrpcService>('AuthService');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const authHeader = request.headers.authorization;

    const token = authHeader?.split(' ')[1];

    if (!token) {
      throw new UnauthorizedException('Token missing');
    }

    const result = await firstValueFrom(
      this.authService.validateToken({ token }),
    );

    if (!result.valid) {
      throw new UnauthorizedException('Token invalid');
    }

    request.user = {
      id: result.userId,
      email: result.email,
      age: result.age,
    };

    return true;
  }
}
