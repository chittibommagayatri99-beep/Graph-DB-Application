/**
 * CineGraph Seed Script
 * ----------------------
 * Populates a CognoDB (openCypher / Bolt) instance with realistic movie data.
 *
 * Usage:
 *   node scripts/seed.js
 *
 * Requirements:
 *   Set COGNODB_URI, COGNODB_USER, COGNODB_PASSWORD in .env.local
 *   or export them as environment variables before running.
 *
 * What it does:
 *   1. Creates indexes and uniqueness constraints
 *   2. Clears existing data (idempotent re-runs)
 *   3. Loads genres, movies, people, and relationships in batches
 *      using parameterised Cypher — no string interpolation of data.
 */

// Load .env.local for local development
const fs = require("fs");
const path = require("path");

function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();

const neo4j = require("neo4j-driver");

// ─── Connection ───────────────────────────────────────────────────────────────

const URI      = process.env.COGNODB_URI;
const USER     = process.env.COGNODB_USER;
const PASSWORD = process.env.COGNODB_PASSWORD;

if (!URI || !USER || !PASSWORD) {
  console.error(
    "\n❌  Missing environment variables.\n" +
    "    Set COGNODB_URI, COGNODB_USER, and COGNODB_PASSWORD in .env.local\n"
  );
  process.exit(1);
}

const driver = neo4j.driver(URI, neo4j.auth.basic(USER, PASSWORD));

// ─── Seed Data ────────────────────────────────────────────────────────────────

const GENRES = [
  "Action", "Adventure", "Animation", "Comedy", "Crime",
  "Drama", "Fantasy", "Horror", "Romance", "Sci-Fi",
  "Thriller", "Western", "Mystery", "Biography", "History",
];

