import { Controller, Post, Body, Req, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../services/prisma.service';
import { IpUtilsService } from '../services/ip-utils.service';
import { Request } from 'express';

interface ContactSubmitDto {
  name: string;
  email: string;
  subject: string;
  message: string;
}

@Controller('contact')
export class ContactController {
  constructor(
    private prisma: PrismaService,
    private readonly ipUtilsService: IpUtilsService,
  ) {}

  @Post('submit')
  async submit(@Body() body: ContactSubmitDto, @Req() req: Request) {
    const { name, email, subject, message } = body;

    // Basic validation
    if (!name || !email || !subject || !message) {
      throw new HttpException('All fields are required', HttpStatus.BAD_REQUEST);
    }

    if (name.length > 100) {
      throw new HttpException('Name is too long', HttpStatus.BAD_REQUEST);
    }

    if (email.length > 255 || !email.includes('@')) {
      throw new HttpException('Invalid email address', HttpStatus.BAD_REQUEST);
    }

    if (subject.length > 255) {
      throw new HttpException('Subject is too long', HttpStatus.BAD_REQUEST);
    }

    if (message.length > 5000) {
      throw new HttpException('Message is too long (max 5000 characters)', HttpStatus.BAD_REQUEST);
    }

    // Simple rate limiting - max 5 submissions per IP per day
    // SECURITY: Only trust X-Forwarded-For if from a trusted proxy to prevent IP spoofing
    const ipAddress = this.ipUtilsService.getClientIp(req);
    const today = new Date().toISOString().split('T')[0];

    const todaySubmissions = await this.prisma.contactSubmission.count({
      where: {
        ipAddress,
        createdAt: {
          gte: new Date(today),
        },
      },
    });

    if (todaySubmissions >= 5) {
      throw new HttpException('Too many submissions. Please try again tomorrow.', HttpStatus.TOO_MANY_REQUESTS);
    }

    // Save to database
    await this.prisma.contactSubmission.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        subject: subject.trim(),
        message: message.trim(),
        ipAddress,
        userAgent: req.headers['user-agent'] || null,
      },
    });

    return {
      success: true,
      message: 'Your message has been received. We will get back to you soon.',
    };
  }
}
