import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

export interface LanguageInfo {
  code: string;
  name: string;
  nativeName: string;
}

@Injectable()
export class LanguageService {
  constructor(private prisma: PrismaService) {}

  async getActiveLanguages(): Promise<LanguageInfo[]> {
    const languages = await this.prisma.language.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: {
        code: true,
        name: true,
        nativeName: true,
      },
    });

    return languages;
  }

  async isValidLanguage(code: string): Promise<boolean> {
    const language = await this.prisma.language.findUnique({
      where: { code },
    });
    return language !== null && language.isActive;
  }

  async getLanguageByCode(code: string): Promise<LanguageInfo | null> {
    const language = await this.prisma.language.findUnique({
      where: { code },
      select: {
        code: true,
        name: true,
        nativeName: true,
      },
    });
    return language;
  }
}
