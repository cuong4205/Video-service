import {
  Injectable,
  NotFoundException,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { Video } from './model/video.schema';
import { VideoRepository } from './video.repository';
import { Observable, of } from 'rxjs';
import { ClientGrpc } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';

interface UserServiceInterface {
  findUserById(request: { id: string }): Observable<any>;
}

@Injectable()
export class VideoService {
  private userService: UserServiceInterface;

  constructor(
    private readonly videoRepository: VideoRepository,
    @Inject('USER_PACKAGE') private client: ClientGrpc,
  ) {}

  onModuleInit() {
    this.userService =
      this.client.getService<UserServiceInterface>('UserService');
  }

  async findAll(): Promise<Video[]> {
    try {
      return await this.videoRepository.findAll();
    } catch (error) {
      console.error('Error fetching all videos:', error);
      throw new Error('Failed to fetch videos');
    }
  }

  async findById(id: string): Promise<Video> {
    if (!id) {
      throw new BadRequestException('Video ID is required');
    }

    try {
      const result = await this.videoRepository.findById(id);
      if (!result) {
        throw new NotFoundException(`Video with ID ${id} not found`);
      }
      return result;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error(`Error finding video by ID ${id}:`, error);
      throw new Error('Failed to find video');
    }
  }

  async findByTitle(title: string): Promise<Video> {
    if (!title) {
      throw new BadRequestException('Video ID is required');
    }
    try {
      const result = await this.videoRepository.findByTitle(title);
      if (!result) {
        throw new NotFoundException(`Video with ID ${title} not found`);
      }
      return result;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error(`Error finding video by ID ${title}:`, error);
      throw new Error('Failed to find video');
    }
  }

  async create(video: Partial<Video>): Promise<Video> {
    if (!video.title || !video.owner) {
      throw new BadRequestException('Video title and owner ID are required');
    }

    try {
      return await this.videoRepository.create(video);
    } catch (error) {
      console.error('Error creating video:', error);
      throw new Error('Failed to create video');
    }
  }

  async deleteByTitle(title: string): Promise<Video> {
    if (!title) {
      throw new BadRequestException('Video title is required');
    }

    try {
      const deletedVideo = await this.videoRepository.deleteByTitle(title);
      if (!deletedVideo) {
        throw new NotFoundException(`Video with title "${title}" not found`);
      }
      return deletedVideo;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error(`Error deleting video by title ${title}:`, error);
      throw new Error('Failed to delete video');
    }
  }

  async findVideosByOwnerIdGrpc(request: { id: string }): Promise<Video[]> {
    try {
      const videos = await this.videoRepository.findByOwner(request.id);
      return videos; // Return empty array if no videos found
    } catch (error) {
      console.log(request);
      console.error(`Error finding videos by owner ${request.id}:`, error);
      throw new Error('Failed to find videos by owner');
    }
  }

  async updateById(
    id: string,
    updateVideoDto: Partial<Video>,
  ): Promise<Video | null> {
    try {
      const updatedVideo = await this.videoRepository.updateById(
        id,
        updateVideoDto,
      );
      if (!updatedVideo) {
        throw new NotFoundException(`Video with ID ${id} not found`);
      }
      return updatedVideo;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error(`Error updating video ${id}:`, error);
      throw new Error('Failed to update video');
    }
  }

  async findUserById(id: string): Promise<any> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const result = await lastValueFrom(this.userService.findUserById({ id }));
    console.log(id);
    try {
      return result;
    } catch (error) {
      console.error(`Error finding user by ID ${id}:`, error);
      console.log(result);
      throw new NotFoundException('User not found');
    }
  }

  async addComment(id: string, comment: string): Promise<any> {
    try {
      const video = await this.findById(id);
      video.comments.push(comment);
      return await this.videoRepository.updateById(id, {
        comments: video.comments,
      });
    } catch (error) {
      console.error(`Error adding comment to video ${id}:`, error);
      throw new Error('Failed to add comment to video');
    }
  }

  testGrpc(message: string): Observable<any> {
    return of({ message: 'Hello from VideoService!' + message });
  }
}
