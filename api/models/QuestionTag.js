// questionTag.js
const sequelize = require('../config/db');


const QuestionTag = sequelize.define('QuestionTag', {}, { timestamps: false });



module.exports = QuestionTag;
