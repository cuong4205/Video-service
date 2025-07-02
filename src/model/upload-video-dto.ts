import { IsString, IsOptional } from 'class-validator';
import { Prop } from '@nestjs/mongoose';

export class UploadVideoDto {
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
  url: string;

  @Prop()
  ageConstraint: number;

  @Prop()
  tags: string[];

  @Prop()
  owner: string;
}
