import { Controller, Post, Body } from '@nestjs/common';

@Controller('report')
export class ReportController {
  @Post('generate')
  generateReport(@Body('text') text: string) {
    // Simple report generation logic
    const report = text;
    return { report };
  }
}
