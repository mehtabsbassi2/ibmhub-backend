const express = require("express");
const router = express.Router();
const {
  addUserToAdmin,
  removeUserFromAdmin,
  getUsersForAdmin,
  getAvailableUsersForAdmin,
} = require("../controllers/adminUserController");

// Add user to admin’s list
router.post("/add", addUserToAdmin);

// Remove user from admin’s list
router.delete("/remove", removeUserFromAdmin);

// Get all users managed by admin
router.get("/admin/:adminId/users", getUsersForAdmin);
router.get("/available/:adminId", getAvailableUsersForAdmin);



module.exports = router;
