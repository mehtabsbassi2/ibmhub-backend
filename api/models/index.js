const sequelize = require('../config/db');

const User = require('./User');
const Question = require('./Question');
const Answer = require('./Answer');
const UserSkill = require('./UserSkill');
const CareerProgress = require('./CareerProgress');
const Vote = require('./Vote');
const Tag = require('./Tag');
const QuestionTag = require('./QuestionTag');


// Associations
Question.belongsTo(User, { as: "author" });
Answer.belongsTo(User, { as: "author" });
Answer.belongsTo(Question, { as: "question" });
UserSkill.belongsTo(User, { as: 'author', foreignKey: 'authorId' });
User.hasMany(UserSkill, { as: 'skills', foreignKey: 'authorId' });

CareerProgress.belongsTo(User, { as: "author" });
Vote.belongsTo(User, { as: "author" });

Question.belongsToMany(Tag, { through: QuestionTag });
Tag.belongsToMany(Question, { through: QuestionTag });

// Ensure model imports are initialized and relationships are registered

const syncDB = async () => {
  try {
    await sequelize.sync(); // Use force: true in dev to reset
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
  Tag,
  QuestionTag,
  syncDB
};

