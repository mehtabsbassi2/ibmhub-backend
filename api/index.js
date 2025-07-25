const express = require('express')
const serverless = require('serverless-http');
const {syncDB,sequelize} = require("./models")
const questionRoutes = require('./routes/questions');
const userRoutes = require("./routes/users")
const answerRoutes = require("./routes/answers")
const voteRoutes = require("./routes/votes")
const skillRoutes = require("./routes/skills")
const cors = require('cors');



const app = express()
const PORT = 5000;
app.use(cors())
app.use(express.json())

app.use("/api/users", userRoutes)
app.use("/api/questions", questionRoutes)
app.use("/api/answers", answerRoutes)
app.use("/api/votes", voteRoutes)
app.use("/api/skills",skillRoutes)




app.get("/",(req,res)=>res.send("API is live!!!"));

sequelize.authenticate()
  .then(() => console.log('✅ Connected to Supabase PostgreSQL'))
  .catch(err => console.error('❌ Connection failed:', err));


syncDB().then(()=>{
     app.listen(PORT,()=>{
         console.log(`Server running on http://localhost:${PORT}`);
     })
})

module.exports = serverless(app);


