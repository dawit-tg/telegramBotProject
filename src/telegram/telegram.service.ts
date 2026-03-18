import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../order/order.entity';
import { Request, Response } from 'express';
import TelegramBot from 'node-telegram-bot-api';

const users: Record<number, any> = {};
const PAYMENT_NUMBER = "0905754653";

@Injectable()
export class TelegramService implements OnModuleInit {
  private bot: TelegramBot;

  constructor(
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
  ) {}

  onModuleInit() {
  
    this.bot = new TelegramBot(process.env.BOT_TOKEN, { webHook: true });

    const url = process.env.APP_URL; 
    const endpoint = `/bot${process.env.BOT_TOKEN}`;
    this.bot.setWebHook(`${url}${endpoint}`);
  }

  // Handle incoming updates from Telegram
  async handleUpdate(req: Request, res: Response) {
    const update = req.body;

    if (!update.message) {
      return res.sendStatus(200);
    }

    const chatId = update.message.chat.id;
    const text = update.message.text?.toLowerCase();

    if (!text) return res.sendStatus(200);

    if (!users[chatId]) {
      users[chatId] = { step: 0 };
    }

    const user = users[chatId];

    if (text === '/start') {
      users[chatId] = { step: 1 };
      await this.bot.sendMessage(
        chatId,
        "☕ Welcome!\nChoose coffee:\n1. Dilla (300 birr/kg)\n2. Yirgachafe (400 birr/kg)"
      );
      return res.sendStatus(200);
    }

    if (user.step === 1) {
      if (text === '1') {
        user.product = 'Dilla';
        user.price = 300;
      } else if (text === '2') {
        user.product = 'Yirgachafe';
        user.price = 400;
      } else {
        await this.bot.sendMessage(chatId, "Choose: 1 or 2");
        return res.sendStatus(200);
      }
      user.step = 2;
      await this.bot.sendMessage(chatId, "How many kg?");
      return res.sendStatus(200);
    }

    if (user.step === 2) {
      const qty = Number(text);
      if (isNaN(qty) || qty <= 0) {
        await this.bot.sendMessage(chatId, "Enter valid number");
        return res.sendStatus(200);
      }
      user.quantity = qty;
      user.total = qty * user.price;
      user.step = 3;
      await this.bot.sendMessage(chatId, "Send phone number");
      return res.sendStatus(200);
    }

    if (user.step === 3) {
      user.phone = text;
      user.step = 4;
      await this.bot.sendMessage(chatId, "Enter your city");
      return res.sendStatus(200);
    }

    if (user.step === 4) {
      user.location = text;
      user.step = 5;
      await this.bot.sendMessage(
        chatId,
        `🧾 Order Summary:
Coffee: ${user.product}
Quantity: ${user.quantity} kg
Total: ${user.total} birr
Phone: ${user.phone}
Location: ${user.location}

Type 1 confirm to place order`
      );
      return res.sendStatus(200);
    }

    if (user.step === 5) {
      if (text === '1') {
        const order = this.orderRepo.create({
          product: user.product,
          quantity: user.quantity,
          total: user.total,
          phone: user.phone,
          location: user.location,
        });
        await this.orderRepo.save(order);

        await this.bot.sendMessage(
          chatId,
          `💰 Payment Required

Please send:
${user.total} birr

To Telebirr number:
${PAYMENT_NUMBER}

After payment, type "paid"`
        );

        user.step = 6;
        return res.sendStatus(200);
      } else {
        await this.bot.sendMessage(chatId, 'Type "confirm" to place order');
        return res.sendStatus(200);
      }
    }

    if (user.step === 6) {
      if (text === 'paid') {
        await this.bot.sendMessage(
          chatId,
          `✅ Payment received!

🚚 Your order will be delivered soon.
Thank you ☕`
        );
        console.log("PAID ORDER:", user);
        users[chatId] = { step: 0 };
        return res.sendStatus(200);
      } else {
        await this.bot.sendMessage(chatId, 'Type "paid" after payment');
        return res.sendStatus(200);
      }
    }
  }
}