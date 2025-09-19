// models/UserTargetRole.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const UserTargetRole = sequelize.define("UserTargetRole", {
  role_name: { type: DataTypes.STRING, allowNull: false },
  timeline: { type: DataTypes.DATE }, // optional individual timeline
}, { timestamps: false });

module.exports = UserTargetRole;
