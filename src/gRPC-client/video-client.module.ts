import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'VIDEO_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'video',
          protoPath: './src/proto/video.proto',
          url: 'localhost:50001',
        },
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class VideoClientsModule {}
