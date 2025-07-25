const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");


const CareerProgress = sequelize.define("CareerProgress", {
  current_role: { type: DataTypes.STRING },
  target_role: { type: DataTypes.STRING },
  progress_percentage: { type: DataTypes.INTEGER, defaultValue: 0 },
  skills_needed: { type: DataTypes.ARRAY(DataTypes.STRING) },
});


module.exports = CareerProgress;
