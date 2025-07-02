import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type VideoDocument = Video & Document;

@Schema({ timestamps: true })
export class Video {
  @Prop({ unique: true })
  id: string;

  @Prop({ unique: true, index: true })
  title: string;

  @Prop()
  description: string;

  @Prop()
  url: string;

  @Prop()
  comments: string[];

  @Prop()
  tags: string[];

  @Prop()
  ageConstraint: number;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  owner: string;

  @Prop({ default: 0 })
  viewCount: number;
}

export const VideoSchema = SchemaFactory.createForClass(Video);
