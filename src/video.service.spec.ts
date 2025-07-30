/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { VideoService } from './video.service';
import { VideoRepository } from './video.repository';
import { StreamService } from './stream/stream.service';
import { Video } from './model/video.schema';
import { VideoProducer } from './kafka/video.producer';

describe('VideoService', () => {
  let service: VideoService;
  let videoRepository: jest.Mocked<VideoRepository>;
  let videoProducer: jest.Mocked<VideoProducer>;

  const mockVideo: Video = {
    id: 'v123',
    title: 'Test Video',
    description: 'Test Description',
    filePath: '/path/to/video.mp4',
    tags: ['test', 'video'],
    owner: '507f1f77bcf86cd799439012',
    ageConstraint: 18,
  } as Video;

  const mockVideos: Video[] = [
    mockVideo,
    {
      id: 'v111',
      title: 'Another Video',
      description: 'Another Description',
      filePath: '/path/to/another.mp4',
      tags: ['another', 'test'],
      owner: '507f1f77bcf86cd799439014',
      ageConstraint: 0,
    } as Video,
  ];

  beforeEach(async () => {
    const mockVideoRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByTitle: jest.fn(),
      upload: jest.fn(),
      deleteByTitle: jest.fn(),
      findByOwner: jest.fn(),
      updateById: jest.fn(),
      addComment: jest.fn(),
      getTopVideo: jest.fn(),
      getTimeBasedLeaderboard: jest.fn(),
    };

    const mockStreamService = {
      streamFile: jest.fn(),
      getFileMetadata: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VideoService,
        {
          provide: VideoRepository,
          useValue: mockVideoRepository,
        },
        {
          provide: StreamService,
          useValue: mockStreamService,
        },
        {
          provide: 'USER_PACKAGE',
          useValue: {
            getService: jest.fn(),
          },
        },
        {
          provide: VideoProducer,
          useValue: {
            emitVideoViewed: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<VideoService>(VideoService);
    videoRepository = module.get(VideoRepository);
  });

  describe('findAll', () => {
    it('should throw error when repository fails', async () => {
      const errorMessage = 'Database connection failed';
      videoRepository.findAll.mockRejectedValue(new Error(errorMessage));

      await expect(service.findAll()).rejects.toThrow('Failed to fetch videos');
      expect(videoRepository.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('findById', () => {
    it('should return mock video when provided correct id', async () => {
      videoRepository.findById.mockResolvedValue(mockVideo);

      const result = await service.findById(mockVideo.id);
      expect(result).toBe(mockVideo);
      expect(videoRepository.findById).toHaveBeenCalledWith(mockVideo.id);
    });

    it('should throw BadRequestException when id is not provided', async () => {
      await expect(service.findById('')).rejects.toThrow(BadRequestException);
      await expect(service.findById(null as any)).rejects.toThrow(
        BadRequestException,
      );
      expect(videoRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when video not found', async () => {
      videoRepository.findById.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      expect(videoRepository.findById).toHaveBeenCalledWith('nonexistent');
    });

    it('should throw generic error when repository fails', async () => {
      videoRepository.findById.mockRejectedValue(new Error('Database error'));

      await expect(service.findById(mockVideo.id)).rejects.toThrow(
        'Failed to find video',
      );
      expect(videoRepository.findById).toHaveBeenCalledWith(mockVideo.id);
    });
  });

  describe('findByTitle', () => {
    it('should return video when found by title', async () => {
      videoRepository.findByTitle.mockResolvedValue(mockVideo);

      const result = await service.findByTitle(mockVideo.title);

      expect(result).toEqual(mockVideo);
      expect(videoRepository.findByTitle).toHaveBeenCalledWith(mockVideo.title);
    });

    it('should throw BadRequestException when title is not provided', async () => {
      await expect(service.findByTitle('')).rejects.toThrow(
        BadRequestException,
      );
      expect(videoRepository.findByTitle).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when video not found', async () => {
      videoRepository.findByTitle.mockResolvedValue(null);

      await expect(service.findByTitle('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      expect(videoRepository.findByTitle).toHaveBeenCalledWith('nonexistent');
    });

    it('should throw generic error when repository fails', async () => {
      videoRepository.findByTitle.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.findByTitle(mockVideo.title)).rejects.toThrow(
        'Failed to find video',
      );
      expect(videoRepository.findByTitle).toHaveBeenCalledWith(mockVideo.title);
    });
  });

  describe('upload', () => {
    const createVideoDto = {
      id: mockVideo.id,
      title: mockVideo.title,
      description: mockVideo.description,
      filePath: mockVideo.filePath,
      tags: mockVideo.tags,
      owner: mockVideo.owner,
      ageConstraint: mockVideo.ageConstraint,
    };

    it('should create video successfully', async () => {
      videoRepository.upload.mockResolvedValue(mockVideo);

      const result = await service.upload(createVideoDto);

      expect(result).toEqual({ video: mockVideo });
      expect(videoRepository.upload).toHaveBeenCalledWith(createVideoDto);
    });

    it('should throw error when repository fails', async () => {
      videoRepository.upload.mockRejectedValue(new Error('Validation failed'));

      await expect(service.upload(createVideoDto)).rejects.toThrow(
        'Failed to create video',
      );
      expect(videoRepository.upload).toHaveBeenCalledWith(createVideoDto);
    });
  });

  describe('deleteByTitle', () => {
    it('should delete video successfully', async () => {
      videoRepository.deleteByTitle.mockResolvedValue(mockVideo);

      const result = await service.deleteByTitle(mockVideo.title);

      expect(result).toEqual(mockVideo);
      expect(videoRepository.deleteByTitle).toHaveBeenCalledWith(
        mockVideo.title,
      );
    });

    it('should throw BadRequestException when title is not provided', async () => {
      await expect(service.deleteByTitle('')).rejects.toThrow(
        BadRequestException,
      );
      expect(videoRepository.deleteByTitle).not.toHaveBeenCalled();
    });

    it('should throw generic error when repository fails', async () => {
      videoRepository.deleteByTitle.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.deleteByTitle(mockVideo.title)).rejects.toThrow(
        'Failed to delete video',
      );
      expect(videoRepository.deleteByTitle).toHaveBeenCalledWith(
        mockVideo.title,
      );
    });
  });

  describe('findVideosByOwnerId', () => {
    const ownerRequest = { id: mockVideo.owner };

    it('should return videos by owner id', async () => {
      const ownerVideos = [mockVideo];
      videoRepository.findByOwner.mockResolvedValue(ownerVideos);

      const result = await service.findVideosByOwnerId(ownerRequest);

      expect(result).toEqual({ videos: ownerVideos });
      expect(videoRepository.findByOwner).toHaveBeenCalledWith(ownerRequest.id);
    });

    it('should return empty array when no videos found', async () => {
      videoRepository.findByOwner.mockResolvedValue([]);

      const result = await service.findVideosByOwnerId(ownerRequest);

      expect(result).toEqual({ videos: [] });
      expect(videoRepository.findByOwner).toHaveBeenCalledWith(ownerRequest.id);
    });

    it('should throw error when repository fails', async () => {
      videoRepository.findByOwner.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.findVideosByOwnerId(ownerRequest)).rejects.toThrow(
        'Failed to find videos by owner',
      );
      expect(videoRepository.findByOwner).toHaveBeenCalledWith(ownerRequest.id);
    });
  });

  describe('updateById', () => {
    const updateDto = {
      title: 'Updated Title',
      description: 'Updated Description',
    };

    it('should update video successfully', async () => {
      const updatedVideo = { ...mockVideo, ...updateDto };
      videoRepository.updateById.mockResolvedValue(updatedVideo);

      const result = await service.updateById(mockVideo.id, updateDto);

      expect(result).toEqual(updatedVideo);
      expect(videoRepository.updateById).toHaveBeenCalledWith(
        mockVideo.id,
        updateDto,
      );
    });

    it('should throw NotFoundException when video not found', async () => {
      videoRepository.updateById.mockResolvedValue(null);

      await expect(
        service.updateById('nonexistent', updateDto),
      ).rejects.toThrow(NotFoundException);
      expect(videoRepository.updateById).toHaveBeenCalledWith(
        'nonexistent',
        updateDto,
      );
    });

    it('should throw generic error when repository fails', async () => {
      videoRepository.updateById.mockRejectedValue(new Error('Database error'));

      await expect(service.updateById(mockVideo.id, updateDto)).rejects.toThrow(
        'Failed to update video',
      );
      expect(videoRepository.updateById).toHaveBeenCalledWith(
        mockVideo.id,
        updateDto,
      );
    });
  });

  describe('addComment', () => {
    const comment = 'This is a test comment';

    it('should add comment successfully', async () => {
      videoRepository.addComment.mockResolvedValue(undefined);

      await service.addComment(mockVideo.id, comment);

      expect(videoRepository.addComment).toHaveBeenCalledWith(
        mockVideo.id,
        comment,
      );
    });

    it('should throw error when repository fails', async () => {
      videoRepository.addComment.mockRejectedValue(new Error('Database error'));

      await expect(service.addComment(mockVideo.id, comment)).rejects.toThrow(
        'Failed to add comment to video',
      );
      expect(videoRepository.addComment).toHaveBeenCalledWith(
        mockVideo.id,
        comment,
      );
    });
  });

  describe('getTopVideo', () => {
    const topVideos = [
      { videoId: 'video1', viewCount: 100 },
      { videoId: 'video2', viewCount: 50 },
    ];

    it('should get top videos with default limit', async () => {
      videoRepository.getTopVideo.mockResolvedValue(topVideos);

      const result = await service.getTopVideo();

      expect(result).toEqual(topVideos);
      expect(videoRepository.getTopVideo).toHaveBeenCalledWith(10);
    });

    it('should get top videos with custom limit', async () => {
      videoRepository.getTopVideo.mockResolvedValue(topVideos);

      const result = await service.getTopVideo(5);

      expect(result).toEqual(topVideos);
      expect(videoRepository.getTopVideo).toHaveBeenCalledWith(5);
    });

    it('should throw error when repository fails', async () => {
      videoRepository.getTopVideo.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.getTopVideo()).rejects.toThrow(
        'Failed to get the leaderboard',
      );
      expect(videoRepository.getTopVideo).toHaveBeenCalledWith(10);
    });
  });

  describe('getTimeBasedLeaderboard', () => {
    const leaderboard = [
      { videoId: 'video1', viewCount: 200 },
      { videoId: 'video2', viewCount: 150 },
    ];

    it('should get daily leaderboard with default parameters', async () => {
      videoRepository.getTimeBasedLeaderboard.mockResolvedValue(leaderboard);

      const result = await service.getTimeBasedLeaderboard('daily');

      expect(result).toEqual(leaderboard);
      expect(videoRepository.getTimeBasedLeaderboard).toHaveBeenCalledWith(
        'daily',
        10,
        undefined,
      );
    });

    it('should get weekly leaderboard with custom limit and date', async () => {
      const customDate = '2023-01-01';
      videoRepository.getTimeBasedLeaderboard.mockResolvedValue(leaderboard);

      const result = await service.getTimeBasedLeaderboard(
        'weekly',
        5,
        customDate,
      );

      expect(result).toEqual(leaderboard);
      expect(videoRepository.getTimeBasedLeaderboard).toHaveBeenCalledWith(
        'weekly',
        5,
        customDate,
      );
    });

    it('should handle all time types', async () => {
      videoRepository.getTimeBasedLeaderboard.mockResolvedValue(leaderboard);

      await service.getTimeBasedLeaderboard('monthly');
      await service.getTimeBasedLeaderboard('all');

      expect(videoRepository.getTimeBasedLeaderboard).toHaveBeenCalledWith(
        'monthly',
        10,
        undefined,
      );
      expect(videoRepository.getTimeBasedLeaderboard).toHaveBeenCalledWith(
        'all',
        10,
        undefined,
      );
    });

    it('should throw error when repository fails', async () => {
      videoRepository.getTimeBasedLeaderboard.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.getTimeBasedLeaderboard('daily')).rejects.toThrow(
        'Failed to get the time-based leaderboard',
      );
      expect(videoRepository.getTimeBasedLeaderboard).toHaveBeenCalledWith(
        'daily',
        10,
        undefined,
      );
    });
  });
});
