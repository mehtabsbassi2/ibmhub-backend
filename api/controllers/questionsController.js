const { Question, User,UserSkill, Answer } = require('../models');
const { Op, fn, col, literal } = require('sequelize');



// GET /api/questions
exports.getQuestions = async (req, res) => {
  try {
    const {
      search,
      tag,
      difficulty,
      is_solved,
      sort = 'newest',
      page = 1,
    } = req.query;

    const limit = 10;
    const offset = (page - 1) * limit;

    const where = {};

    // Search by title or content
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { content: { [Op.iLike]: `%${search}%` } },
      ];
    }

    // Filter by difficulty
    if (difficulty) {
      where.difficulty = difficulty;
    }

    // Filter by solved status
    if (is_solved !== undefined && is_solved !== 'all') {
      where.is_solved = is_solved === 'true';
    }

    // Filter by tag (Postgres array contains)
    if (tag) {
      where.tags = { [Op.contains]: [tag] };
    }

    // Sorting options
    const order = {
      newest: [['createdAt', 'DESC']],
      oldest: [['createdAt', 'ASC']],
      mostVoted: [['votes', 'DESC']],
    }[sort] || [['createdAt', 'DESC']];

    const { rows: questions, count: total } = await Question.findAndCountAll({
      where,
      order,
      limit,
      offset,
      attributes: {
        include: [
          [
            literal(`(
              SELECT COUNT(*) FROM "Answers" AS a
              WHERE a."questionId" = "Question"."id"
            )`),
            'answerCount',
          ],
        ],
      },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'name'],
        },
      ],
    });

    res.status(200).json({
      questions,
      pagination: {
        total,
        page: parseInt(page),
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('Get Questions Error:', err);
    res.status(500).json({ error: err.toString() });
  }
};




// GET /api/questions/by-user-skills/:userId?page=1&limit=10&search=&tag=&difficulty=&is_solved=&sort=newest
exports.getQuestionsByUserSkills = async (req, res) => {
  const { userId } = req.params;
  const {
    search,
    tag,
    difficulty,
    is_solved,
    sort = 'newest',
    page = 1,
    limit = 20,
  } = req.query;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const offset = (pageNum - 1) * limitNum;

  try {
    // 1. Get user's skill names
    const userSkills = await UserSkill.findAll({
      where: { authorId: userId },
      attributes: ["skill_name"],
    });

    if (!userSkills || userSkills.length === 0) {
      return res.status(200).json({
        questions: [],
        pagination: {
          total: 0,
          page: pageNum,
          limit: limitNum,
          totalPages: 0,
        },
        message: "No skills found for user",
      });
    }

    const skillNames = userSkills.map(skill => skill.skill_name);

    // // 2. Build query filters
    // const where = {
    //   tags: {
    //     [Op.overlap]: skillNames, // must overlap with user skills
    //   },
    // };

    // 2. Build query filters
const where = {
  status: 'published', // 👈 Only published questions
  tags: {
    [Op.overlap]: skillNames,
  },
};


    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { content: { [Op.iLike]: `%${search}%` } },
      ];
    }

    if (difficulty) {
      where.difficulty = difficulty;
    }

    if (is_solved !== undefined && is_solved !== "all") {
      where.is_solved = is_solved === "true";
    }

    if (tag) {
      where.tags = {
        [Op.and]: [
          { [Op.overlap]: skillNames }, // must match skills
          { [Op.contains]: [tag] },     // must include selected tag
        ],
      };
    }

    const order = {
      newest: [["createdAt", "DESC"]],
      oldest: [["createdAt", "ASC"]],
      mostVoted: [["votes", "DESC"]],
    }[sort] || [["createdAt", "DESC"]];

    // 3. Count total
    const totalCount = await Question.count({ where });

    // 4. Fetch questions
    const questions = await Question.findAll({
      where,
      order,
      limit: limitNum,
      offset,
      attributes: {
        include: [
          [
            literal(`(
              SELECT COUNT(*)
              FROM "Answers" AS a
              WHERE a."questionId" = "Question"."id"
            )`),
            "answerCount",
          ],
        ],
      },
      include: [
        {
          model: User,
          as: "author",
          attributes: ["id", "name"],
        },
      ],
    });

    // 5. Return formatted response
    res.status(200).json({
      questions,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum),
      },
    });

  } catch (err) {
    console.error("Error fetching questions by user skills:", err);
    res.status(500).json({ error: "Failed to fetch personalized questions" });
  }
};


// POST /api/questions
exports.createQuestion = async (req, res) => {
  try {
    const { title, content, tags, difficulty, skill_points, author_id,status } = req.body;

     if (status === "published") {
      if (!title || !content || !tags || !difficulty || !author_id) {
        return res.status(400).json({ error: "Missing required fields" });
      }
    } else {
      if (!author_id) {
        return res.status(400).json({ error: "Author ID required" });
      }
    }

    const question = await Question.create({
      title,
      content,
      tags,
      difficulty,
      skill_points,
      status,
      authorId: author_id
    });

     if (status === "published") {
      await User.increment("points", { by: 5, where: { id: author_id } });
    }


    res.status(201).json({success:true,question:question});
  } catch (err) {
    console.error('Create Question Error:', err);
    res.status(500).json({ error: 'Failed to create question' });
  }
};

