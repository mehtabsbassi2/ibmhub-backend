const { DataTypes} = require("sequelize");
const sequelize = require("../config/db");

const Answer = sequelize.define("Answer", {
  content: { type: DataTypes.TEXT, allowNull: false },
  votes: { type: DataTypes.INTEGER, defaultValue: 0 },
  is_accepted: { type: DataTypes.BOOLEAN, defaultValue: false },
},{timestamps : true});


module.exports = Answer;
