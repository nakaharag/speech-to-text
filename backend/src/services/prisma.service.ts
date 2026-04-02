import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
    console.log('Prisma connected to database');

    // Seed default languages if none exist
    await this.seedLanguages();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  private async seedLanguages() {
    const count = await this.language.count();
    if (count === 0) {
      const languages = [
        { code: 'en', name: 'English', nativeName: 'English' },
        { code: 'pt', name: 'Portuguese', nativeName: 'Portugues' },
        { code: 'es', name: 'Spanish', nativeName: 'Espanol' },
        { code: 'fr', name: 'French', nativeName: 'Francais' },
        { code: 'de', name: 'German', nativeName: 'Deutsch' },
        { code: 'it', name: 'Italian', nativeName: 'Italiano' },
        { code: 'ja', name: 'Japanese', nativeName: 'Nihongo' },
        { code: 'ko', name: 'Korean', nativeName: 'Hangugeo' },
        { code: 'zh', name: 'Chinese', nativeName: 'Zhongwen' },
        { code: 'ru', name: 'Russian', nativeName: 'Russkij' },
        { code: 'ar', name: 'Arabic', nativeName: 'Arabiyy' },
        { code: 'hi', name: 'Hindi', nativeName: 'Hindi' },
      ];

      await this.language.createMany({ data: languages });
      console.log('Seeded default languages');
    }
  }
}
