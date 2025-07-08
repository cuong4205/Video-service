import { StreamableFile } from '@nestjs/common/file-stream/streamable-file';

export interface StreamResult {
  stream: StreamableFile;
  contentLength: number;
  contentType: string;
  acceptRanges: boolean;
  start: number;
  end: number;
  totalSize: number;
}
