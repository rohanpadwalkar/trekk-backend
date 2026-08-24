import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { randomInt } from 'crypto';
import { Booking, BookingDocument } from '../database/schemas/booking.schema';
import { TreksService } from '../treks/treks.service';

@Injectable()
export class BookingsService {
  constructor(
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    @InjectConnection() private connection: Connection,
    private treksService: TreksService,
  ) {}

  /**
   * Atomic seat decrement + booking creation in one multi-document
   * transaction — this is the one place in the app where a race condition
   * (two people booking the last seat at the same instant) would otherwise
   * corrupt data. decrementSeats() uses a conditional filter
   * (seatsLeft: { $gt: 0 }) so even without the transaction a single decrement
   * can't go negative; the transaction's job is making sure the Booking
   * document and the seat decrement either both happen or neither does.
   */
  async create(userId: string, trekId: string): Promise<BookingDocument> {
    const session = await this.connection.startSession();
    let booking: BookingDocument;
    try {
      await session.withTransaction(async () => {
        await this.treksService.decrementSeats(new Types.ObjectId(trekId), session);

        const [created] = await this.bookingModel.create(
          [
            {
              trekId: new Types.ObjectId(trekId),
              userId: new Types.ObjectId(userId),
              status: 'confirmed',
              confirmationCode: generateConfirmationCode(),
              bookedAt: new Date(),
              paymentStatus: 'not_required',
            },
          ],
          { session },
        );
        booking = created;
      });
    } finally {
      await session.endSession();
    }

    // Cache invalidation happens after the transaction commits — Redis
    // isn't part of the Mongo transaction and shouldn't be.
    await this.treksService.invalidateListCache();
    return booking!;
  }

  async findMine(userId: string): Promise<BookingDocument[]> {
    return this.bookingModel.find({ userId }).sort({ createdAt: -1 });
  }

  async findById(userId: string, bookingId: string): Promise<BookingDocument> {
    const booking = await this.bookingModel.findById(bookingId);
    if (!booking) throw new NotFoundException('Booking not found.');
    if (booking.userId.toString() !== userId) {
      throw new ForbiddenException('This booking does not belong to you.');
    }
    return booking;
  }

  async cancel(userId: string, bookingId: string): Promise<BookingDocument> {
    const booking = await this.findById(userId, bookingId);
    if (booking.status === 'cancelled') {
      return booking;
    }

    const session = await this.connection.startSession();
    try {
      await session.withTransaction(async () => {
        booking.status = 'cancelled';
        booking.cancelledAt = new Date();
        await booking.save({ session });
        await this.treksService.incrementSeats(booking.trekId, session);
      });
    } finally {
      await session.endSession();
    }

    await this.treksService.invalidateListCache();
    return booking;
  }
}

function generateConfirmationCode(): string {
  const digits = String(randomInt(0, 10000)).padStart(4, '0');
  const letters = Array.from({ length: 2 }, () => String.fromCharCode(65 + randomInt(0, 26))).join('');
  return `TRK-${digits}-${letters}`;
}
