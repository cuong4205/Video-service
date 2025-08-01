import { NestFactory } from '@nestjs/core';
import { VideoModule } from './video.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { logger } from './logger';

async function bootstrap() {
  const app = await NestFactory.create(VideoModule, { logger });
  app.connectMicroservice({
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: ['localhost:9092'],
      },
      consumer: {
        groupId: 'video-consumer-group',
      },
    },
  });

  app.enableCors();

  await app.startAllMicroservices();
  await app.listen(3001);
  console.log('HTTP User Service is running on localhost:3001');
  const grpcApp = await NestFactory.createMicroservice<MicroserviceOptions>(
    VideoModule,
    {
      transport: Transport.GRPC,
      options: {
        package: 'video',
        protoPath: './src/proto/video.proto',
        url: 'localhost:50001',
      },
    },
  );
  await grpcApp.listen();
  console.log('gRPC Video Service is running on localhost:50001');
}
void bootstrap();
