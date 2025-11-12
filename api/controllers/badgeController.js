const { Badge, User, UserBadge } = require("../models");

// Automatically award badges when user crosses thresholds
exports.autoAwardBadges = async (userId, points) => {
  const thresholds = [
    { value: 100, name: "Achiever I" },
    { value: 250, name: "Achiever II" },
    { value: 500, name: "Career Mastery" },
  ];

 

  for (const t of thresholds) {
    if (points >= t.value) {
      const badge = await Badge.findOne({ where: { name: t.name } });
      if (!badge) {
        console.log(`⚠️ Badge not found: ${t.name}`);
        continue;
      }

      const exists = await UserBadge.findOne({ where: { userId, badgeId: badge.id } });

      if (!exists) {
        await UserBadge.create({ userId, badgeId: badge.id });
        console.log(`🏅 Awarded badge "${t.name}" to user ${userId}`);
      } else {
        console.log(`ℹ️ User already has badge "${t.name}"`);
      }
    }
  }
};

// Get all badges
exports.getAllBadges = async (req, res) => {
  try {
    const badges = await Badge.findAll();
    res.json(badges);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch badges" });
  }
};

// Get badges earned by a user
exports.getUserBadges = async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await User.findByPk(userId, { include: [{ model: Badge, as: "badges" }] });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user.badges);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user badges" });
  }
};
