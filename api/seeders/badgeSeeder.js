const { Badge } = require("../models");

const seedBadges = async () => {
  const badges = [
    { name: "Achiever I", description: "Earned 100 career points", image: "https://vvllpxejmairizoagesv.supabase.co/storage/v1/object/public/imbhub/achiever1.jpeg" },
    { name: "Achiever II", description: "Reached 250 points milestone", image: "https://vvllpxejmairizoagesv.supabase.co/storage/v1/object/public/imbhub/achiever2.jpg" },
    { name: "Career Mastery", description: "Achieved 500 career points", image: "https://vvllpxejmairizoagesv.supabase.co/storage/v1/object/public/imbhub/expert.jpg" },
  ];

  for (const badge of badges) {
    await Badge.findOrCreate({ where: { name: badge.name }, defaults: badge });
  }

  console.log("✅ Badge seeding complete");
};

module.exports = seedBadges;
