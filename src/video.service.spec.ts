import { Test, TestingModule } from '@nestjs/testing';
import { VideoService } from './video.service';
import { VideoRepository } from './video.repository';
import { VideoProducer } from './kafka/video.producer';
import { StreamService } from './stream/stream.service';
import { ClientGrpc } from '@nestjs/microservices';
import {
  NotFoundException,
  BadRequestException,
  StreamableFile,
} from '@nestjs/common';
import { Video } from './model/video.schema';
import { of, throwError } from 'rxjs';
import { StreamOption } from './stream/stream.option';
import { StreamResult } from './stream/stream.result';

describe('VideoService', () => {
  let service: VideoService;
  let videoRepository: jest.Mocked<VideoRepository>;
  let videoProducer: jest.Mocked<VideoProducer>;
  let streamService: jest.Mocked<StreamService>;
  let clientGrpc: jest.Mocked<ClientGrpc>;
  let mockUserService: any;

  const mockVideo: Video = {
    id: '1',
    title: 'Test Video',
    description: 'Test Description',
    filePath: '/path/to/video.mp4',
    tags: ['tag1', 'tag2'],
    owner: 'user123',
    ageConstraint: 18,
    comments: ['Great video!'],
  } as Video;

  const mockStreamResult: StreamResult = {
    stream: StreamableFile.of(Buffer.from('')),
    contentType: 'video/mp4',
    fileSize: 1000000,
  } as StreamResult;

  beforeEach(async () => {
    // Mock UserService
    mockUserService = {
      findUserById: jest.fn(),
    };

    // Mock dependencies
    const mockVideoRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByTitle: jest.fn(),
      create: jest.fn(),
      deleteByTitle: jest.fn(),
      findByOwner: jest.fn(),
      updateById: jest.fn(),
    };

    const mockVideoProducer = {
      emitVideoViewed: jest.fn(),
    };

    const mockStreamService = {
      streamFile: jest.fn(),
      getFileMetadata: jest.fn(),
    };

    const mockClientGrpc = {
      getService: jest.fn().mockReturnValue(mockUserService),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VideoService,
        {
          provide: VideoRepository,
          useValue: mockVideoRepository,
        },
        {
          provide: VideoProducer,
          useValue: mockVideoProducer,
        },
        {
          provide: StreamService,
          useValue: mockStreamService,
        },
        {
          provide: 'USER_PACKAGE',
          useValue: mockClientGrpc,
        },
      ],
    }).compile();

    service = module.get<VideoService>(VideoService);
    videoRepository = module.get(VideoRepository);
    videoProducer = module.get(VideoProducer);
    streamService = module.get(StreamService);
    clientGrpc = module.get('USER_PACKAGE');

    // Initialize the service
    service.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should initialize user service from gRPC client', () => {
      expect(clientGrpc.getService).toHaveBeenCalledWith('UserService');
    });
  });

  describe('findAll', () => {
    it('should return all videos successfully', async () => {
      const mockVideos = [mockVideo];
      videoRepository.findAll.mockResolvedValue(mockVideos);

      const result = await service.findAll();

      expect(result).toEqual({ videos: mockVideos });
      expect(videoRepository.findAll).toHaveBeenCalledTimes(1);
    });

    it('should throw error when repository fails', async () => {
      const error = new Error('Database error');
      videoRepository.findAll.mockRejectedValue(error);

      await expect(service.findAll()).rejects.toThrow('Failed to fetch videos');
    });
  });

  describe('findById', () => {
    it('should return video by ID and emit video viewed event', async () => {
      videoRepository.findById.mockResolvedValue(mockVideo);

      const result = await service.findById('1');

      expect(result).toEqual(mockVideo);
      expect(videoRepository.findById).toHaveBeenCalledWith('1');
      expect(videoProducer.emitVideoViewed).toHaveBeenCalledWith('1');
    });

    it('should throw BadRequestException when ID is not provided', async () => {
      await expect(service.findById('')).rejects.toThrow(BadRequestException);
      await expect(service.findById(null as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when video is not found', async () => {
      videoRepository.findById.mockResolvedValue(null);

      await expect(service.findById('999')).rejects.toThrow(NotFoundException);
    });

    it('should re-throw NotFoundException from repository', async () => {
      const notFoundError = new NotFoundException('Video not found');
      videoRepository.findById.mockRejectedValue(notFoundError);

      await expect(service.findById('1')).rejects.toThrow(NotFoundException);
    });

    it('should throw generic error for other repository errors', async () => {
      const error = new Error('Database error');
      videoRepository.findById.mockRejectedValue(error);

      await expect(service.findById('1')).rejects.toThrow(
        'Failed to find video',
      );
    });
  });

  describe('findByTitle', () => {
    it('should return video by title and emit video viewed event', async () => {
      videoRepository.findByTitle.mockResolvedValue(mockVideo);

      const result = await service.findByTitle('Test Video');

      expect(result).toEqual(mockVideo);
      expect(videoRepository.findByTitle).toHaveBeenCalledWith('Test Video');
      expect(videoProducer.emitVideoViewed).toHaveBeenCalledWith('1');
    });

    it('should throw BadRequestException when title is not provided', async () => {
      await expect(service.findByTitle('')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when video is not found', async () => {
      videoRepository.findByTitle.mockResolvedValue(null);

      await expect(service.findByTitle('Non-existent Video')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    const createVideoDto = {
      id: '1',
      title: 'Test Video',
      description: 'Test Description',
      filePath: '/path/to/video.mp4',
      tags: ['tag1', 'tag2'],
      owner: 'user123',
      ageConstraint: 18,
    };

    it('should create video successfully', async () => {
      videoRepository.create.mockResolvedValue(mockVideo);

      const result = await service.create(createVideoDto);

      expect(result).toEqual({ video: mockVideo });
      expect(videoRepository.create).toHaveBeenCalledWith(createVideoDto);
    });

    it('should throw error when repository fails', async () => {
      const error = new Error('Database error');
      videoRepository.create.mockRejectedValue(error);

      await expect(service.create(createVideoDto)).rejects.toThrow(
        'Failed to create video',
      );
    });
  });

  describe('deleteByTitle', () => {
    it('should delete video by title successfully', async () => {
      videoRepository.deleteByTitle.mockResolvedValue(mockVideo);

      const result = await service.deleteByTitle('Test Video');

      expect(result).toEqual(mockVideo);
      expect(videoRepository.deleteByTitle).toHaveBeenCalledWith('Test Video');
    });

    it('should throw BadRequestException when title is not provided', async () => {
      await expect(service.deleteByTitle('')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when video is not found', async () => {
      videoRepository.deleteByTitle.mockResolvedValue(null);

      await expect(service.deleteByTitle('Non-existent Video')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findVideosByOwnerId', () => {
    it('should return videos by owner ID and emit video viewed events', async () => {
      const mockVideos = [mockVideo];
      videoRepository.findByOwner.mockResolvedValue(mockVideos);

      const result = await service.findVideosByOwnerId({ id: 'user123' });

      expect(result).toEqual({ videos: mockVideos });
      expect(videoRepository.findByOwner).toHaveBeenCalledWith('user123');
      expect(videoProducer.emitVideoViewed).toHaveBeenCalledWith('1');
    });

    it('should throw error when repository fails', async () => {
      const error = new Error('Database error');
      videoRepository.findByOwner.mockRejectedValue(error);

      await expect(
        service.findVideosByOwnerId({ id: 'user123' }),
      ).rejects.toThrow('Failed to find videos by owner');
    });
  });

  describe('updateById', () => {
    const updateDto = { title: 'Updated Title' };

    it('should update video successfully', async () => {
      const updatedVideo = { ...mockVideo, title: 'Updated Title' };
      videoRepository.updateById.mockResolvedValue(updatedVideo);

      const result = await service.updateById('1', updateDto);

      expect(result).toEqual(updatedVideo);
      expect(videoRepository.updateById).toHaveBeenCalledWith('1', updateDto);
    });

    it('should throw NotFoundException when video is not found', async () => {
      videoRepository.updateById.mockResolvedValue(null);

      await expect(service.updateById('999', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should re-throw NotFoundException from repository', async () => {
      const notFoundError = new NotFoundException('Video not found');
      videoRepository.updateById.mockRejectedValue(notFoundError);

      await expect(service.updateById('1', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findUserById', () => {
    it('should return user by ID', async () => {
      const mockUser = { id: 'user123', name: 'Test User' };
      mockUserService.findUserById.mockReturnValue(of(mockUser));

      const result = await service.findUserById({ id: 'user123' });

      expect(result).toEqual(mockUser);
      expect(mockUserService.findUserById).toHaveBeenCalledWith({
        id: 'user123',
      });
    });

    it('should throw NotFoundException when user service fails', async () => {
      mockUserService.findUserById.mockReturnValue(
        throwError(new Error('User not found')),
      );

      await expect(service.findUserById({ id: 'user123' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addComment', () => {
    it('should add comment to video successfully', async () => {
      const videoWithComment = {
        ...mockVideo,
        comments: ['Great video!', 'New comment'],
      };
      videoRepository.findById.mockResolvedValue(mockVideo);
      videoRepository.updateById.mockResolvedValue(videoWithComment);

      const result = await service.addComment('1', 'New comment');

      expect(result).toEqual(videoWithComment);
      expect(videoRepository.updateById).toHaveBeenCalledWith('1', {
        comments: ['Great video!', 'New comment'],
      });
    });

    it('should throw error when video is not found', async () => {
      videoRepository.findById.mockResolvedValue(null);

      await expect(service.addComment('999', 'New comment')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('streamVideoById', () => {
    it('should stream video by ID and emit video viewed event', async () => {
      const streamOptions: StreamOption = { start: 0, end: 1000 };
      videoRepository.findById.mockResolvedValue(mockVideo);
      streamService.streamFile.mockResolvedValue(mockStreamResult);

      const result = await service.streamVideoById('1', streamOptions);

      expect(result).toEqual(mockStreamResult);
      expect(streamService.streamFile).toHaveBeenCalledWith(
        '/path/to/video.mp4',
        streamOptions,
      );
      expect(videoProducer.emitVideoViewed).toHaveBeenCalledWith('1');
    });

    it('should use default options when none provided', async () => {
      videoRepository.findById.mockResolvedValue(mockVideo);
      streamService.streamFile.mockResolvedValue(mockStreamResult);

      await service.streamVideoById('1');

      expect(streamService.streamFile).toHaveBeenCalledWith(
        '/path/to/video.mp4',
        {},
      );
    });

    it('should throw error when video is not found', async () => {
      videoRepository.findById.mockResolvedValue(null);

      await expect(service.streamVideoById('999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getVideoFileMetadata', () => {
    it('should return video and file metadata', async () => {
      const mockMetadata = { size: 1000000, duration: 120 };
      videoRepository.findById.mockResolvedValue(mockVideo);
      streamService.getFileMetadata.mockResolvedValue(mockMetadata);

      const result = await service.getVideoFileMetadata('1');

      expect(result).toEqual({
        video: mockVideo,
        file: mockMetadata,
      });
      expect(streamService.getFileMetadata).toHaveBeenCalledWith(
        '/path/to/video.mp4',
      );
    });

    it('should throw error when video is not found', async () => {
      videoRepository.findById.mockResolvedValue(null);

      await expect(service.getVideoFileMetadata('999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
