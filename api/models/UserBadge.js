const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const UserBadge = sequelize.define("UserBadge", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  userId: { type: DataTypes.STRING, allowNull: false },
  badgeId: { type: DataTypes.INTEGER, allowNull: false },
  awardedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, { timestamps: false });

module.exports = UserBadge;
