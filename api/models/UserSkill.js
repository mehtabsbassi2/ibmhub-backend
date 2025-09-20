const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");


const UserSkill = sequelize.define("UserSkill", {
  skill_name: { type: DataTypes.STRING },
  level: { type: DataTypes.INTEGER, defaultValue: 0 },
  questions_answered: { type: DataTypes.INTEGER, defaultValue: 0 },
  votes_recieved: { type: DataTypes.INTEGER, defaultValue: 0 },
  authorId: { type: DataTypes.STRING, allowNull: false },
   targetRoleId: { type: DataTypes.INTEGER, allowNull: true },
});                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   


module.exports = UserSkill;
