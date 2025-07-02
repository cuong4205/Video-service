import { Module } from '@nestjs/common';
import { VideoService } from './video.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Video, VideoSchema } from './model/video.schema';
import { VideoController } from './video.controller';
import { VideoClientsModule } from './video-client.module';
import { CustomEsModule } from './elasticsearch/elasticsearch.module';
import { RedisModule } from './redis/redis.module';
import { VideoDatabaseModule } from './mongodb/database.module';
import { UserClientsModule } from './user-client.module';
import mongoConfig from './mongodb/database.config';
import { ConfigModule } from '@nestjs/config';
import { VideoRepository } from './video.repository';
import { VideoGrpcController } from './video-grpc.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Video.name, schema: VideoSchema }]),
    CustomEsModule,
    RedisModule,
    VideoDatabaseModule,
    VideoClientsModule,
    UserClientsModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [mongoConfig],
    }),
  ],
  controllers: [VideoController, VideoGrpcController],
  providers: [VideoService, VideoRepository],
  exports: [VideoService],
})
export class VideoModule {}
