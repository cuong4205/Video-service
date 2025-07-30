import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'AUTH_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'auth',
          protoPath: './src/proto/auth.proto',
          url: 'localhost:50002',
        },
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class AuthClientsModule {}
