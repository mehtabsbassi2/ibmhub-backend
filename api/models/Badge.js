const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Badge = sequelize.define("Badge", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.STRING },
  image: { type: DataTypes.STRING }, // URL for badge icon
}, { timestamps: false });

module.exports = Badge;
