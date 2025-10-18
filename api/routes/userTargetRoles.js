const express = require("express");
const router = express.Router();
const controller = require("../controllers/targetRoleController");

// ➕ Add new target role
router.post("/", controller.addUserTargetRole);

// 📥 Get all target roles for a user
router.get("/:userId", controller.getUserTargetRoles);

// ❌ Delete target role by ID
router.delete("/:id", controller.deleteUserTargetRole);

router.get("/:userId/roles-with-skills", controller.getUserTargetRolesWithSkills);



module.exports = router;
