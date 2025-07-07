import { Inject, Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';

@Injectable()
export class VideoProducer {
  constructor(@Inject('KAFKA_SERVICE') private readonly client: ClientKafka) {}

  async onModuleInit() {
    this.client.subscribeToResponseOf('video.viewed');
    await this.client.connect();
    console.log('VideoProducer initialized');
  }

  emitVideoViewed(videoId: string) {
    this.client.emit('video.viewed', { videoId });
    console.log('Video viewed event emitted:', videoId);
  }
}
