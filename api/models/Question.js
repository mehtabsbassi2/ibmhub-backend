const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Question = sequelize.define("Question", {
  title: { type: DataTypes.STRING(150), allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false },
  tags: { type: DataTypes.ARRAY(DataTypes.STRING) },
  difficulty: {
    type: DataTypes.ENUM("Junior", "Mid", "Senior"),
    allowNull: false,
  },
  skill_points: { type: DataTypes.INTEGER, defaultValue: 5 },
  votes: { type: DataTypes.INTEGER, defaultValue: 0 },
  is_solved: { type: DataTypes.BOOLEAN, defaultValue: false },
  status: {
    type: DataTypes.ENUM("draft", "published"),
    allowNull: false,
    defaultValue: "published",
  },
},{timestamps : true});


module.exports = Question;
