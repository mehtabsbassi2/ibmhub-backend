const {DataTypes} = require('sequelize')

const sequelize = require("../config/db")

const Vote = sequelize.define('Vote', {
  item_id: { type: DataTypes.INTEGER, allowNull: false },
  item_type: { type: DataTypes.ENUM('question', 'answer'), allowNull: false },
  vote_type: { type: DataTypes.ENUM('upvote', 'downvote'), allowNull: false }
});


module.exports = Vote;