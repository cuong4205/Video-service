import { Inject, Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';

@Injectable()
export class VideoProducer {
  constructor(@Inject('KAFKA_SERVICE') private readonly client: ClientKafka) {}

  async onModuleInit() {
    this.client.subscribeToResponseOf('video_viewed');
    await this.client.connect();
  }

  emitVideoViewed(videoId: string) {
    this.client.emit('video_viewed', { videoId });
  }
}
