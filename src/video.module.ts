import { Module } from '@nestjs/common';
import { VideoService } from './video.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Video, VideoSchema } from './model/video.schema';
import { VideoController } from './video.controller';
import { VideoClientsModule } from './gRPC-client/video-client.module';
import { CustomEsModule } from './elasticsearch/elasticsearch.module';
import { RedisModule } from './redis/redis.module';
import { VideoDatabaseModule } from './mongodb/database.module';
import { UserClientsModule } from './gRPC-client/user-client.module';
import mongoConfig from './mongodb/database.config';
import { ConfigModule } from '@nestjs/config';
import { VideoRepository } from './video.repository';
import { VideoGrpcController } from './video-grpc.controller';
import { KafkaModule } from './kafka/kafka.module';
import { VideoProducer } from './kafka/video.producer';
import { VideoConsumer } from './kafka/video.consumer';
import { StreamService } from './stream/stream.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Video.name, schema: VideoSchema }]),
    CustomEsModule,
    RedisModule,
    VideoDatabaseModule,
    VideoClientsModule,
    UserClientsModule,
    KafkaModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [mongoConfig],
    }),
  ],
  controllers: [VideoController, VideoGrpcController, VideoConsumer],
  providers: [VideoService, VideoRepository, VideoProducer, StreamService],
  exports: [VideoService],
})
export class VideoModule {}
