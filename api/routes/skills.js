const express = require("express");
const router = express.Router();
const skillController = require("../controllers/skillController");

router.get("/:userId", skillController.getSkillsByUser);
router.post("/", skillController.addSkills);
router.put("/:skillId", skillController.updateSkill);
router.delete("/:skillId", skillController.deleteSkill);

module.exports = router;