// GET /api/questions/drafts/:userId
exports.getDraftQuestionsByUser = async (req, res) => {
  const { userId } = req.params;
  const {
    search,
    tag,
    difficulty,
    sort = 'newest',
    page = 1,
  } = req.query;

  const limit = 10;
  const offset = (page - 1) * limit;

  try {
    const where = {
      authorId: userId,
      status: 'draft',
    };

    // Search by title or content
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { content: { [Op.iLike]: `%${search}%` } },
      ];
    }

    if (difficulty) {
      where.difficulty = difficulty;
    }

    if (tag) {
      where.tags = { [Op.contains]: [tag] };
    }

    const order = {
      newest: [['createdAt', 'DESC']],
      oldest: [['createdAt', 'ASC']],
      mostVoted: [['votes', 'DESC']],
    }[sort] || [['createdAt', 'DESC']];

    const { rows: questions, count: total } = await Question.findAndCountAll({
      where,
      order,
      limit,
      offset,
      attributes: {
        include: [
          [
            literal(`(
              SELECT COUNT(*)
              FROM "Answers" AS a
              WHERE a."questionId" = "Question"."id"
            )`),
            'answerCount',
          ],
        ],
      },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'name'],
        },
      ],
    });

    return res.status(200).json({
      questions,
      pagination: {
        total,
        page: parseInt(page),
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('Error fetching draft questions:', err.stack);
    res.status(500).json({ error: 'Failed to fetch draft questions' });
  }
};

// GET /api/questions/published/:userId
exports.getPublishedQuestionsByUser = async (req, res) => {
  const { userId } = req.params;
  const {
    search,
    tag,
    difficulty,
    sort = 'newest',
    page = 1,
  } = req.query;

  const limit = 10;
  const offset = (page - 1) * limit;

  try {
    const where = {
      authorId: userId,
      status: 'published',
    };

    // Search by title or content
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { content: { [Op.iLike]: `%${search}%` } },
      ];
    }

    if (difficulty) {
      where.difficulty = difficulty;
    }

    if (tag) {
      where.tags = { [Op.contains]: [tag] };
    }

    const order = {
      newest: [['createdAt', 'DESC']],
      oldest: [['createdAt', 'ASC']],
      mostVoted: [['votes', 'DESC']],
    }[sort] || [['createdAt', 'DESC']];

    const { rows: questions, count: total } = await Question.findAndCountAll({
      where,
      order,
      limit,
      offset,
      attributes: {
        include: [
          [
            literal(`(
              SELECT COUNT(*)
              FROM "Answers" AS a
              WHERE a."questionId" = "Question"."id"
            )`),
            'answerCount',
          ],
        ],
      },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'name'],
        },
      ],
    });

    return res.status(200).json({
      questions,
      pagination: {
        total,
        page: parseInt(page),
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('Error fetching published questions:', err.stack);
    res.status(500).json({ error: 'Failed to fetch published questions' });
  }
};


// GET /api/questions/:id
exports.getQuestionById = async (req, res) => {
  try {
    const id = req.params.id;

    const question = await Question.findByPk(id, {
      include: [
        { model: User, as: 'author', attributes: ['id', 'name'] },
        // {
        //   model: Answer,
        //   include: [{ model: User, as: 'author', attributes: ['id', 'name'] }]
        // }
      ]
    });

    if (!question) return res.status(404).json({ error: 'Question not found' });

    res.json(question);
  } catch (err) {
    console.error('Get Question Error:', err);
    res.status(500).json({ error: 'Failed to get question' });
  }
};

// DELETE /api/questions/:id
exports.deleteQuestion = async (req, res) => {
  try {
    const id = req.params.id;
    const question = await Question.findByPk(id);

    if (!question) return res.status(404).json({ error: 'Question not found' });

    await question.destroy();
    res.json({ message: 'Question deleted' });
  } catch (err) {
    console.error('Delete Question Error:', err);
    res.status(500).json({ error: 'Failed to delete question' });
  }
};


// PUT /api/questions/:id
exports.updateQuestion = async (req, res) => {
  const { id } = req.params;
  const { title, content, tags, difficulty, userId,status } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required for authentication' });
  }

  try {
    const question = await Question.findByPk(id);

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Check if the user is the author
    if (question.authorId !== userId) {
      return res.status(403).json({ error: 'You are not authorized to edit this question' });
    }

    // Validate fields
    const plain = content?.replace(/<[^>]+>/g, '').trim();
    if (plain?.length < 50 || plain?.length > 5000) {
      return res.status(400).json({ error: 'Content must be between 50 and 5000 characters' });
    }
    if (title?.length < 10 || title?.length > 150) {
      return res.status(400).json({ error: 'Title must be between 10 and 150 characters' });
    }
    if (tags && (!Array.isArray(tags) || tags.length < 1 || tags.length > 5)) {
      return res.status(400).json({ error: 'Tags must be an array of 1–5 items' });
    }
    if (difficulty && !['Junior', 'Mid', 'Senior'].includes(difficulty)) {
      return res.status(400).json({ error: 'Invalid difficulty value' });
    }

    // Perform update
    await question.update({
      title: title || question.title,
      content: content || question.content,
      tags: tags || question.tags,
      difficulty: difficulty || question.difficulty,
      status: status || question.status
    });

    res.json({ message: 'Question updated successfully', question });
  } catch (err) {
    console.error('Update Question Error:', err);
    res.status(500).json({ error: 'Failed to update question' });
  }
};

