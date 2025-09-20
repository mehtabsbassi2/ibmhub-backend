const { DataTypes } = require(`sequelize`);
const sequelize = require("../config/db");

const User = sequelize.define("User", {
  id: { type: DataTypes.STRING, primaryKey: true }, // Supabase UUID
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  job_title: { type: DataTypes.STRING, allowNull: false },
  band_level: { type: DataTypes.INTEGER, allowNull: false },
  department: { type: DataTypes.STRING },
  target_role: { type: DataTypes.STRING },
  target_timeline: { type: DataTypes.DATE },
  points: { type: DataTypes.INTEGER, defaultValue: 0 },
  accountType: { type: DataTypes.STRING },
},{timestamps:false});

module.exports = User;
