/* eslint-disable no-console */
// Seeds the database with a realistic Sahyadri-region demo dataset so the
// app has real content on first open, ahead of the Sahyadri-community
// launch. Every document this script creates is marked `isDemo: true` on
// its own collection (see the `isDemo` prop added to each schema) — that
// flag is the ONLY thing that identifies demo content, and it is never set
// by any other code path in the app. Nothing here touches, reads, or
// modifies any document that doesn't already have isDemo:true.
//
// Usage (from backend/):
//   npm run seed:demo         seed demo data (no-ops if demo data already exists)
//   npm run seed:demo:wipe    delete ALL isDemo:true documents, in every
//                             collection this script writes to, and exit
//
// To reseed from scratch: run seed:demo:wipe, then seed:demo again.
//
// Demo login (same password for every seeded account — vendors and
// trekkers alike): password "TrekkDemo2026!", email format
// demo_vendor_<slug>@trekktogether.dev / demo_user_<firstname>@trekktogether.dev
// (see the console summary this script prints at the end for the full list).
import * as mongoose from 'mongoose';
import * as argon2 from 'argon2';
import { User, UserSchema } from '../src/database/schemas/user.schema';
import { Trek, TrekSchema } from '../src/database/schemas/trek.schema';
import { Post, PostSchema } from '../src/database/schemas/post.schema';
import { Like, LikeSchema } from '../src/database/schemas/like.schema';
import { FollowEdge, FollowEdgeSchema } from '../src/database/schemas/follow-edge.schema';
import { JoinRequest, JoinRequestSchema } from '../src/database/schemas/join-request.schema';

const DEMO_PASSWORD = 'TrekkDemo2026!';

// Lorem Picsum's /seed/ endpoint is deterministic per string and always
// resolves — a seed script can't go through the real Supabase upload flow,
// so these stand in for "already uploaded" images the same way a real
// upload would leave a URL behind. They are neutral scenic/outdoor stock
// photography, not literal photographs of each named fort.
const img = (slug: string, w = 800, h = 600) => `https://picsum.photos/seed/${slug}/${w}/${h}`;

function daysFromNow(n: number): Date {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000);
}

