// models/AdminUser.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./User');

const AdminUser = sequelize.define('AdminUser', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  adminId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  }
}, { timestamps: true });

module.exports = AdminUser;
