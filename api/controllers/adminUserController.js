const { AdminUser, User, Badge } = require("../models");

// Add a user to an admin's list
exports.addUserToAdmin = async (req, res) => {
  try {
    const { adminId, userId } = req.body;

    console.log("adminid",adminId)
    console.log("userid",userId)
    if (!adminId || !userId)
      return res.status(400).json({ message: "adminId and userId are required" });

    // Prevent duplicates
    const exists = await AdminUser.findOne({ where: { adminId, userId } });
    if (exists) {
      return res.status(400).json({ message: "User already added to your list" });
    }

    const record = await AdminUser.create({ adminId, userId });
    return res.status(201).json({ message: "User added successfully", record });
  } catch (error) {
    console.error("Error adding user to admin:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Remove a user from an admin's list
exports.removeUserFromAdmin = async (req, res) => {
  try {
    const { adminId, userId } = req.body;

    if (!adminId || !userId)
      return res.status(400).json({ message: "adminId and userId are required" });

    const deleted = await AdminUser.destroy({ where: { adminId, userId } });

    if (!deleted)
      return res.status(404).json({ message: "User not found in your list" });

    return res.status(200).json({ message: "User removed successfully" });
  } catch (error) {
    console.error("Error removing user from admin:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

//  Get all users belonging to a specific admin
exports.getUsersForAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;

    const admin = await User.findByPk(adminId, {
      include: {
        model: User,
        as: "ManagedUsers",
        attributes: [
          "id",
          "name",
          "email",
          "job_title",
          "department",
          "band_level",
          "target_role",
          "points"
        ],
        through: { attributes: [] }, 

        // ⭐ ADD BADGES FOR EACH USER
        include: [
          {
            model: Badge,
            as: "badges",
            attributes: ["id", "name", "description", "image"],
            through: { attributes: ["awardedAt"] }
          }
        ]
      }
    });

    if (!admin)
      return res.status(404).json({ message: "Admin not found" });

    return res.status(200).json(admin.ManagedUsers);
  } catch (error) {
    console.error("Error fetching users for admin:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


// Get users who are NOT managed by a specific admin
exports.getAvailableUsersForAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;

    if (!adminId)
      return res.status(400).json({ message: "adminId is required" });

    // 1️⃣ Get all userIds already assigned to this admin
    const assigned = await AdminUser.findAll({
      where: { adminId },
      attributes: ["userId"],
    });

    const assignedUserIds = assigned.map((u) => u.userId);

    // 2️⃣ Fetch all users not in that list and not the admin themselves
    const availableUsers = await User.findAll({
      where: {
        id: {
          [require("sequelize").Op.notIn]: [...assignedUserIds, adminId],
        },
      },
      attributes: [
        "id",
        "name",
        "email",
        "job_title",
        "department",
        "band_level",
        "target_role",
        "points",
      ],
    });

    return res.status(200).json(availableUsers);
  } catch (error) {
    console.error("Error fetching available users:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};