function pickN<T>(arr: T[], n: number, exclude?: T): T[] {
  const pool = exclude === undefined ? [...arr] : arr.filter((x) => x !== exclude);
  const out: T[] = [];
  while (out.length < Math.min(n, pool.length)) {
    const i = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ---------------------------------------------------------------------------
// Vendor accounts — a mix of fully-bilingual (Marathi woven naturally into
// English, not a translated duplicate line) and fully-English bios, the way
// real Maharashtra-based trekking groups' profiles actually read.
// ---------------------------------------------------------------------------
const VENDORS = [
  {
    key: 'sahyadritrails',
    name: 'Sahyadri Trails Co.',
    email: 'demo_vendor_sahyadritrails@trekktogether.dev',
    location: 'Pune, Maharashtra',
    bio: "Weekend treks across the Sahyadri for 8 years now. डोंगरवाटा, किल्ले, आणि मनमोकळा निसर्ग — that's what keeps us going. Small groups, safety-first, chai at the top guaranteed.",
  },
  {
    key: 'gadkot',
    name: 'Gadkot Expeditions',
    email: 'demo_vendor_gadkot@trekktogether.dev',
    location: 'Pune, Maharashtra',
    bio: 'Fort-trekking specialists — Rajgad ते Raigad, आम्ही सह्याद्रीतले प्रत्येक कडे फिरलोय. Group treks every weekend, solo trekkers always welcome.',
  },
  {
    key: 'konkankada',
    name: 'Konkan Kada Adventures',
    email: 'demo_vendor_konkankada@trekktogether.dev',
    location: 'Karjat, Raigad',
    bio: 'Monsoon specialists based out of Karjat. धुक्यातून, धबधब्यातून, हिरव्यागार सह्याद्रीतून — we run night treks and waterfall treks June through September. Certified guides, first-aid trained.',
  },
  {
    key: 'durgbhraman',
    name: 'Durg Bhraman Trekkers',
    email: 'demo_vendor_durgbhraman@trekktogether.dev',
    location: 'Satara, Maharashtra',
    bio: 'दुर्गभ्रमण म्हणजे फक्त ट्रेक नाही, तो इतिहासाशी संवाद आहे. We walk you through the history of every fort we climb, not just the route. Active across the southern Sahyadri.',
  },
  {
    key: 'highlandtrail',
    name: 'Highland Trail Co.',
    email: 'demo_vendor_highlandtrail@trekktogether.dev',
    location: 'Mumbai, Maharashtra',
    bio: 'Curated weekend expeditions across the Western Ghats for working professionals. Small-batch treks, transparent pricing, and a WhatsApp group that actually answers your questions.',
  },
  {
    key: 'wildernesswalkers',
    name: 'Wilderness Walkers India',
    email: 'demo_vendor_wildernesswalkers@trekktogether.dev',
    location: 'Mumbai, Maharashtra',
    bio: 'Pan-India trekking collective — our Sahyadri chapter runs monthly fort treks and one big monsoon expedition every July. Beginner-friendly routes are always clearly marked.',
  },
  {
    key: 'sahyakada',
    name: 'Sahyakada Outdoors',
    email: 'demo_vendor_sahyakada@trekktogether.dev',
    location: 'Nashik, Maharashtra',
    bio: 'सह्यकडा = सह्याद्रीचा कडा. आम्ही धाडसी ट्रेक्स करतो — Kalsubai, Ratangad, आणि इतर उंच शिखरं. Not for absolute beginners, but we get you there safely.',
  },
];

// ---------------------------------------------------------------------------
// Regular (trekker) accounts.
// ---------------------------------------------------------------------------
const USERS = [
  { key: 'aditi', name: 'Aditi Kulkarni', location: 'Pune, Maharashtra' },
  { key: 'rohan', name: 'Rohan Deshmukh', location: 'Pune, Maharashtra' },
  { key: 'sneha', name: 'Sneha Patil', location: 'Mumbai, Maharashtra' },
  { key: 'mihir', name: 'Mihir Joshi', location: 'Pune, Maharashtra' },
  { key: 'priya', name: 'Priya Naik', location: 'Thane, Maharashtra' },
  { key: 'kunal', name: 'Kunal Bhosale', location: 'Navi Mumbai, Maharashtra' },
  { key: 'ananya', name: 'Ananya Rao', location: 'Mumbai, Maharashtra' },
  { key: 'omkar', name: 'Omkar Sawant', location: 'Pune, Maharashtra' },
  { key: 'tanvi', name: 'Tanvi Gokhale', location: 'Pune, Maharashtra' },
  { key: 'yash', name: 'Yash Chavan', location: 'Nashik, Maharashtra' },
  { key: 'ritika', name: 'Ritika Shah', location: 'Mumbai, Maharashtra' },
  { key: 'devendra', name: 'Devendra Pawar', location: 'Satara, Maharashtra' },
  { key: 'neha', name: 'Neha Kadam', location: 'Pune, Maharashtra' },
].map((u) => ({ ...u, email: `demo_user_${u.key}@trekktogether.dev` }));

// ---------------------------------------------------------------------------
// Vendor-organized (guided, priced) treks. organizerKey refers to a VENDORS
// key. Difficulty and price are calibrated to how each spot actually rates.
// ---------------------------------------------------------------------------
const VENDOR_TREKS = [
  {
    key: 'sinhagad', title: 'Sinhagad Fort Trek', location: 'Donje Village, Pune',
    difficulty: 'Easy', price: 399, durationDays: 1, totalSeats: 30, organizerKey: 'gadkot',
    summary: "Pune's most popular beginner fort trek — a well-worn path and a big payoff at the top.",
    description: "The classic first fort trek for most Pune trekkers. A steady, well-marked climb of about 2 hours, and kanda bhaji with pithla-bhakri at the top stalls is half the reason people come. Great for first-timers and families.",
    ecoRating: 'Low Impact', startInDays: 6,
  },
  {
    key: 'lohagad', title: 'Lohagad Fort Trek', location: 'Lonavala, Pune',
    difficulty: 'Easy', price: 449, durationDays: 1, totalSeats: 25, organizerKey: 'wildernesswalkers',
    summary: 'Beginner-friendly monsoon favorite, with waterfalls right along the trail.',
    description: 'A gentle, mostly-paved climb past the Vinchu Kata (scorpion tail) viewpoint. Best in monsoon, when the whole approach turns bright green and small waterfalls line the path.',
    ecoRating: 'Low Impact', startInDays: 9,
  },
  {
    key: 'visapur', title: 'Visapur Fort Trek', location: 'Lonavala, Pune',
    difficulty: 'Easy', price: 499, durationDays: 1, totalSeats: 25, organizerKey: 'wildernesswalkers',
    summary: 'A wide, breezy plateau fort right next to Lohagad — great sunset views.',
    description: "Visapur's approach is steeper than its neighbour Lohagad but still beginner-friendly, and the summit plateau is wide open with some of the best sunset views in the Lonavala belt.",
    ecoRating: 'Low Impact', startInDays: 13,
  },
  {
    key: 'korigad', title: 'Korigad Fort Trek', location: 'Lonavala, Pune',
    difficulty: 'Easy', price: 449, durationDays: 1, totalSeats: 30, organizerKey: 'highlandtrail',
    summary: 'Family-friendly climb with twin lakes waiting at the top.',
    description: 'A short, well-stepped climb popular with families — two small lakes sit right on the fort plateau, and the walls are some of the best-preserved in the region.',
    ecoRating: 'Low Impact', startInDays: 7,
  },
  {
    key: 'tikona', title: 'Tikona Fort Trek', location: 'Pawna Lake, Pune',
    difficulty: 'Moderate', price: 549, durationDays: 1, totalSeats: 20, organizerKey: 'sahyadritrails',
    summary: 'The pyramid-shaped hill overlooking Pawna backwaters.',
    description: 'Tikona (literally "triangular") is a short but steep scramble near the top, rewarded with sweeping views over the Pawna reservoir. We often pair this with a lakeside breakfast stop.',
    ecoRating: 'Low Impact', startInDays: 11,
  },
  {
    key: 'dukesnose', title: "Duke's Nose Trek", location: 'Khandala, Pune',
    difficulty: 'Easy', price: 399, durationDays: 1, totalSeats: 20, organizerKey: 'highlandtrail',
    summary: 'A short scenic ridge walk above the Khandala ghat, with optional rappelling.',
    description: 'Barely a 45-minute walk to a cliff edge with a stunning view down into the Konkan — we usually arrange an optional rappelling add-on for anyone who wants it.',
    ecoRating: 'Low Impact', startInDays: 5,
  },
  {
    key: 'peb', title: 'Peb Fort (Vikatgad) Trek', location: 'Neral, Raigad',
    difficulty: 'Easy', price: 499, durationDays: 1, totalSeats: 20, organizerKey: 'konkankada',
    summary: 'A short trek near Matheran — good for a first overnight-free outing.',
    description: 'Peb is a compact, cave-dotted fort close to Neral station — a good half-day trek with a bit of scrambling near the top, and a nice alternative to the more crowded Matheran trail.',
    ecoRating: 'Low Impact', startInDays: 8,
  },
  {
    key: 'rajmachi', title: 'Rajmachi Night Trek', location: 'Lonavala/Karjat border, Pune',
    difficulty: 'Moderate', price: 899, durationDays: 1, totalSeats: 18, organizerKey: 'konkankada',
    summary: 'Monsoon night trek via Kondhane caves, with sunrise at Shrivardhan.',
    description: 'We start at midnight from Lonavala, pass the Kondhane caves, and reach the Shrivardhan bastion just before sunrise. A monsoon-season favorite — carry a raincoat, not an umbrella.',
    ecoRating: 'Regenerative', startInDays: 15,
  },
  {
    key: 'purandar', title: 'Purandar Fort Trek', location: 'Narayanpur, Pune',
    difficulty: 'Moderate', price: 649, durationDays: 1, totalSeats: 20, organizerKey: 'gadkot',
    summary: 'Less-crowded fort with real history — birthplace of Sambhaji Maharaj.',
    description: 'Purandar sees a fraction of the crowd Sinhagad does, despite a steady, satisfying climb and real historical weight — this is where Sambhaji Maharaj was born.',
    ecoRating: 'Low Impact', startInDays: 12,
  },
  {
    key: 'rohida', title: 'Rohida Fort (Vichitragad) Trek', location: 'Bhor, Pune',
    difficulty: 'Moderate', price: 699, durationDays: 1, totalSeats: 15, organizerKey: 'durgbhraman',
    summary: 'A quiet, offbeat star-shaped fort south of Pune.',
    description: "One of the least-visited forts on this list, with an unusual star-shaped bastion layout. Good pick if you've done the popular ones and want something quieter.",
    ecoRating: 'Low Impact', startInDays: 18,
  },
  {
    key: 'kothaligad', title: 'Kothaligad (Peth) Trek', location: 'Karjat, Raigad',
    difficulty: 'Moderate', price: 649, durationDays: 1, totalSeats: 20, organizerKey: 'konkankada',
    summary: 'Cave-carved fort near Karjat, lush in monsoon.',
    description: 'A short, steep climb to a fort with real rock-cut caves near the summit — monsoon turns the entire approach a deep green.',
    ecoRating: 'Regenerative', startInDays: 10,
  },
  {
    key: 'naneghat', title: 'Naneghat Trek', location: 'Junnar, Pune',
    difficulty: 'Moderate', price: 749, durationDays: 1, totalSeats: 18, organizerKey: 'sahyakada',
    summary: 'An ancient trade route with rock-cut caves and old inscriptions.',
    description: 'Naneghat was a toll-collection pass on an ancient Satavahana-era trade route — the highlight is a series of rock-cut caves with 2,000-year-old Brahmi inscriptions.',
    ecoRating: 'Low Impact', startInDays: 20,
  },
  {
    key: 'andharban', title: 'Andharban Monsoon Trek', location: 'Bhira/Tamhini, Pune–Raigad border',
    difficulty: 'Moderate', price: 899, durationDays: 1, totalSeats: 16, organizerKey: 'konkankada',
    summary: "The 'dark forest' descent trek — monsoon-only, dense jungle canopy.",
    description: "Andharban means 'dark forest' — a long descent through dense jungle canopy with waterfalls at nearly every turn. Monsoon-only; the trail is unrecognizable (and much less scenic) in dry months.",
    ecoRating: 'Regenerative', startInDays: 22,
  },
  {
    key: 'harishchandragad', title: 'Harishchandragad Night Trek', location: 'Khireshwar, Ahmednagar',
    difficulty: 'Hard', price: 1099, durationDays: 2, totalSeats: 15, organizerKey: 'sahyakada',
    summary: 'Overnight trek to the Konkan Kada cliff and Kedareshwar cave.',
    description: 'A demanding overnight trek via Khireshwar — we camp near Kedareshwar cave and catch sunrise at Konkan Kada, a near-vertical cliff edge that is one of the most photographed spots in the Sahyadri.',
    ecoRating: 'Regenerative', startInDays: 25,
  },
  {
    key: 'kalsubai', title: 'Kalsubai Peak Trek', location: 'Bari Village, Ahmednagar',
    difficulty: 'Expert', price: 1299, durationDays: 1, totalSeats: 20, organizerKey: 'sahyakada',
    summary: "Maharashtra's highest peak — iron ladders near the summit, sunrise trek.",
    description: "The highest point in Maharashtra at 1,646m. The final stretch is a series of iron ladders bolted to the rock face — not technically difficult, but exposed, and it gets crowded on weekends. We run this as a sunrise trek to beat both the heat and the queues.",
    ecoRating: 'Regenerative', startInDays: 28,
  },
];

// ---------------------------------------------------------------------------
// Peer-organized (free) treks — owned by regular users, these are what
// PeerTrekPartnerScreen and the trek-partner posts point at.
// ---------------------------------------------------------------------------
const PEER_TREKS = [
  {
    key: 'rajgad-plan', title: 'Rajgad Weekend Plan', location: 'Gunjavane, Pune',
    difficulty: 'Hard', durationDays: 1, totalSeats: 8, organizerKey: 'rohan',
    summary: "Doing Rajgad this Saturday, splitting a cab from Swargate.",
    description: "Planning to do Rajgad this Saturday via the Gunjavane route — Shivaji Maharaj's first capital, and one of the toughest climbs in the list. 6-7 of us so far, splitting a shared cab from Swargate at 5am. Comment or request to join if you're in.",
    ecoRating: 'Low Impact', startInDays: 4,
  },
  {
    key: 'torna-sunrise', title: 'Torna Sunrise Climb', location: 'Velhe, Pune',
    difficulty: 'Hard', durationDays: 1, totalSeats: 6, organizerKey: 'mihir',
    summary: 'Early start for Torna — the first fort Shivaji Maharaj ever captured.',
    description: "Torna (Prachandagad) is a proper climb — steep, long, and the first fort Shivaji Maharaj ever captured. Leaving from Velhe base village at 4am to catch the ridge before the sun gets harsh. Experienced trekkers preferred, but happy to guide first-timers who are fit.",
    ecoRating: 'Low Impact', startInDays: 14,
  },
  {
    key: 'ratangad-nedhe', title: 'Ratangad + Nedhe', location: 'Bhandardara, Ahmednagar',
    difficulty: 'Moderate', durationDays: 1, totalSeats: 10, organizerKey: 'priya',
    summary: 'Overnight camp near Bhandardara, trek up to the Nedhe rock arch.',
    description: "Camping near Bhandardara Friday night, trekking up to Ratangad Saturday morning to see the Nedhe (needle-hole) rock arch. Bring your own tent if you have one, otherwise we can share.",
    ecoRating: 'Regenerative', startInDays: 19,
  },
  {
    key: 'prabalgad-kalavantin', title: 'Prabalgad + Kalavantin Durg', location: 'Panvel, Raigad',
    difficulty: 'Hard', durationDays: 1, totalSeats: 6, organizerKey: 'kunal',
    summary: 'Prabalgad plateau, with an optional exposed climb up Kalavantin.',
    description: "Prabalgad has a huge open plateau, and right next to it is Kalavantin Durg — a narrow, exposed rock-cut staircase to a tiny summit. That part is optional and NOT for anyone uncomfortable with heights or exposed drops. Prabalgad alone is a great trek on its own.",
    ecoRating: 'Low Impact', startInDays: 16,
  },
  {
    key: 'devkund-waterfall', title: 'Devkund Waterfall Trek', location: 'Bhira, Raigad',
    difficulty: 'Moderate', durationDays: 1, totalSeats: 12, organizerKey: 'ananya',
    summary: 'Monsoon waterfall trek near Bhira, with a river crossing.',
    description: "Devkund is one of the tallest waterfalls near Mumbai/Pune, reached via a short but slippery monsoon trail with a river crossing. Water levels can be strong in peak monsoon, so we go as a group and stay together the whole way.",
    ecoRating: 'Regenerative', startInDays: 21,
  },
];

async function wipe(models: {
  UserModel: mongoose.Model<any>;
  TrekModel: mongoose.Model<any>;
  PostModel: mongoose.Model<any>;
  LikeModel: mongoose.Model<any>;
  FollowEdgeModel: mongoose.Model<any>;
  JoinRequestModel: mongoose.Model<any>;
}) {
  const results = await Promise.all([
    models.LikeModel.deleteMany({ isDemo: true }),
    models.JoinRequestModel.deleteMany({ isDemo: true }),
    models.FollowEdgeModel.deleteMany({ isDemo: true }),
    models.PostModel.deleteMany({ isDemo: true }),
    models.TrekModel.deleteMany({ isDemo: true }),
    models.UserModel.deleteMany({ isDemo: true }),
  ]);
  const [likes, joinRequests, follows, posts, treks, users] = results;
  console.log('Wiped demo data:');
  console.log(`  users:         ${users.deletedCount}`);
  console.log(`  treks:         ${treks.deletedCount}`);
  console.log(`  posts:         ${posts.deletedCount}`);
  console.log(`  follow edges:  ${follows.deletedCount}`);
  console.log(`  join requests: ${joinRequests.deletedCount}`);
  console.log(`  likes:         ${likes.deletedCount}`);
  console.log(
    '\nNote: if any real account followed or liked demo content before this wipe, ' +
      'their follower/like counts may now be very slightly stale. Expected for ' +
      "pre-launch demo data — it self-corrects as real usage accrues, and doesn't " +
      'affect any real document directly.',
  );
}

async function main() {
  const wipeOnly = process.argv.includes('--wipe');
  const reset = process.argv.includes('--reset');

  const mongoUri =
    process.env.MONGO_URI ??
    'mongodb://trekk:trekk_dev_password@localhost:27017/trekk_together?authSource=admin&replicaSet=rs0';
  console.log(`Connecting to ${mongoUri.replace(/\/\/[^@]+@/, '//<redacted>@')} ...`);
  await mongoose.connect(mongoUri);

  const UserModel = mongoose.model(User.name, UserSchema);
  const TrekModel = mongoose.model(Trek.name, TrekSchema);
  const PostModel = mongoose.model(Post.name, PostSchema);
  const LikeModel = mongoose.model(Like.name, LikeSchema);
  const FollowEdgeModel = mongoose.model(FollowEdge.name, FollowEdgeSchema);
  const JoinRequestModel = mongoose.model(JoinRequest.name, JoinRequestSchema);
  const models = { UserModel, TrekModel, PostModel, LikeModel, FollowEdgeModel, JoinRequestModel };

  if (wipeOnly) {
    await wipe(models);
    await mongoose.disconnect();
    return;
  }

  const existingCount = await UserModel.countDocuments({ isDemo: true });
  if (existingCount > 0 && !reset) {
    console.log(
      `Demo data already present (${existingCount} demo users). Nothing done, to avoid duplicates.`,
    );
    console.log('Run `npm run seed:demo:wipe` to remove it, or `npm run seed:demo -- --reset` to wipe and reseed in one step.');
    await mongoose.disconnect();
    return;
  }
  if (existingCount > 0 && reset) {
    await wipe(models);
  }

  const passwordHash = await argon2.hash(DEMO_PASSWORD);

  // --- Vendors ---------------------------------------------------------
  const vendorDocs: Record<string, any> = {};
  for (const v of VENDORS) {
    vendorDocs[v.key] = await UserModel.create({
      name: v.name,
      email: v.email,
      passwordHash,
      roles: ['trekker', 'vendor'],
      avatar: img(`avatar-${v.key}`, 300, 300),
      bio: v.bio,
      location: v.location,
      verified: true,
      vendorProfile: { businessName: v.name, rating: 0, ratingCount: 0 },
      isDemo: true,
    });
  }
  console.log(`Created ${VENDORS.length} demo vendor accounts.`);

  // --- Regular users -----------------------------------------------------
  const userDocs: Record<string, any> = {};
  for (const u of USERS) {
    userDocs[u.key] = await UserModel.create({
      name: u.name,
      email: u.email,
      passwordHash,
      roles: ['trekker'],
      avatar: img(`avatar-${u.key}`, 300, 300),
      bio: '',
      location: u.location,
      verified: false,
      isDemo: true,
    });
  }
  console.log(`Created ${USERS.length} demo trekker accounts.`);

  // --- Treks (vendor-organized) -------------------------------------------
  const trekDocs: Record<string, any> = {};
  const treksCountByOrganizer: Record<string, number> = {};

  for (const t of VENDOR_TREKS) {
    const organizer = vendorDocs[t.organizerKey];
    const seatsLeft = Math.max(1, t.totalSeats - randInt(0, Math.floor(t.totalSeats * 0.4)));
    const cover = img(`trek-${t.key}`);
    trekDocs[t.key] = await TrekModel.create({
      title: t.title,
      location: t.location,
      summary: t.summary,
      description: t.description,
      organizerId: organizer._id,
      organizerType: 'vendor',
      coverImage: cover,
      images: [cover, img(`trek-${t.key}-2`), img(`trek-${t.key}-3`)],
      difficulty: t.difficulty,
      durationDays: t.durationDays,
      price: t.price,
      totalSeats: t.totalSeats,
      seatsLeft,
      dateStart: daysFromNow(t.startInDays),
      dateEnd: daysFromNow(t.startInDays + t.durationDays),
      ecoRating: t.ecoRating,
      isDemo: true,
    });
    treksCountByOrganizer[t.organizerKey] = (treksCountByOrganizer[t.organizerKey] ?? 0) + 1;
  }

  // --- Treks (peer-organized, free) ---------------------------------------
  for (const t of PEER_TREKS) {
    const organizer = userDocs[t.organizerKey];
    const cover = img(`trek-${t.key}`);
    trekDocs[t.key] = await TrekModel.create({
      title: t.title,
      location: t.location,
      summary: t.summary,
      description: t.description,
      organizerId: organizer._id,
      organizerType: 'peer',
      coverImage: cover,
      images: [cover],
      difficulty: t.difficulty,
      durationDays: t.durationDays,
      price: null,
      totalSeats: t.totalSeats,
      seatsLeft: t.totalSeats,
      dateStart: daysFromNow(t.startInDays),
      dateEnd: daysFromNow(t.startInDays + t.durationDays),
      ecoRating: t.ecoRating,
      isDemo: true,
    });
    treksCountByOrganizer[t.organizerKey] = (treksCountByOrganizer[t.organizerKey] ?? 0) + 1;
  }
  console.log(`Created ${VENDOR_TREKS.length} vendor treks + ${PEER_TREKS.length} peer treks.`);

  for (const [key, count] of Object.entries(treksCountByOrganizer)) {
    const doc = vendorDocs[key] ?? userDocs[key];
    if (doc) await UserModel.updateOne({ _id: doc._id }, { $set: { treksCount: count } });
  }

  // --- Follow edges --------------------------------------------------------
  const allUserKeys = USERS.map((u) => u.key);
  const allVendorKeys = VENDORS.map((v) => v.key);
  const edgeSeen = new Set<string>();
  const edges: { followerId: any; followingId: any }[] = [];

  function addEdge(followerId: any, followingId: any) {
    if (String(followerId) === String(followingId)) return;
    const key = `${followerId}:${followingId}`;
    if (edgeSeen.has(key)) return;
    edgeSeen.add(key);
    edges.push({ followerId, followingId });
  }

  for (const uKey of allUserKeys) {
    const vendorFollows = pickN(allVendorKeys, randInt(2, 4));
    for (const vKey of vendorFollows) addEdge(userDocs[uKey]._id, vendorDocs[vKey]._id);
    const peerFollows = pickN(allUserKeys, randInt(1, 3), uKey);
    for (const pKey of peerFollows) addEdge(userDocs[uKey]._id, userDocs[pKey]._id);
  }
  // A little vendor-to-vendor courtesy following.
  for (const vKey of allVendorKeys) {
    const others = pickN(allVendorKeys, randInt(0, 2), vKey);
    for (const oKey of others) addEdge(vendorDocs[vKey]._id, vendorDocs[oKey]._id);
  }

  await FollowEdgeModel.insertMany(edges.map((e) => ({ ...e, isDemo: true })));

  const followerCounts = new Map<string, number>();
  const followingCounts = new Map<string, number>();
  for (const e of edges) {
    followingCounts.set(String(e.followerId), (followingCounts.get(String(e.followerId)) ?? 0) + 1);
    followerCounts.set(String(e.followingId), (followerCounts.get(String(e.followingId)) ?? 0) + 1);
  }
  const allPeopleDocs = [...Object.values(vendorDocs), ...Object.values(userDocs)];
  for (const p of allPeopleDocs) {
    await UserModel.updateOne(
      { _id: p._id },
      {
        $set: {
          followersCount: followerCounts.get(String(p._id)) ?? 0,
          followingCount: followingCounts.get(String(p._id)) ?? 0,
        },
      },
    );
  }
  console.log(`Created ${edges.length} follow relationships.`);

  // --- Posts -----------------------------------------------------------
  const postDocs: any[] = [];

  // One photo post per vendor, tied to one of their own treks.
  for (const v of VENDORS) {
    const ownTreks = VENDOR_TREKS.filter((t) => t.organizerKey === v.key);
    if (!ownTreks.length) continue;
    const t = ownTreks[randInt(0, ownTreks.length - 1)];
    const trek = trekDocs[t.key];
    postDocs.push(
      await PostModel.create({
        authorId: vendorDocs[v.key]._id,
        type: 'photo',
        images: [img(`post-${v.key}-${t.key}-1`), img(`post-${v.key}-${t.key}-2`)],
        caption: `Group from last weekend's ${t.title} — perfect weather, full crew. Next batch open now!`,
        trekId: trek._id,
        likeCount: 0,
        isDemo: true,
      }),
    );
  }

  // A handful of personal photo posts from regular trekkers.
  const personalPostUsers = pickN(allUserKeys, 6);
  for (const uKey of personalPostUsers) {
    const anyTrekKey = [...Object.keys(trekDocs)][randInt(0, Object.keys(trekDocs).length - 1)];
    const trek = trekDocs[anyTrekKey];
    postDocs.push(
      await PostModel.create({
        authorId: userDocs[uKey]._id,
        type: 'photo',
        images: [img(`post-${uKey}-${anyTrekKey}`)],
        caption: `Back from ${trek.title} — legs are done but so worth it.`,
        trekId: trek._id,
        likeCount: 0,
        isDemo: true,
      }),
    );
  }

  // Peer-trek posts — one per peer trek, from its organizer.
  for (const t of PEER_TREKS) {
    const trek = trekDocs[t.key];
    postDocs.push(
      await PostModel.create({
        authorId: userDocs[t.organizerKey]._id,
        type: 'peer-trek',
        images: [img(`trek-${t.key}`)],
        caption: t.summary,
        trekId: trek._id,
        likeCount: 0,
        isDemo: true,
      }),
    );
  }
  console.log(`Created ${postDocs.length} posts.`);

  // --- Likes -----------------------------------------------------------
  let totalLikes = 0;
  for (const post of postDocs) {
    const candidates = allPeopleDocs.filter((p) => String(p._id) !== String(post.authorId));
    const likers = pickN(candidates, randInt(3, 8));
    if (!likers.length) continue;
    await LikeModel.insertMany(
      likers.map((liker) => ({ userId: liker._id, postId: post._id, isDemo: true })),
    );
    await PostModel.updateOne({ _id: post._id }, { $set: { likeCount: likers.length } });
    totalLikes += likers.length;
  }
  console.log(`Created ${totalLikes} likes across ${postDocs.length} posts.`);

  // --- Join requests (peer treks) -----------------------------------------
  let totalJoinRequests = 0;
  let totalAccepted = 0;
  for (const t of PEER_TREKS) {
    const trek = trekDocs[t.key];
    const organizerKey = t.organizerKey;
    const candidates = allUserKeys.filter((k) => k !== organizerKey);
    const requesters = pickN(candidates, randInt(2, 4));
    for (const rKey of requesters) {
      const roll = Math.random();
      const status = roll < 0.6 ? 'accepted' : roll < 0.85 ? 'pending' : 'declined';
      await JoinRequestModel.create({
        trekId: trek._id,
        requesterId: userDocs[rKey]._id,
        status,
        respondedAt: status === 'pending' ? null : new Date(),
        isDemo: true,
      });
      totalJoinRequests += 1;
      if (status === 'accepted') totalAccepted += 1;
    }
  }
  console.log(`Created ${totalJoinRequests} join requests (${totalAccepted} already accepted / "joined").`);

  // --- Summary -----------------------------------------------------------
  console.log('\n=== Demo data seeded ===');
  console.log(`Password for every demo account: ${DEMO_PASSWORD}`);
  console.log('Vendor logins:');
  for (const v of VENDORS) console.log(`  ${v.email}`);
  console.log('Trekker logins:');
  for (const u of USERS) console.log(`  ${u.email}`);
  console.log('\nTo remove all of this later: npm run seed:demo:wipe');
  console.log('(deletes every document with isDemo:true across users, treks, posts, follow edges, likes, and join requests — never touches anything else)');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
