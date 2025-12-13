const {User,UserSkill,UserTargetRole, Question, Answer} = require("../models")
const { Op } = require('sequelize');
const { autoAwardBadges } = require("./badgeController");

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
  const { id, email, name, job_title, band_level, department, target_role,accountType } = req.body;

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
      band_level,
      department,
      target_role,
      points: 0,
      accountType
    });

    if (target_role) {
      await UserTargetRole.create({
        role_name: target_role,
        userId: user.id, // assumes association: User.hasMany(UserTargetRole)
      });
    }

    res.status(201).json(user);
  } catch (error) {
    console.error('Create User Error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

// PUT /api/users/toggle-admin/:id
exports.toggleAdmin = async (req, res) => {
  const { id } = req.params;

  if (!id) return res.status(400).json({ error: "User ID is required" });

  try {
    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Toggle between USER and ADMIN
    user.accountType = user.accountType === "ADMIN" ? "USER" : "ADMIN";

    await user.save();

    res.status(200).json({
      message: `User role updated successfully`,
      user,
    });
  } catch (error) {
    console.error("Toggle Admin Error:", error);
    res.status(500).json({ error: "Failed to toggle user role" });
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

exports.updateUserPoints = async (req, res) => {
  const { userId } = req.params;
  const { newPoints } = req.body;

  
  try {
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.points = newPoints;
    await user.save();

    await autoAwardBadges(userId, newPoints);

    res.json({ message: "Points updated and badges checked", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update points" });
  }
};


// GET /api/users/dashboard/:userId
exports.getDashboardData = async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ error: "Missing userId in request params" });
  }

  try {
    // 1. Fetch user with all target roles and their skills
    const user = await User.findByPk(userId, {
      attributes: ["id", "name", "points", "job_title", "target_timeline"],
      include: [
        {
          model: UserTargetRole,
          as: "targetRoles",
          attributes: ["id", "role_name", "timeline"],
          include: [
            {
              model: UserSkill,
              as: "skills",
              attributes: [
                "id",
                "skill_name",
                "level",
                "questions_answered",
                "votes_recieved",
              ],
            },
          ],
        },
      ],
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // 2. For each target role, fetch relevant questions & answers and compute role points
    const rolesWithProgress = user.targetRoles?.length
      ? await Promise.all(
          user.targetRoles.map(async (role) => {
            const skillNames = role.skills.map((s) => s.skill_name);

            // Recent questions tagged with this role's skills (for display)
            const recentQuestions = await Question.findAll({
              where: { tags: { [Op.overlap]: skillNames } },
              order: [["createdAt", "DESC"]],
              limit: 5,
            });

            // Recent answers by this user (for display)
            const recentAnswers = await Answer.findAll({
              where: { authorId: userId },
              include: [
                {
                  model: Question,
                  as: "question",
                  attributes: ["id", "title", "tags", "difficulty", "authorId"],
                  where: { tags: { [Op.overlap]: skillNames } },
                },
              ],
              order: [["createdAt", "DESC"]],
              limit: 5,
            });

            // --- Compute role-specific points (fetch ALL answers, no limit) ---
            const allRoleAnswers = await Answer.findAll({
              where: { authorId: userId },
              attributes: ["votes", "is_accepted"],
              include: [
                {
                  model: Question,
                  as: "question",
                  attributes: ["difficulty"],
                  where: { tags: { [Op.overlap]: skillNames } },
                  required: true,
                },
              ],
            });

            let rolePoints = 0;

            // Calculate points from ALL answers
            for (const ans of allRoleAnswers) {
              const diff = ans.question.difficulty;
              if (diff === "Junior") rolePoints += 10;
              if (diff === "Mid") rolePoints += 20;
              if (diff === "Senior") rolePoints += 30;

              // votes
              rolePoints += (ans.votes || 0) * 2;

              // accepted bonus
              if (ans.is_accepted) {
                rolePoints += 25;
              }
            }

            // Get ALL questions by user in this role for points
            const allRoleQuestions = await Question.findAll({
              where: {
                authorId: userId,
                tags: { [Op.overlap]: skillNames },
              },
              attributes: ["id"],
            });

            rolePoints += allRoleQuestions.length * 5;

            return {
              ...role.toJSON(),
              rolePoints,
              recentQuestions, // only 5 for display
              recentAnswers,   // only 5 for display
            };
          })
        )
      : [];

    // 3. Response payload
    res.json({
      user: {
        id: user.id,
        name: user.name,
        points: user.points, // total points
        job_title: user.job_title,
        target_timeline: user.target_timeline,
      },
      roles: rolesWithProgress,
    });
  } catch (error) {
    console.error("Dashboard Fetch Error:", error);
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
};

