/* eslint-disable @typescript-eslint/require-await */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  StreamableFile,
} from '@nestjs/common';
import { createReadStream, statSync, existsSync } from 'fs';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import { FileMetadata } from './fileMetaData';
import { StreamOption } from './stream.option';
import { StreamResult } from './stream.result';

@Injectable()
export class StreamService {
  private readonly uploadsPath: string;
  private readonly videosPath: string;

  constructor(private readonly configService: ConfigService) {
    this.uploadsPath =
      this.configService.get<string>('UPLOADS_PATH') || 'uploads';
    this.videosPath = join(this.uploadsPath, 'videos');
  }

  async streamFile(
    filePath: string,
    options: StreamOption = {},
  ): Promise<StreamResult> {
    const fullPath = this.getFullPath(filePath);
    const metadata = await this.getFileMetadata(fullPath);

    if (!metadata.exists) {
      throw new NotFoundException(`Video file not found: ${filePath}`);
    }

    const { start = 0, end = metadata.size - 1 } = options;

    this.validateRange(start, end, metadata.size);

    const stream = createReadStream(fullPath, { start, end });

    return {
      stream: new StreamableFile(stream),
      contentLength: end - start + 1,
      contentType: metadata.contentType,
      acceptRanges: true,
      start,
      end,
      totalSize: metadata.size,
    };
  }

  async getFileMetadata(filePath: string): Promise<FileMetadata> {
    const fullPath = this.getFullPath(filePath);
    const exists = existsSync(fullPath);

    if (!exists) {
      return {
        path: fullPath,
        size: 0,
        contentType: 'application/octet-stream',
        exists: false,
      };
    }

    const stats = statSync(fullPath);

    return {
      path: fullPath,
      size: stats.size,
      contentType: this.getContentType(filePath),
      exists: true,
    };
  }

  parseRangeHeader(
    rangeHeader: string,
    fileSize: number,
  ): { start: number; end: number } {
    const parts = rangeHeader.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10) || 0;
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    return { start, end };
  }

  generateContentRange(start: number, end: number, totalSize: number): string {
    return `bytes ${start}-${end}/${totalSize}`;
  }

  async fileExists(filePath: string): Promise<boolean> {
    const fullPath = this.getFullPath(filePath);
    return existsSync(fullPath);
  }

  async getFileSize(filePath: string): Promise<number> {
    const fullPath = this.getFullPath(filePath);

    if (!existsSync(fullPath)) {
      throw new NotFoundException(`File not found: ${filePath}`);
    }

    const stats = statSync(fullPath);
    return stats.size;
  }

  private validateRange(start: number, end: number, fileSize: number): void {
    if (start < 0 || end < 0) {
      throw new BadRequestException('Range values cannot be negative');
    }

    if (start >= fileSize) {
      throw new BadRequestException('Start position exceeds file size');
    }

    if (end >= fileSize) {
      throw new BadRequestException('End position exceeds file size');
    }

    if (start > end) {
      throw new BadRequestException(
        'Start position cannot be greater than end position',
      );
    }
  }

  private getFullPath(filePath: string): string {
    // Sanitize file path to prevent directory traversal
    const sanitizedPath = filePath.replace(/\.\./g, '').replace(/\\/g, '/');
    return join(process.cwd(), this.videosPath, sanitizedPath);
  }

  private getContentType(filePath: string): string {
    const extension = filePath.split('.').pop()?.toLowerCase();
    if (!extension) {
      throw new BadRequestException('Invalid file extension');
    }

    const mimeTypes: Record<string, string> = {
      mp4: 'video/mp4',
      webm: 'video/webm',
      ogg: 'video/ogg',
      ogv: 'video/ogg',
      avi: 'video/x-msvideo',
      mov: 'video/quicktime',
      mkv: 'video/x-matroska',
      flv: 'video/x-flv',
    };

    return mimeTypes[extension] || 'video/mp4';
  }
}
