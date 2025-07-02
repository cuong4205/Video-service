import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'USER_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'user',
          protoPath: './src/proto/user.proto',
          url: 'localhost:50000',
        },
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class UserClientsModule {}
