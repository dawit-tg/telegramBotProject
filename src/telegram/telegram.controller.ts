import { Controller, Post, Req, Res } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { Request, Response } from 'express';

@Controller('bot')
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  @Post(':token')
  async receiveUpdate(@Req() req: Request, @Res() res: Response) {
    return this.telegramService.handleUpdate(req, res);
  }
}
