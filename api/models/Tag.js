// tag.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Tag = sequelize.define('Tag', {
  name: { type: DataTypes.STRING, unique: true }
});

module.exports = Tag;
