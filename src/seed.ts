/* eslint-disable no-console */
// Optional convenience script: creates one demo vendor account + one trek so
// there's something to hit immediately after `docker compose up`. Not part
// of the app itself — safe to skip. Run with: npm run seed
import * as mongoose from 'mongoose';
import * as argon2 from 'argon2';
import { User, UserSchema } from './database/schemas/user.schema';
import { Trek, TrekSchema } from './database/schemas/trek.schema';

async function main() {
  const mongoUri = process.env.MONGO_URI ?? 'mongodb://trekk:trekk_dev_password@localhost:27017/trekk_together?authSource=admin&replicaSet=rs0';
  await mongoose.connect(mongoUri);

  const UserModel = mongoose.model(User.name, UserSchema);
  const TrekModel = mongoose.model(Trek.name, TrekSchema);

  const existing = await UserModel.findOne({ email: 'demo-vendor@trekktogether.dev' });
  if (existing) {
    console.log('Demo vendor already exists — skipping seed.');
    await mongoose.disconnect();
    return;
  }

  const passwordHash = await argon2.hash('DemoPassword123!');
  const vendor = await UserModel.create({
    name: 'Sahyadri Trails Co.',
    email: 'demo-vendor@trekktogether.dev',
    passwordHash,
    roles: ['trekker', 'vendor'],
    verified: true,
    vendorProfile: { businessName: 'Sahyadri Trails Co.', rating: 0, ratingCount: 0 },
  });

  const trek = await TrekModel.create({
    title: 'Harishchandragad Night Trek',
    location: 'Harishchandragad, Maharashtra',
    summary: 'A classic monsoon night trek to the Konkan Kada cliff.',
    description: 'Meet at base village at 10pm, summit for sunrise, descend by noon.',
    organizerId: vendor._id,
    organizerType: 'vendor',
    difficulty: 'Moderate',
    durationDays: 1,
    price: 799,
    totalSeats: 20,
    seatsLeft: 20,
    dateStart: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    dateEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    ecoRating: 'Low Impact',
  });

  console.log('Seeded demo vendor:', vendor.email, '(password: DemoPassword123!)');
  console.log('Seeded demo trek:', trek.title, trek._id.toString());

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
