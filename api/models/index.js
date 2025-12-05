const sequelize = require('../config/db');

const User = require('./User');
const Question = require('./Question');
const Answer = require('./Answer');
const UserSkill = require('./UserSkill');
const CareerProgress = require('./CareerProgress');
const Vote = require('./Vote');

const UserTargetRole = require("./UserTargetRole")
const AdminUser = require("./AdminUser"); // 👈 New import
const Badge = require('./Badge');
const UserBadge = require('./UserBadge');



// Associations
Question.belongsTo(User, { as: "author" });
Answer.belongsTo(User, { as: "author" });
Answer.belongsTo(Question, { as: "question" });
UserSkill.belongsTo(User, { as: 'author', foreignKey: 'authorId' });
User.hasMany(UserSkill, { as: 'skills', foreignKey: 'authorId' });


User.hasMany(UserTargetRole, { as: "targetRoles", foreignKey: "userId" });
UserTargetRole.belongsTo(User, { as: "user", foreignKey: "userId" });


User.belongsToMany(Badge, { through: UserBadge, as: "badges", foreignKey: "userId" });
Badge.belongsToMany(User, { through: UserBadge, as: "users", foreignKey: "badgeId" });

UserTargetRole.hasMany(UserSkill, { as: "skills", foreignKey: "targetRoleId" });
UserSkill.belongsTo(UserTargetRole, { as: "targetRole", foreignKey: "targetRoleId" });

CareerProgress.belongsTo(User, { as: "author" });
Vote.belongsTo(User, { as: "author" });



// Ensure model imports are initialized and relationships are registered

User.belongsToMany(User, {
  through: AdminUser,
  as: "ManagedUsers",   // admin → users they manage
  foreignKey: "adminId",
  otherKey: "userId",
});

User.belongsToMany(User, {
  through: AdminUser,
  as: "Admins",         // user → admins they belong to
  foreignKey: "userId",
  otherKey: "adminId",
});

const syncDB = async () => {
  try {
    await sequelize.sync({ alter: true }); // Use force: true in dev to reset
    console.log('All models were synchronized successfully.');
  } catch (error) {
    console.error('Error syncing models:', error);
  }
};

module.exports = {
  sequelize,
  User,
  Question,
  Answer,
  UserSkill,
  CareerProgress,
  Vote,
  UserTargetRole,
  AdminUser,
  Badge,
  UserBadge,
  syncDB
};
