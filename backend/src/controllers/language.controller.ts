import { Controller, Get } from '@nestjs/common';
import { LanguageService } from '../services/language.service';

@Controller('languages')
export class LanguageController {
  constructor(private readonly languageService: LanguageService) {}

  @Get()
  async getLanguages() {
    const languages = await this.languageService.getActiveLanguages();
    return { languages };
  }
}
