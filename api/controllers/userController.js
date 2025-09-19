const {User,UserSkill, UserTargetRole,Question, Answer} = require("../models")
const { Op } = require('sequelize');

//Post /api/auth/login
exports.login = async (req,res)=>{
    const {email} = req.body
    if(!email) return res.status(500).json({error:"Email is required"})

        try {
            let user = await User.findOne({where : {email}})
            if(user){
                return res.status(200).json(user)
            }else{
                return res.status(200).json({message:"user not found"})
            }
        } catch (error) {
            console.log("Error",error)
            return res.status(500).json({message:"Internal server  error"})
        }
}

// POST /api/users
exports.createUser = async (req, res) => {
  const { id, email, name, job_title, band_level, department, target_role } = req.body;

  if (!id || !email || !name || !job_title || !band_level) {
    return res.status(400).json({ error: 'id, email, name, job title and band level are required' });
  }

  try {
    const existing = await User.findOne({ where: { email } });

    if (existing) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const user = await User.create({
      id, // Supabase UUID
      email,
      name,
      job_title,
      band_level: parseInt(band_level),
      department,
      target_role,
      points: 0,
    });

    res.status(201).json(user);
  } catch (error) {
    console.error('Create User Error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};


//Get all users
exports.getAllUsers =async (req,res)=>{
try {
    const users =await User.findAll()
    res.status(200).json(users)
} catch (error) {
    console.error('Get All Users Error:', err);
    res.status(500).json({ error: 'Failed to retrieve users' });
}
}

// GET /api/users/profile/:email
exports.getProfile = async (req, res) => {
  const { email } = req.params;

  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const user = await User.findOne({
      where: { email },
      include: [
        {
          model: UserTargetRole,
          as: "targetRoles",
          include: [
            {
              model: UserSkill,
              as: "skills"
            }
          ]
        }
      ]
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    res.status(200).json(user);
  } catch (err) {
    console.error('Get Profile Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/users/:id
exports.getUserById = async (req, res) => {
  const id = req.params.id;

  try {
    const user = await User.findByPk(id, {
      include: [
        {
          model: UserTargetRole,
          as: "targetRoles",
          include: [
            {
              model: UserSkill,
              as: "skills"
            }
          ]
        }
      ]
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json(user);
  } catch (err) {
    console.error('Get User by ID Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /api/users/profile
exports.updateProfile = async (req, res) => {
  const { email,name, job_title, band_level, department, target_role,target_timeline } = req.body;

  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const user = await User.findOne({ where: { email } });

    if (!user) return res.status(404).json({ error: 'User not found' });

    // Update only provided fields
    user.name = name ?? user.name;
    user.job_title = job_title ?? user.job_title;
    user.band_level = band_level ?? user.band_level;
    user.department = department ?? user.department;
    user.target_role = target_role ?? user.target_role;
     user.target_timeline = target_timeline ?? user.target_timeline;

    await user.save();
    res.status(200).json(user);
  } catch (err) {
    console.error('Update Profile Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/users/dashboard/:userId
exports.getDashboardData = async (req, res) => {
 const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ error: "Missing userId in request params" });
  }

  try {
    // Fetch user and skills
    const user = await User.findByPk(userId, {
      attributes: ['id', 'name', 'points', 'target_role','job_title',"target_timeline"]
    });

    const skills = await UserSkill.findAll({
      where: { authorId: userId },
      attributes: ['skill_name', 'level', 'questions_answered', 'votes_recieved']
    });

    const skillNames = skills.map(skill => skill.skill_name);

    // Fetch latest questions tagged with any user skills
    const recentQuestions = await Question.findAll({
      where: {
        tags: { [Op.overlap]: skillNames }
      },
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    // Fetch recent answers by user
    const recentAnswers = await Answer.findAll({
      where: { authorId: userId },
      order: [['createdAt', 'DESC']],
      limit: 5,
      include: [{ model: Question, as: 'question', attributes: ['id', 'title'] }]
    });

    res.json({
      user,
      skills,
      recentQuestions,
      recentAnswers
    });
  } catch (error) {
    console.error('Dashboard Fetch Error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
};

