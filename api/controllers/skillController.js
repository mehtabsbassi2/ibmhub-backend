const {UserSkill} = require("../models");

// GET all skills for a specific user
exports.getSkillsByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const skills = await UserSkill.findAll({ where: { authorId: userId } });

    res.status(200).json(skills);
  } catch (error) {
    console.error("Error fetching skills:", error);
    res.status(500).json({ message: "Failed to retrieve skills" });
  }
};

// POST new skills (from a string array of skill names)
exports.addSkills = async (req, res) => {
  try {
    const { authorId, skillNames } = req.body; // skillNames: string[]
    if (!authorId || !Array.isArray(skillNames)) {
      return res.status(400).json({ message: "Invalid input" });
    }

    const existingSkills = await UserSkill.findAll({
      where: { authorId },
    });

    const existingNames = existingSkills.map((s) =>
      s.skill_name.toLowerCase()
    );

    const newSkills = skillNames
      .filter(
        (name) => !existingNames.includes(name.trim().toLowerCase())
      )
      .map((name) => ({
        authorId,
        skill_name: name.trim(),
      }));

    const created = await UserSkill.bulkCreate(newSkills);

    res.status(201).json(created);
  } catch (error) {
    console.error("Error adding skills:", error);
    res.status(500).json({ message: "Failed to add skills" });
  }
};

// PUT to update level or activity (vote/question)
exports.updateSkill = async (req, res) => {
  try {
    const { skillId } = req.params;
    const { level, questions_answered, votes_recieved } = req.body;

    const skill = await UserSkill.findByPk(skillId);
    if (!skill) return res.status(404).json({ message: "Skill not found" });

    if (level !== undefined) skill.level = level;
    if (questions_answered !== undefined) skill.questions_answered = questions_answered;
    if (votes_recieved !== undefined) skill.votes_recieved = votes_recieved;

    await skill.save();

    res.status(200).json(skill);
  } catch (error) {
    console.error("Error updating skill:", error);
    res.status(500).json({ message: "Failed to update skill" });
  }
};

// DELETE a skill
exports.deleteSkill = async (req, res) => {
  try {
    const { skillId } = req.params;

    const deleted = await UserSkill.destroy({ where: { id: skillId } });

    if (!deleted) {
      return res.status(404).json({ message: "Skill not found" });
    }

    res.status(200).json({ message: "Skill deleted successfully" });
  } catch (error) {
    console.error("Error deleting skill:", error);
    res.status(500).json({ message: "Failed to delete skill" });
  }
};