// People: directors and actors
const PEOPLE = [
  { id: "p-nolan",      name: "Christopher Nolan",  born: 1970, bio: "British-American director known for complex, cerebral blockbusters.", photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Christopher_Nolan_Cannes_2018.jpg/440px-Christopher_Nolan_Cannes_2018.jpg" },
  { id: "p-spielberg",  name: "Steven Spielberg",   born: 1946, bio: "Legendary American director behind some of cinema's greatest blockbusters.", photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Steven_Spielberg_by_Gage_Skidmore.jpg/440px-Steven_Spielberg_by_Gage_Skidmore.jpg" },
  { id: "p-kubrick",    name: "Stanley Kubrick",    born: 1928, bio: "Visionary director whose meticulous style defined cinema.", photo: "" },
  { id: "p-scorsese",   name: "Martin Scorsese",    born: 1942, bio: "Acclaimed director of gritty, character-driven crime dramas.", photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Martin_Scorsese_by_David_Shankbone.jpg/440px-Martin_Scorsese_by_David_Shankbone.jpg" },
  { id: "p-fincher",    name: "David Fincher",      born: 1962, bio: "Director known for dark, stylised thrillers.", photo: "" },
  { id: "p-tarantino",  name: "Quentin Tarantino",  born: 1963, bio: "Cult filmmaker celebrated for non-linear narratives and sharp dialogue.", photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Quentin_Tarantino_by_Gage_Skidmore.jpg/440px-Quentin_Tarantino_by_Gage_Skidmore.jpg" },
  { id: "p-villeneuve", name: "Denis Villeneuve",   born: 1967, bio: "Canadian director known for visually stunning science-fiction.", photo: "" },
  { id: "p-anderson",   name: "Wes Anderson",       born: 1969, bio: "Known for whimsical visual style and symmetrical compositions.", photo: "" },
  { id: "p-coppola",    name: "Francis Ford Coppola", born: 1939, bio: "Legendary director of The Godfather trilogy.", photo: "" },
  { id: "p-inarritu",   name: "Alejandro González Iñárritu", born: 1963, bio: "Mexican director known for intense, immersive dramas.", photo: "" },

  // Actors
  { id: "p-dicaprio",   name: "Leonardo DiCaprio",  born: 1974, bio: "Oscar-winning actor known for transformative roles.", photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Leonardo_Dicaprio_Cannes_2019.jpg/440px-Leonardo_Dicaprio_Cannes_2019.jpg" },
  { id: "p-hanks",      name: "Tom Hanks",           born: 1956, bio: "Two-time Oscar winner and one of Hollywood's most beloved actors.", photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Tom_Hanks_TIFF_2019.jpg/440px-Tom_Hanks_TIFF_2019.jpg" },
  { id: "p-streep",     name: "Meryl Streep",        born: 1949, bio: "Three-time Oscar winner widely regarded as the greatest actress of her generation.", photo: "" },
  { id: "p-pacino",     name: "Al Pacino",           born: 1940, bio: "Iconic American actor celebrated for intense performances.", photo: "" },
  { id: "p-deniro",     name: "Robert De Niro",      born: 1943, bio: "Two-time Oscar winner and frequent Scorsese collaborator.", photo: "" },
  { id: "p-johansson",  name: "Scarlett Johansson",  born: 1984, bio: "Versatile actress known for action, drama, and indie films.", photo: "" },
  { id: "p-depp",       name: "Johnny Depp",         born: 1963, bio: "Known for eccentric, character-driven roles.", photo: "" },
  { id: "p-blanchett",  name: "Cate Blanchett",      born: 1969, bio: "Two-time Oscar winner with exceptional range.", photo: "" },
  { id: "p-damon",      name: "Matt Damon",          born: 1970, bio: "Oscar-winning actor and co-writer of Good Will Hunting.", photo: "" },
  { id: "p-pitt",       name: "Brad Pitt",           born: 1963, bio: "Oscar-winning actor and acclaimed producer.", photo: "" },
  { id: "p-oldman",     name: "Gary Oldman",         born: 1958, bio: "Character actor celebrated for his transformation into complex roles.", photo: "" },
  { id: "p-murphy",     name: "Cillian Murphy",      born: 1976, bio: "Irish actor known for intensity and range.", photo: "" },
  { id: "p-hardy",      name: "Tom Hardy",           born: 1977, bio: "British actor known for physically transformative performances.", photo: "" },
  { id: "p-bale",       name: "Christian Bale",      born: 1974, bio: "Oscar-winning actor known for extreme physical transformations.", photo: "" },
  { id: "p-hathaway",   name: "Anne Hathaway",       born: 1982, bio: "Oscar-winning actress with a wide range of dramatic and comedic roles.", photo: "" },
  { id: "p-portman",    name: "Natalie Portman",     born: 1981, bio: "Oscar-winning actress and Harvard graduate.", photo: "" },
  { id: "p-fassbender", name: "Michael Fassbender",  born: 1977, bio: "German-Irish actor known for chameleonic performances.", photo: "" },
  { id: "p-gosling",    name: "Ryan Gosling",        born: 1980, bio: "Canadian actor known for nuanced, understated performances.", photo: "" },
  { id: "p-chalamet",   name: "Timothée Chalamet",  born: 1995, bio: "Rising star of his generation known for emotional depth.", photo: "" },
  { id: "p-washington", name: "Denzel Washington",  born: 1954, bio: "Two-time Oscar winner with commanding screen presence.", photo: "" },
  { id: "p-pfeiffer",   name: "Michelle Pfeiffer",  born: 1958, bio: "Acclaimed actress known for her versatility.", photo: "" },
  { id: "p-keitel",     name: "Harvey Keitel",      born: 1939, bio: "Intense character actor and frequent Tarantino/Scorsese collaborator.", photo: "" },
  { id: "p-roth",       name: "Tim Roth",            born: 1961, bio: "British actor and director known for independent films.", photo: "" },
  { id: "p-thurman",    name: "Uma Thurman",         born: 1970, bio: "Actress best known for her collaborations with Tarantino.", photo: "" },
  { id: "p-travolta",   name: "John Travolta",       born: 1954, bio: "Screen legend whose career was revitalized by Pulp Fiction.", photo: "" },
  { id: "p-jackson",    name: "Samuel L. Jackson",  born: 1948, bio: "One of the highest-grossing actors of all time.", photo: "" },
  { id: "p-spacey",     name: "Kevin Spacey",        born: 1959, bio: "Two-time Oscar winner known for complex villainous roles.", photo: "" },
  { id: "p-paltrow",    name: "Gwyneth Paltrow",    born: 1972, bio: "Oscar-winning actress.", photo: "" },
  { id: "p-foster",     name: "Jodie Foster",        born: 1962, bio: "Two-time Oscar winner and acclaimed director.", photo: "" },
  { id: "p-hopkins",    name: "Anthony Hopkins",    born: 1937, bio: "Oscar-winning actor known for Hannibal Lecter.", photo: "" },
];

// Movies with their cast and director references
const MOVIES = [
  {
    id: "m-inception", title: "Inception", year: 2010, rating: 8.8,
    runtime: 148, plot: "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.",
    poster: "https://image.tmdb.org/t/p/w500/edv5CZvWj09upOsy2Y6IwDhK8bt.jpg",
    genres: ["Sci-Fi", "Action", "Thriller"],
    director: "p-nolan",
    cast: [
      { person: "p-dicaprio", role: "Dom Cobb" },
      { person: "p-hardy",    role: "Eames" },
      { person: "p-murphy",   role: "Robert Fischer" },
      { person: "p-hathaway", role: "Ariadne" },
    ],
  },
  {
    id: "m-tdk", title: "The Dark Knight", year: 2008, rating: 9.0,
    runtime: 152, plot: "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.",
    poster: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    genres: ["Action", "Crime", "Drama"],
    director: "p-nolan",
    cast: [
      { person: "p-bale",   role: "Bruce Wayne / Batman" },
      { person: "p-oldman", role: "James Gordon" },
      { person: "p-hardy",  role: "Bane" },
      { person: "p-murphy", role: "Dr. Jonathan Crane" },
    ],
  },
  {
    id: "m-interstellar", title: "Interstellar", year: 2014, rating: 8.6,
    runtime: 169, plot: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
    poster: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    genres: ["Sci-Fi", "Drama", "Adventure"],
    director: "p-nolan",
    cast: [
      { person: "p-damon",    role: "Dr. Mann" },
      { person: "p-hathaway", role: "Dr. Amelia Brand" },
      { person: "p-murphy",   role: "Murph" },
    ],
  },
  {
    id: "m-oppenheimer", title: "Oppenheimer", year: 2023, rating: 8.3,
    runtime: 180, plot: "The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.",
    poster: "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    genres: ["Biography", "Drama", "History"],
    director: "p-nolan",
    cast: [
      { person: "p-murphy",  role: "J. Robert Oppenheimer" },
      { person: "p-damon",   role: "Leslie Groves" },
      { person: "p-blanchett", role: "Jean Tatlock" },
    ],
  },
  {
    id: "m-godfather", title: "The Godfather", year: 1972, rating: 9.2,
    runtime: 175, plot: "The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son.",
    poster: "https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsLe1rhdTP4ol.jpg",
    genres: ["Crime", "Drama"],
    director: "p-coppola",
    cast: [
      { person: "p-pacino",  role: "Michael Corleone" },
      { person: "p-keitel",  role: "Peter Clemenza" },
      { person: "p-duvall",  role: "Tom Hagen" },
    ],
  },
  {
    id: "m-goodfellas", title: "Goodfellas", year: 1990, rating: 8.7,
    runtime: 146, plot: "The story of Henry Hill and his life in the mob, covering his relationship with his wife Karen Hill and his mob partners.",
    poster: "https://image.tmdb.org/t/p/w500/aKuFiU82s5ISJpGZp7YkIr3kCUd.jpg",
    genres: ["Biography", "Crime", "Drama"],
    director: "p-scorsese",
    cast: [
      { person: "p-deniro",  role: "James Conway" },
      { person: "p-pesci",   role: "Tommy DeVito" },
    ],
  },
  {
    id: "m-taxi-driver", title: "Taxi Driver", year: 1976, rating: 8.2,
    runtime: 113, plot: "A mentally unstable veteran works as a nighttime taxi driver in New York City, where the decadence and sleaze feed his urge to violently lash out.",
    poster: "https://image.tmdb.org/t/p/w500/ekstpH614fwDX8DUln1a2Opz0N3.jpg",
    genres: ["Crime", "Drama"],
    director: "p-scorsese",
    cast: [
      { person: "p-deniro",  role: "Travis Bickle" },
      { person: "p-foster",  role: "Iris" },
      { person: "p-keitel",  role: "Sport" },
    ],
  },
  {
    id: "m-wolf", title: "The Wolf of Wall Street", year: 2013, rating: 8.2,
    runtime: 180, plot: "Based on the true story of Jordan Belfort, from his rise to a wealthy stockbroker living the high life to his fall involving crime and corruption.",
    poster: "https://image.tmdb.org/t/p/w500/34m2tygAYBGqA9MXKhRDtzYd4Kx.jpg",
    genres: ["Biography", "Comedy", "Crime"],
    director: "p-scorsese",
    cast: [
      { person: "p-dicaprio", role: "Jordan Belfort" },
      { person: "p-pitt",     role: "Brad" },
    ],
  },
  {
    id: "m-schindler", title: "Schindler's List", year: 1993, rating: 9.0,
    runtime: 195, plot: "In German-occupied Poland during World War II, industrialist Oskar Schindler gradually becomes concerned for his Jewish workforce.",
    poster: "https://image.tmdb.org/t/p/w500/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg",
    genres: ["Biography", "Drama", "History"],
    director: "p-spielberg",
    cast: [
      { person: "p-fiennes",  role: "Amon Göth" },
    ],
  },
  {
    id: "m-raiders", title: "Raiders of the Lost Ark", year: 1981, rating: 8.4,
    runtime: 115, plot: "In 1936, archaeologist and adventurer Indiana Jones is hired by the U.S. government to find the Ark of the Covenant before the Nazis.",
    poster: "https://image.tmdb.org/t/p/w500/ceG9VzoRAVGwivFU403Wc3AHRys.jpg",
    genres: ["Action", "Adventure"],
    director: "p-spielberg",
    cast: [
      { person: "p-ford",    role: "Indiana Jones" },
    ],
  },
  {
    id: "m-jurassic", title: "Jurassic Park", year: 1993, rating: 8.2,
    runtime: 127, plot: "During a preview tour, a theme park suffers a major power breakdown that allows its cloned dinosaur exhibits to run amok.",
    poster: "https://image.tmdb.org/t/p/w500/oU7Oq2kFAAlGqbU4VoAE36g4hoI.jpg",
    genres: ["Action", "Adventure", "Sci-Fi"],
    director: "p-spielberg",
    cast: [
      { person: "p-goldblum", role: "Dr. Ian Malcolm" },
      { person: "p-dern",     role: "Dr. Ellie Sattler" },
    ],
  },
  {
    id: "m-2001", title: "2001: A Space Odyssey", year: 1968, rating: 8.3,
    runtime: 149, plot: "After discovering a mysterious artifact buried beneath the Lunar surface, mankind sets off on a quest to find its origins with help from intelligent supercomputer H.A.L. 9000.",
    poster: "https://image.tmdb.org/t/p/w500/ve72VxNqjGM69Uky4WTo2bK6rfq.jpg",
    genres: ["Sci-Fi", "Adventure", "Mystery"],
    director: "p-kubrick",
    cast: [],
  },
  {
    id: "m-shining", title: "The Shining", year: 1980, rating: 8.4,
    runtime: 146, plot: "A family heads to an isolated hotel for the winter where a sinister presence influences the father into violence.",
    poster: "https://image.tmdb.org/t/p/w500/nRj5511mZdTl4saWEPoj9QroTIu.jpg",
    genres: ["Drama", "Horror"],
    director: "p-kubrick",
    cast: [
      { person: "p-nicholson", role: "Jack Torrance" },
      { person: "p-duvall_s",  role: "Wendy Torrance" },
    ],
  },
  {
    id: "m-fightclub", title: "Fight Club", year: 1999, rating: 8.8,
    runtime: 139, plot: "An insomniac office worker and a devil-may-care soap maker form an underground fight club that evolves into something much more.",
    poster: "https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
    genres: ["Drama", "Thriller"],
    director: "p-fincher",
    cast: [
      { person: "p-pitt",      role: "Tyler Durden" },
      { person: "p-norton",    role: "The Narrator" },
      { person: "p-bonham",    role: "Marla Singer" },
    ],
  },
  {
    id: "m-se7en", title: "Se7en", year: 1995, rating: 8.6,
    runtime: 127, plot: "Two detectives hunt a serial killer using the seven deadly sins as his motives.",
    poster: "https://image.tmdb.org/t/p/w500/6yoghtyTpznpBik8EngEmJskVUO.jpg",
    genres: ["Crime", "Drama", "Mystery", "Thriller"],
    director: "p-fincher",
    cast: [
      { person: "p-pitt",     role: "Detective David Mills" },
      { person: "p-freeman",  role: "Detective William Somerset" },
      { person: "p-paltrow",  role: "Tracy Mills" },
      { person: "p-spacey",   role: "John Doe" },
    ],
  },
  {
    id: "m-socialnetwork", title: "The Social Network", year: 2010, rating: 7.8,
    runtime: 120, plot: "The story of the founding of social networking website Facebook and the resulting lawsuits.",
    poster: "https://image.tmdb.org/t/p/w500/n0ybibhJtQ5icDqTp8eRytcIHJx.jpg",
    genres: ["Biography", "Drama"],
    director: "p-fincher",
    cast: [
      { person: "p-eisenberg", role: "Mark Zuckerberg" },
      { person: "p-timberlake", role: "Sean Parker" },
      { person: "p-garfield",  role: "Eduardo Saverin" },
    ],
  },
  {
    id: "m-pulpfiction", title: "Pulp Fiction", year: 1994, rating: 8.9,
    runtime: 154, plot: "The lives of two mob hitmen, a boxer, a gangster and his wife intertwine in four tales of violence and redemption.",
    poster: "https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
    genres: ["Crime", "Drama", "Thriller"],
    director: "p-tarantino",
    cast: [
      { person: "p-travolta", role: "Vincent Vega" },
      { person: "p-jackson",  role: "Jules Winnfield" },
      { person: "p-thurman",  role: "Mia Wallace" },
      { person: "p-roth",     role: "Pumpkin" },
      { person: "p-keitel",   role: "The Wolf" },
    ],
  },
  {
    id: "m-reservoir", title: "Reservoir Dogs", year: 1992, rating: 8.3,
    runtime: 99, plot: "After a simple jewelry heist goes terribly wrong, the surviving criminals begin to suspect that one of them is a police informant.",
    poster: "https://image.tmdb.org/t/p/w500/lsBnfheKZBO3UKU7lVHIeGZLWuF.jpg",
    genres: ["Crime", "Drama", "Thriller"],
    director: "p-tarantino",
    cast: [
      { person: "p-keitel",   role: "Mr. White" },
      { person: "p-roth",     role: "Mr. Orange" },
      { person: "p-buscemi",  role: "Mr. Pink" },
      { person: "p-madsen",   role: "Mr. Blonde" },
    ],
  },
  {
    id: "m-inglourious", title: "Inglourious Basterds", year: 2009, rating: 8.3,
    runtime: 153, plot: "In Nazi-occupied France during World War II, a plan to assassinate Nazi leaders by a group of Jewish U.S. soldiers coincides with a vengeful French cinema owner's similar plan.",
    poster: "https://image.tmdb.org/t/p/w500/7sfbEnaARXDDhKm0CZ7D7uc2sbo.jpg",
    genres: ["Adventure", "Drama", "War"],
    director: "p-tarantino",
    cast: [
      { person: "p-pitt",    role: "Lt. Aldo Raine" },
      { person: "p-roth",    role: "Sgt. Donny Donowitz" },
    ],
  },
  {
    id: "m-dune", title: "Dune", year: 2021, rating: 8.0,
    runtime: 155, plot: "Feature adaptation of Frank Herbert's science fiction novel about the son of a noble family entrusted with the protection of the most valuable asset in the galaxy.",
    poster: "https://image.tmdb.org/t/p/w500/d5NXSklpcvwE3HP2SmWeQGZHDeiA.jpg",
    genres: ["Action", "Adventure", "Drama", "Sci-Fi"],
    director: "p-villeneuve",
    cast: [
      { person: "p-chalamet",  role: "Paul Atreides" },
      { person: "p-zendaya",   role: "Chani" },
      { person: "p-blanchett", role: "Lady Fenring" },
      { person: "p-bautista",  role: "Glossu Rabban" },
    ],
  },
  {
    id: "m-arrival", title: "Arrival", year: 2016, rating: 7.9,
    runtime: 116, plot: "A linguist works with the military to communicate with alien lifeforms after twelve mysterious spacecraft appear around the world.",
    poster: "https://image.tmdb.org/t/p/w500/x2FJsf1ElAgr63Y3PNPtJrcmpoe.jpg",
    genres: ["Drama", "Mystery", "Sci-Fi"],
    director: "p-villeneuve",
    cast: [
      { person: "p-adams",     role: "Dr. Louise Banks" },
      { person: "p-renner",    role: "Ian Donnelly" },
    ],
  },
  {
    id: "m-blade-runner", title: "Blade Runner 2049", year: 2017, rating: 8.0,
    runtime: 164, plot: "A young blade runner discovers a long-buried secret that has the potential to plunge what's left of society into chaos.",
    poster: "https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg",
    genres: ["Action", "Drama", "Mystery", "Sci-Fi", "Thriller"],
    director: "p-villeneuve",
    cast: [
      { person: "p-gosling",   role: "Officer K" },
      { person: "p-ford",      role: "Rick Deckard" },
    ],
  },
  {
    id: "m-grand-budapest", title: "The Grand Budapest Hotel", year: 2014, rating: 8.1,
    runtime: 99, plot: "A writer encounters the owner of an aging European hotel between the wars and learns of his friendship with a young employee.",
    poster: "https://image.tmdb.org/t/p/w500/eWdyYQreja6JGCzqHWXpWHDrrPo.jpg",
    genres: ["Adventure", "Comedy", "Crime"],
    director: "p-anderson",
    cast: [
      { person: "p-fiennes",    role: "M. Gustave" },
      { person: "p-murray",     role: "M. Ivan" },
      { person: "p-brody",      role: "Dmitri Desgoffe-und-Taxis" },
      { person: "p-goldblum",   role: "Deputy Kovacs" },
    ],
  },
  {
    id: "m-revenant", title: "The Revenant", year: 2015, rating: 8.0,
    runtime: 156, plot: "A frontiersman on a fur trading expedition in the 1820s fights for survival after being mauled by a bear.",
    poster: "https://image.tmdb.org/t/p/w500/rMM4EE0hDjIVPmBMzeJLj0JPCZM.jpg",
    genres: ["Action", "Adventure", "Drama", "Thriller", "Western"],
    director: "p-inarritu",
    cast: [
      { person: "p-dicaprio",  role: "Hugh Glass" },
      { person: "p-hardy",     role: "John Fitzgerald" },
    ],
  },
  {
    id: "m-silence-lambs", title: "The Silence of the Lambs", year: 1991, rating: 8.6,
    runtime: 118, plot: "A young F.B.I. cadet must receive the help of an incarcerated and manipulative cannibal killer to catch another serial killer.",
    poster: "https://image.tmdb.org/t/p/w500/uS9m8OBk1A8eM9I042bx8XXpqAq.jpg",
    genres: ["Crime", "Drama", "Thriller"],
    director: "p-demme",
    cast: [
      { person: "p-foster",   role: "Clarice Starling" },
      { person: "p-hopkins",  role: "Dr. Hannibal Lecter" },
    ],
  },
  {
    id: "m-usual-suspects", title: "The Usual Suspects", year: 1995, rating: 8.5,
    runtime: 106, plot: "The sole survivor of a massacre tells police about a mysterious criminal kingpin known as Keyser Söze.",
    poster: "https://image.tmdb.org/t/p/w500/lhBHfPCbMkEO1Jf9kEjkKt3NcmH.jpg",
    genres: ["Crime", "Drama", "Mystery", "Thriller"],
    director: "p-singer",
    cast: [
      { person: "p-spacey",    role: "Roger 'Verbal' Kint" },
      { person: "p-palminteri", role: "Dave Kujan" },
      { person: "p-byrne",     role: "Dean Keaton" },
    ],
  },
  {
    id: "m-american-beauty", title: "American Beauty", year: 1999, rating: 8.3,
    runtime: 122, plot: "A sexually frustrated suburban father has a midlife crisis after becoming infatuated with his daughter's best friend.",
    poster: "https://image.tmdb.org/t/p/w500/wby9315QzVKmB7KNpTYBJGBBQIO.jpg",
    genres: ["Drama"],
    director: "p-mendes",
    cast: [
      { person: "p-spacey",   role: "Lester Burnham" },
    ],
  },
  {
    id: "m-whiplash", title: "Whiplash", year: 2014, rating: 8.5,
    runtime: 107, plot: "A promising young drummer enrolls at a cut-throat music conservatory where his dreams of greatness are mentored by an instructor who will stop at nothing to realise a student's potential.",
    poster: "https://image.tmdb.org/t/p/w500/eCb7dSB9mIBquMzJFu2OWVHkF8M.jpg",
    genres: ["Drama", "Music"],
    director: "p-chazelle",
    cast: [
      { person: "p-teller",    role: "Andrew Neiman" },
      { person: "p-simmons",   role: "Terence Fletcher" },
    ],
  },
  {
    id: "m-la-la-land", title: "La La Land", year: 2016, rating: 8.0,
    runtime: 128, plot: "While navigating their careers in Los Angeles, a pianist and an actress fall in love while attempting to reconcile their aspirations for the future.",
    poster: "https://image.tmdb.org/t/p/w500/ylXCdC106IKiarftHkcacasaAcb.jpg",
    genres: ["Comedy", "Drama", "Music", "Romance"],
    director: "p-chazelle",
    cast: [
      { person: "p-gosling",  role: "Sebastian Wilder" },
      { person: "p-stone",    role: "Mia Dolan" },
    ],
  },
  {
    id: "m-parasite", title: "Parasite", year: 2019, rating: 8.5,
    runtime: 132, plot: "Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.",
    poster: "https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
    genres: ["Comedy", "Drama", "Thriller"],
    director: "p-bong",
    cast: [],
  },
  {
    id: "m-no-country", title: "No Country for Old Men", year: 2007, rating: 8.2,
    runtime: 122, plot: "Violence and mayhem ensue after a hunter stumbles upon some dead bodies, a stash of heroin, and more than two million dollars in cash near the Rio Grande.",
    poster: "https://image.tmdb.org/t/p/w500/6d5XOczc0bIBUFHJwKyMQRgrFE6.jpg",
    genres: ["Crime", "Drama", "Thriller", "Western"],
    director: "p-coen",
    cast: [
      { person: "p-bardem",   role: "Anton Chigurh" },
      { person: "p-brolin",   role: "Llewelyn Moss" },
      { person: "p-jones",    role: "Sheriff Ed Tom Bell" },
    ],
  },
  {
    id: "m-big-lebowski", title: "The Big Lebowski", year: 1998, rating: 8.1,
    runtime: 117, plot: "Jeff 'The Dude' Lebowski, mistaken for a millionaire of the same name, seeks restitution for his ruined rug.",
    poster: "https://image.tmdb.org/t/p/w500/vT1E3e8VJ2vqr3GtG0LLfwmhwjm.jpg",
    genres: ["Comedy", "Crime"],
    director: "p-coen",
    cast: [
      { person: "p-bridges",  role: "Jeffrey Lebowski 'The Dude'" },
      { person: "p-goodman",  role: "Walter Sobchak" },
      { person: "p-buscemi",  role: "Donny Kerabatsos" },
    ],
  },
  {
    id: "m-heat", title: "Heat", year: 1995, rating: 8.3,
    runtime: 170, plot: "A group of professional bank robbers start to feel the heat from police when they unknowingly leave a clue at their latest heist.",
    poster: "https://image.tmdb.org/t/p/w500/umZOOSmI7GiAbmb7BFII6YSrfpx.jpg",
    genres: ["Action", "Crime", "Drama", "Thriller"],
    director: "p-mann",
    cast: [
      { person: "p-pacino",  role: "Lt. Vincent Hanna" },
      { person: "p-deniro",  role: "Neil McCauley" },
    ],
  },
  {
    id: "m-scarface", title: "Scarface", year: 1983, rating: 8.3,
    runtime: 170, plot: "In 1980 Miami, a determined Cuban immigrant takes over a drug cartel and succumbs to greed.",
    poster: "https://image.tmdb.org/t/p/w500/iQ5ztdjvteGeboxtmRdXEChFnzO.jpg",
    genres: ["Action", "Crime", "Drama"],
    director: "p-depalma",
    cast: [
      { person: "p-pacino",   role: "Tony Montana" },
      { person: "p-pfeiffer", role: "Elvira Hancock" },
    ],
  },
  {
    id: "m-batman-begins", title: "Batman Begins", year: 2005, rating: 8.2,
    runtime: 140, plot: "After witnessing his parents' death, Bruce Wayne travels to the Far East where he's trained by Ducard.",
    poster: "https://image.tmdb.org/t/p/w500/8RW2runSEc34IwKN2D1aPcJd2UL.jpg",
    genres: ["Action", "Adventure"],
    director: "p-nolan",
    cast: [
      { person: "p-bale",   role: "Bruce Wayne / Batman" },
      { person: "p-murphy", role: "Dr. Jonathan Crane / Scarecrow" },
      { person: "p-oldman", role: "Sgt. James Gordon" },
    ],
  },
  {
    id: "m-prestige", title: "The Prestige", year: 2006, rating: 8.5,
    runtime: 130, plot: "After a tragic accident, two stage magicians engage in a battle to create the ultimate illusion while sacrificing everything they have to outwit each other.",
    poster: "https://image.tmdb.org/t/p/w500/5MXyQfz8xUP3dIFPTubhTsbFY6N.jpg",
    genres: ["Drama", "Mystery", "Sci-Fi", "Thriller"],
    director: "p-nolan",
    cast: [
      { person: "p-bale",    role: "Alfred Borden" },
      { person: "p-jackman", role: "Robert Angier" },
      { person: "p-johansson", role: "Olivia Wenscombe" },
    ],
  },
  {
    id: "m-memento", title: "Memento", year: 2000, rating: 8.4,
    runtime: 113, plot: "A man with short-term memory loss attempts to track down his wife's murderer.",
    poster: "https://image.tmdb.org/t/p/w500/yuNs09hvpHVU1cBTCAk9zxsL2oW.jpg",
    genres: ["Mystery", "Thriller"],
    director: "p-nolan",
    cast: [
      { person: "p-pearce",   role: "Leonard Shelby" },
      { person: "p-pantoliano", role: "Teddy" },
    ],
  },
];

// Extra person references used in movies but not in main list
const EXTRA_PEOPLE = [
  { id: "p-duvall",     name: "Robert Duvall",      born: 1931, bio: "Oscar-winning American character actor.", photo: "" },
  { id: "p-pesci",      name: "Joe Pesci",          born: 1943, bio: "Oscar-winning actor known for volatile characters.", photo: "" },
  { id: "p-fiennes",    name: "Ralph Fiennes",      born: 1962, bio: "British actor of remarkable range and intensity.", photo: "" },
  { id: "p-ford",       name: "Harrison Ford",      born: 1942, bio: "Star of Star Wars and Indiana Jones.", photo: "" },
  { id: "p-goldblum",   name: "Jeff Goldblum",      born: 1952, bio: "Quirky character actor with wide appeal.", photo: "" },
  { id: "p-dern",       name: "Laura Dern",         born: 1967, bio: "Oscar-winning actress known for versatile performances.", photo: "" },
  { id: "p-nicholson",  name: "Jack Nicholson",     born: 1937, bio: "Three-time Oscar winner and Hollywood legend.", photo: "" },
  { id: "p-duvall_s",   name: "Shelley Duvall",     born: 1949, bio: "Actress known for The Shining.", photo: "" },
  { id: "p-norton",     name: "Edward Norton",      born: 1969, bio: "Oscar-nominated actor known for intense roles.", photo: "" },
  { id: "p-bonham",     name: "Helena Bonham Carter", born: 1966, bio: "Versatile British actress known for eccentric roles.", photo: "" },
  { id: "p-freeman",    name: "Morgan Freeman",     born: 1937, bio: "Oscar-winning actor with a distinctive voice.", photo: "" },
  { id: "p-eisenberg",  name: "Jesse Eisenberg",    born: 1983, bio: "Actor known for nervous, fast-talking characters.", photo: "" },
  { id: "p-timberlake", name: "Justin Timberlake",  born: 1981, bio: "Multi-talent musician and actor.", photo: "" },
  { id: "p-garfield",   name: "Andrew Garfield",    born: 1983, bio: "British-American actor known for Spider-Man.", photo: "" },
  { id: "p-buscemi",    name: "Steve Buscemi",      born: 1957, bio: "Character actor known for quirky, memorable roles.", photo: "" },
  { id: "p-madsen",     name: "Michael Madsen",     born: 1957, bio: "Character actor and frequent Tarantino collaborator.", photo: "" },
  { id: "p-zendaya",    name: "Zendaya",            born: 1996, bio: "Emmy-winning actress and singer.", photo: "" },
  { id: "p-bautista",   name: "Dave Bautista",      born: 1969, bio: "Former wrestler turned acclaimed actor.", photo: "" },
  { id: "p-adams",      name: "Amy Adams",          born: 1974, bio: "Six-time Oscar-nominated actress.", photo: "" },
  { id: "p-renner",     name: "Jeremy Renner",      born: 1971, bio: "Actor known for Hawkeye and action roles.", photo: "" },
  { id: "p-murray",     name: "Bill Murray",        born: 1950, bio: "Comedy legend with acclaimed dramatic work.", photo: "" },
  { id: "p-brody",      name: "Adrien Brody",       born: 1973, bio: "Oscar-winning actor, youngest to win Best Actor.", photo: "" },
  { id: "p-bardem",     name: "Javier Bardem",      born: 1969, bio: "Spanish actor, first to win Oscar for Spanish role.", photo: "" },
  { id: "p-brolin",     name: "Josh Brolin",        born: 1968, bio: "American actor known for physical, intense roles.", photo: "" },
  { id: "p-jones",      name: "Tommy Lee Jones",    born: 1946, bio: "Oscar-winning actor known for gruff authority.", photo: "" },
  { id: "p-bridges",    name: "Jeff Bridges",       born: 1949, bio: "Oscar-winning actor with a career spanning decades.", photo: "" },
  { id: "p-goodman",    name: "John Goodman",       born: 1952, bio: "Prolific character actor known for The Big Lebowski.", photo: "" },
  { id: "p-singer",     name: "Bryan Singer",       born: 1965, bio: "Director of The Usual Suspects and X-Men.", photo: "" },
  { id: "p-palminteri", name: "Chazz Palminteri",  born: 1952, bio: "Actor and playwright.", photo: "" },
  { id: "p-byrne",      name: "Gabriel Byrne",      born: 1950, bio: "Irish actor known for complex characters.", photo: "" },
  { id: "p-mendes",     name: "Sam Mendes",         born: 1965, bio: "Oscar-winning director of American Beauty and 1917.", photo: "" },
  { id: "p-chazelle",   name: "Damien Chazelle",    born: 1985, bio: "Youngest director to win Best Director Oscar.", photo: "" },
  { id: "p-stone",      name: "Emma Stone",         born: 1988, bio: "Two-time Oscar-winning actress.", photo: "" },
  { id: "p-teller",     name: "Miles Teller",       born: 1987, bio: "Actor known for Whiplash and Top Gun: Maverick.", photo: "" },
  { id: "p-simmons",    name: "J.K. Simmons",       born: 1955, bio: "Oscar-winning actor known for intense roles.", photo: "" },
  { id: "p-bong",       name: "Bong Joon-ho",       born: 1969, bio: "South Korean director, first to win Best Picture for non-English film.", photo: "" },
  { id: "p-coen",       name: "Joel Coen",          born: 1954, bio: "One half of the acclaimed Coen Brothers directing duo.", photo: "" },
  { id: "p-mann",       name: "Michael Mann",       born: 1943, bio: "Director known for stylish crime dramas.", photo: "" },
  { id: "p-depalma",    name: "Brian De Palma",     born: 1940, bio: "Director known for stylised crime films.", photo: "" },
  { id: "p-jackman",    name: "Hugh Jackman",       born: 1968, bio: "Australian actor best known as Wolverine.", photo: "" },
  { id: "p-pearce",     name: "Guy Pearce",         born: 1967, bio: "Australian actor known for L.A. Confidential.", photo: "" },
  { id: "p-pantoliano", name: "Joe Pantoliano",     born: 1951, bio: "Character actor known for Memento and The Sopranos.", photo: "" },
  { id: "p-demme",      name: "Jonathan Demme",     born: 1944, bio: "Oscar-winning director of The Silence of the Lambs.", photo: "" },
  { id: "p-pfeiffer",   name: "Michelle Pfeiffer",  born: 1958, bio: "Acclaimed actress known for versatility.", photo: "" },
];

// ─── Main Seed Function ───────────────────────────────────────────────────────

async function seed() {
  const session = driver.session({ defaultAccessMode: neo4j.session.WRITE });

  try {
    console.log("🔗 Verifying connection to CognoDB…");
    await driver.verifyConnectivity();
    console.log("✅ Connected.\n");

    // ── Step 1: Constraints & Indexes ─────────────────────────────────────────
    console.log("📐 Creating constraints and indexes…");
    const schema = [
      "CREATE CONSTRAINT movie_id_unique IF NOT EXISTS FOR (m:Movie) REQUIRE m.id IS UNIQUE",
      "CREATE CONSTRAINT person_id_unique IF NOT EXISTS FOR (p:Person) REQUIRE p.id IS UNIQUE",
      "CREATE CONSTRAINT genre_name_unique IF NOT EXISTS FOR (g:Genre) REQUIRE g.name IS UNIQUE",
      "CREATE INDEX movie_title IF NOT EXISTS FOR (m:Movie) ON (m.title)",
      "CREATE INDEX person_name IF NOT EXISTS FOR (p:Person) ON (p.name)",
    ];
    for (const stmt of schema) {
      await session.run(stmt);
    }
    console.log("✅ Schema ready.\n");

    // ── Step 2: Clear existing data ───────────────────────────────────────────
    console.log("🗑️  Clearing existing data…");
    await session.run("MATCH (n) DETACH DELETE n");
    console.log("✅ Cleared.\n");

    // ── Step 3: Genres ────────────────────────────────────────────────────────
    console.log("🎭 Loading genres…");
    for (const name of GENRES) {
      await session.run(
        "MERGE (g:Genre {name: $name})",
        { name }
      );
    }
    console.log(`✅ ${GENRES.length} genres loaded.\n`);

    // ── Step 4: People ────────────────────────────────────────────────────────
    const allPeople = [...PEOPLE, ...EXTRA_PEOPLE];
    // Deduplicate by id
    const peopleMap = new Map(allPeople.map((p) => [p.id, p]));
    const uniquePeople = [...peopleMap.values()];

    console.log(`👤 Loading ${uniquePeople.length} people…`);
    // Batch in groups of 20
    for (let i = 0; i < uniquePeople.length; i += 20) {
      const batch = uniquePeople.slice(i, i + 20);
      await session.run(
        `UNWIND $batch AS p
         MERGE (person:Person {id: p.id})
         SET person.name  = p.name,
             person.born  = p.born,
             person.bio   = p.bio,
             person.photo = p.photo`,
        { batch }
      );
    }
    console.log(`✅ People loaded.\n`);

    // ── Step 5: Movies + relationships ───────────────────────────────────────
    console.log(`🎬 Loading ${MOVIES.length} movies…`);
    for (const movie of MOVIES) {
      // Create the Movie node (parameterised — no interpolation)
      await session.run(
        `MERGE (m:Movie {id: $id})
         SET m.title   = $title,
             m.year    = $year,
             m.rating  = $rating,
             m.runtime = $runtime,
             m.plot    = $plot,
             m.poster  = $poster`,
        {
          id:      movie.id,
          title:   movie.title,
          year:    movie.year,
          rating:  movie.rating,
          runtime: movie.runtime,
          plot:    movie.plot,
          poster:  movie.poster,
        }
      );

      // HAS_GENRE relationships
      for (const genreName of movie.genres) {
        await session.run(
          `MATCH (m:Movie {id: $movieId}), (g:Genre {name: $genre})
           MERGE (m)-[:HAS_GENRE]->(g)`,
          { movieId: movie.id, genre: genreName }
        );
      }

      // DIRECTED relationship
      if (movie.director && peopleMap.has(movie.director)) {
        await session.run(
          `MATCH (p:Person {id: $personId}), (m:Movie {id: $movieId})
           MERGE (p)-[:DIRECTED]->(m)`,
          { personId: movie.director, movieId: movie.id }
        );
      }

      // ACTED_IN relationships
      for (const { person: personId, role } of (movie.cast ?? [])) {
        if (!peopleMap.has(personId)) continue;
        await session.run(
          `MATCH (p:Person {id: $personId}), (m:Movie {id: $movieId})
           MERGE (p)-[r:ACTED_IN]->(m)
           SET r.role = $role`,
          { personId, movieId: movie.id, role: role ?? "" }
        );
      }

      process.stdout.write(".");
    }
    console.log(`\n✅ Movies and relationships loaded.\n`);

    // ── Step 6: Summary ───────────────────────────────────────────────────────
    const stats = await session.run(`
      MATCH (m:Movie)  WITH count(m) AS movies
      MATCH (p:Person) WITH movies, count(p) AS people
      MATCH ()-[r]->() WITH movies, people, count(r) AS rels
      RETURN movies, people, rels
    `);
    const r = stats.records[0];
    console.log("📊 Database summary:");
    console.log(`   Movies      : ${r.get("movies")}`);
    console.log(`   People      : ${r.get("people")}`);
    console.log(`   Relationships: ${r.get("rels")}`);
    console.log("\n🎉 Seed complete! Your CineGraph database is ready.\n");

  } catch (err) {
    console.error("\n❌ Seed failed:", err.message);
    if (err.code) console.error("   Neo4j error code:", err.code);
    process.exit(1);
  } finally {
    await session.close();
    await driver.close();
  }
}

seed();
