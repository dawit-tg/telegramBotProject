import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../order/order.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order])],
  providers: [TelegramService],
})
export class TelegramModule {}