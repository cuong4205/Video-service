import { IsString, IsOptional } from 'class-validator';
import { Prop } from '@nestjs/mongoose';

export class VideoDto {
  @IsString()
  @IsOptional()
  @Prop()
  id: string;

  @IsString()
  @Prop()
  title: string;

  @IsString()
  @Prop()
  description: string;

  @Prop()
  filePath: string;

  @Prop()
  ageConstraint: number;

  @Prop()
  tags: string[];

  @Prop()
  owner: string;
}
