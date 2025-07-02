import { Module } from '@nestjs/common';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { CustomEsService } from './elasticsearch.service';

@Module({
  imports: [
    ElasticsearchModule.register({
      node: 'http://localhost:9200',
    }),
  ],
  providers: [CustomEsService],
  exports: [CustomEsService],
})
export class CustomEsModule {}
