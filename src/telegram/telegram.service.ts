import { Injectable, OnModuleInit } from '@nestjs/common';
import TelegramBot from 'node-telegram-bot-api';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../order/order.entity';

const users: any = {};
const PAYMENT_NUMBER = "0905754653";

@Injectable()
export class TelegramService implements OnModuleInit {
  private bot: TelegramBot;

  constructor(
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
  ) {}

  onModuleInit() {
    this.bot = new TelegramBot('8617287568:AAG0afbFWv7qpAp8hMKm3bI31T3enQSRiHc', { polling: true });

    this.bot.on('message', async (msg) => {
      const chatId = msg.chat.id;
      const text = msg.text?.toLowerCase();

      if (!text) return;

      // initialize user
      if (!users[chatId]) {
        users[chatId] = { step: 0 };
      }

      const user = users[chatId];

      if (text === '/start') {
        users[chatId] = { step: 1 };

        return this.bot.sendMessage(
          chatId,
          "☕ Welcome!\nChoose coffee:\n1. Dilla (300 birr/kg)\n2. Yirgachafe (400 birr/kg)"
        );
      }

      if (user.step === 1) {
        if (text === '1') {
          user.product = 'Dilla';
          user.price = 300;
        } else if (text === '2') {
          user.product = 'Yirgachafe';
          user.price = 400;
        } else {
          return this.bot.sendMessage(chatId, "Choose: 1 or 2");
        }

        user.step = 2;
        return this.bot.sendMessage(chatId, "How many kg?");
      }

     
      if (user.step === 2) {
        const qty = Number(text);

        if (isNaN(qty) || qty <= 0) {
          return this.bot.sendMessage(chatId, "Enter valid number");
        }

        user.quantity = qty;
        user.total = qty * user.price;
        user.step = 3;

        return this.bot.sendMessage(chatId, "Send phone number");
      }

      if (user.step === 3) {
        user.phone = text;
        user.step = 4;

        return this.bot.sendMessage(chatId, "Enter your city");
      }

      if (user.step === 4) {
        user.location = text;
        user.step = 5;

        return this.bot.sendMessage(
          chatId,
          `🧾 Order Summary:
Coffee: ${user.product}
Quantity: ${user.quantity} kg
Total: ${user.total} birr
Phone: ${user.phone}
Location: ${user.location}

Type 1 confirm to place order`
        );
      }

      // 🔴 STEP 5: CONFIRM
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
          return;

        } else {
          return this.bot.sendMessage(chatId, 'Type "confirm" to place order');
        }
      }

      // 🟤 STEP 6: PAYMENT CONFIRMATION
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
          return;

        } else {
          return this.bot.sendMessage(chatId, 'Type "paid" after payment');
        }
      }
    });
  }
}