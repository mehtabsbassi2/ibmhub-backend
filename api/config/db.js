// const { Sequelize } = require('sequelize');
// const pg = require("pg");
// const sequelize = new Sequelize('ibmhub', 'postgres', 'xxxxx', {
//   host: 'localhost',
//   dialect: 'postgres',
//   dialectModule: pg,
//   logging: false, // optional
// });

// module.exports = sequelize;



const { Sequelize } = require("sequelize");
const pg = require("pg");
const sequelize = new Sequelize(
  "postgres",
  "postgres.vvllpxejmairizoagesv",
  "@Ibmhub25",
  {
    host: "aws-0-eu-north-1.pooler.supabase.com",
    port: 5432,
    dialect: "postgres",
    dialectModule: pg,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
    logging: false,
  }
);

module.exports = sequelize;






