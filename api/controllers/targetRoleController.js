const { UserTargetRole,UserSkill } = require("../models");

// ➕ Add a new target role for a user
exports.addUserTargetRole = async (req, res) => {
  try {
    
    const { userId, role_name, timeline } = req.body;

    if (!userId || !role_name) {
      return res.status(400).json({ error: "userId and role_name are required" });
    }

    const newTargetRole = await UserTargetRole.create({
      userId,
      role_name,
      timeline,
    });

    res.status(201).json(newTargetRole);
  } catch (err) {
    console.error("❌ Error adding user target role:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// 📥 Get all target roles for a user
exports.getUserTargetRoles = async (req, res) => {
  try {
    const { userId } = req.params;

    const roles = await UserTargetRole.findAll({
      where: { userId },
    });

    res.json(roles);
  } catch (err) {
    console.error("❌ Error fetching user target roles:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ❌ Delete a target role by ID
exports.deleteUserTargetRole = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await UserTargetRole.destroy({
      where: { id },
    });

    if (!deleted) {
      return res.status(404).json({ error: "Target role not found" });
    }

    res.json({ message: "Target role deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting user target role:", err);
    res.status(500).json({ error: "Server error" });
  }
};


//  Get all target roles with their related skills for a user
exports.getUserTargetRolesWithSkills = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const roles = await UserTargetRole.findAll({
      where: { userId },
      include: [
        {
          model: UserSkill,
          as: "skills",
          where: { authorId: userId },
          required: false, // include even if no skills exist
        },
      ],
      order: [["id", "ASC"]],
    });

    res.json(roles);
  } catch (err) {
    console.error("❌ Error fetching user target roles with skills:", err);
    res.status(500).json({ error: "Server error" });
  }
};
