import { OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Order } from '../order/order.entity';
export declare class TelegramService implements OnModuleInit {
    private orderRepo;
    private bot;
    constructor(orderRepo: Repository<Order>);
    onModuleInit(): void;
}
