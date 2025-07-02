import { Injectable, NotFoundException } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';

@Injectable()
export class CustomEsService {
  constructor(private readonly esClient: ElasticsearchService) {}

  async index(index: string, id: string, data: Record<string, unknown>) {
    const esIndex = await this.esClient.index({
      index,
      id,
      document: data,
    });
    if (!esIndex) {
      throw new NotFoundException('index not found');
    }
    return esIndex;
  }

  async update(index: string, id: string, data: Record<string, unknown>) {
    const esIndex = await this.esClient.update({
      index,
      id,
      doc: data,
    });
    if (!esIndex) {
      throw new NotFoundException('index not found');
    }
    return esIndex;
  }

  async delete(index: string, id: string) {
    const esIndex = await this.esClient.delete({
      index,
      id,
    });
    if (!esIndex) {
      throw new NotFoundException('index not found');
    }
    return esIndex;
  }

  async search(index: string, query: Record<string, unknown>) {
    const esIndex = await this.esClient.search({
      index,
      body: query,
    });
    if (!esIndex) {
      throw new NotFoundException('index not found');
    }
    return esIndex;
  }

  async get(index: string, id: string) {
    const esIndex = await this.esClient.get({
      index,
      id,
    });
    if (!esIndex) {
      throw new NotFoundException('index not found');
    }
    return esIndex;
  }
}
