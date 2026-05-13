import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { NextAuthGuard, NextAuthUser } from '../guards/nextauth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { PrismaService } from '../services/prisma.service';

// Tier-based limits configuration
const TIER_LIMITS = {
  free: { transcriptions: 5, pdf: 5 },
  basic: { transcriptions: 50, pdf: 20 },
  pro: { transcriptions: 500, pdf: 100 },
  enterprise: { transcriptions: -1, pdf: -1 }, // -1 = unlimited
};

interface UsageStats {
  transcriptionsToday: number;
  transcriptionsLimit: number;
  pdfToday: number;
  pdfLimit: number;
  totalItems: number;
}

interface HistoryItem {
  id: string;
  type: 'transcription' | 'pdf';
  title: string;
  preview: string;
  createdAt: string;
  duration?: string;
  pages?: number;
}

interface HistoryResponse {
  items: HistoryItem[];
  totalPages: number;
  currentPage: number;
}

@Controller('user')
@UseGuards(NextAuthGuard)
export class UserController {
  constructor(private prisma: PrismaService) {}

  @Get('usage')
  async getUsage(@CurrentUser() user: NextAuthUser): Promise<UsageStats> {
    const userId = user.id;
    const tier = user.tier || 'free';

    // Get today's date range (UTC)
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setUTCHours(23, 59, 59, 999);

    // Count today's transcriptions
    const transcriptionsToday = await this.prisma.transcription.count({
      where: {
        userId,
        createdAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    // Count today's PDF conversions (only completed ones)
    const pdfToday = await this.prisma.pdfConversion.count({
      where: {
        userId,
        status: 'completed',
        createdAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    // Count total items (all time)
    const [totalTranscriptions, totalPdfConversions] = await Promise.all([
      this.prisma.transcription.count({ where: { userId } }),
      this.prisma.pdfConversion.count({ where: { userId, status: 'completed' } }),
    ]);

    const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;

    return {
      transcriptionsToday,
      transcriptionsLimit: limits.transcriptions,
      pdfToday,
      pdfLimit: limits.pdf,
      totalItems: totalTranscriptions + totalPdfConversions,
    };
  }

  @Get('history')
  async getHistory(
    @CurrentUser() user: NextAuthUser,
    @Query('type') type: string = 'all',
    @Query('page') pageStr: string = '1',
    @Query('limit') limitStr: string = '10',
    @Query('search') search?: string,
  ): Promise<HistoryResponse> {
    const userId = user.id;
    const page = Math.max(1, parseInt(pageStr, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitStr, 10) || 10));
    const skip = (page - 1) * limit;

    const items: HistoryItem[] = [];
    let totalTranscriptions = 0;
    let totalPdfConversions = 0;

    // Build search filter for transcriptions
    const transcriptionSearchFilter = search
      ? {
          OR: [
            { fileName: { contains: search, mode: 'insensitive' as const } },
            { transcript: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    // Build search filter for PDF conversions
    const pdfSearchFilter = search
      ? {
          OR: [
            { fileName: { contains: search, mode: 'insensitive' as const } },
            { extractedText: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    // Handle single type queries with database-level pagination
    if (type === 'transcription') {
      const whereClause = { userId, ...transcriptionSearchFilter };

      const [transcriptions, count] = await Promise.all([
        this.prisma.transcription.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip,
          select: {
            id: true,
            fileName: true,
            transcript: true,
            audioDuration: true,
            createdAt: true,
          },
        }),
        this.prisma.transcription.count({ where: whereClause }),
      ]);

      totalTranscriptions = count;

      for (const t of transcriptions) {
        items.push({
          id: t.id,
          type: 'transcription',
          title: t.fileName || 'Untitled Transcription',
          preview: t.transcript.substring(0, 150) + (t.transcript.length > 150 ? '...' : ''),
          createdAt: t.createdAt.toISOString(),
          duration: t.audioDuration ? this.formatDuration(t.audioDuration) : undefined,
        });
      }

      const totalPages = Math.ceil(totalTranscriptions / limit);

      return {
        items,
        totalPages,
        currentPage: page,
      };
    }

    if (type === 'pdf') {
      const whereClause = { userId, status: 'completed', ...pdfSearchFilter };

      const [pdfConversions, count] = await Promise.all([
        this.prisma.pdfConversion.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip,
          select: {
            id: true,
            fileName: true,
            extractedText: true,
            pageCount: true,
            createdAt: true,
          },
        }),
        this.prisma.pdfConversion.count({ where: whereClause }),
      ]);

      totalPdfConversions = count;

      for (const p of pdfConversions) {
        const preview = p.extractedText
          ? p.extractedText.substring(0, 150) + (p.extractedText.length > 150 ? '...' : '')
          : 'No preview available';

        items.push({
          id: p.id,
          type: 'pdf',
          title: p.fileName || 'Untitled PDF',
          preview,
          createdAt: p.createdAt.toISOString(),
          pages: p.pageCount || undefined,
        });
      }

      const totalPages = Math.ceil(totalPdfConversions / limit);

      return {
        items,
        totalPages,
        currentPage: page,
      };
    }

    // For 'all' type: fetch from both tables with database-level pagination
    // We need to fetch enough items to fill the page after merging and sorting
    const transcriptionWhere = { userId, ...transcriptionSearchFilter };
    const pdfWhere = { userId, status: 'completed', ...pdfSearchFilter };

    // Get counts first
    const [transcriptionCount, pdfCount] = await Promise.all([
      this.prisma.transcription.count({ where: transcriptionWhere }),
      this.prisma.pdfConversion.count({ where: pdfWhere }),
    ]);

    const total = transcriptionCount + pdfCount;
    const totalPages = Math.ceil(total / limit);

    // For combined results, we need to fetch more items to handle the merge
    // Fetch skip + limit items from each table to ensure we have enough after sorting
    const fetchLimit = skip + limit;

    const [transcriptions, pdfConversions] = await Promise.all([
      this.prisma.transcription.findMany({
        where: transcriptionWhere,
        orderBy: { createdAt: 'desc' },
        take: fetchLimit,
        select: {
          id: true,
          fileName: true,
          transcript: true,
          audioDuration: true,
          createdAt: true,
        },
      }),
      this.prisma.pdfConversion.findMany({
        where: pdfWhere,
        orderBy: { createdAt: 'desc' },
        take: fetchLimit,
        select: {
          id: true,
          fileName: true,
          extractedText: true,
          pageCount: true,
          createdAt: true,
        },
      }),
    ]);

    // Convert to HistoryItem format
    const allItems: HistoryItem[] = [];

    for (const t of transcriptions) {
      allItems.push({
        id: t.id,
        type: 'transcription',
        title: t.fileName || 'Untitled Transcription',
        preview: t.transcript.substring(0, 150) + (t.transcript.length > 150 ? '...' : ''),
        createdAt: t.createdAt.toISOString(),
        duration: t.audioDuration ? this.formatDuration(t.audioDuration) : undefined,
      });
    }

    for (const p of pdfConversions) {
      const preview = p.extractedText
        ? p.extractedText.substring(0, 150) + (p.extractedText.length > 150 ? '...' : '')
        : 'No preview available';

      allItems.push({
        id: p.id,
        type: 'pdf',
        title: p.fileName || 'Untitled PDF',
        preview,
        createdAt: p.createdAt.toISOString(),
        pages: p.pageCount || undefined,
      });
    }

    // Sort all items by createdAt descending
    allItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Apply pagination to the merged and sorted items
    const paginatedItems = allItems.slice(skip, skip + limit);

    return {
      items: paginatedItems,
      totalPages,
      currentPage: page,
    };
  }

  @Delete('history/:id')
  async deleteHistoryItem(
    @CurrentUser() user: NextAuthUser,
    @Param('id') id: string,
  ): Promise<{ success: boolean; message: string }> {
    const userId = user.id;

    // Try to find and delete from transcriptions first
    const transcription = await this.prisma.transcription.findFirst({
      where: { id, userId },
    });

    if (transcription) {
      await this.prisma.transcription.delete({
        where: { id },
      });
      return { success: true, message: 'Transcription deleted successfully' };
    }

    // Try to find and delete from PDF conversions
    const pdfConversion = await this.prisma.pdfConversion.findFirst({
      where: { id, userId },
    });

    if (pdfConversion) {
      await this.prisma.pdfConversion.delete({
        where: { id },
      });
      return { success: true, message: 'PDF conversion deleted successfully' };
    }

    // Item not found or doesn't belong to user
    throw new NotFoundException('History item not found');
  }

  /**
   * Format duration in seconds to human-readable string (e.g., "2:30" or "1:05:30")
   */
  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}
