const { Question, User,UserSkill, Answer, Vote } = require('../models');
const { Op, fn, col, literal } = require('sequelize');



// GET /api/questions
exports.getQuestions = async (req, res) => {
  const startTime = Date.now();
  const { search, tag, difficulty, is_solved, sort = 'newest', page = 1, userId } = req.query;
  
  console.log(`[QUESTIONS] GET /api/questions - Query params:`, { search, tag, difficulty, is_solved, sort, page, userId });
  
  try {
    const limit = 10;
    const offset = (page - 1) * limit;
    const where = {};

    if (search) {
      console.log(`[QUESTIONS] Applying search filter: "${search}"`);
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { content: { [Op.iLike]: `%${search}%` } },
      ];
    }

    if (difficulty) {
      console.log(`[QUESTIONS] Applying difficulty filter: ${difficulty}`);
      where.difficulty = difficulty;
    }

    if (is_solved !== undefined && is_solved !== 'all') {
      console.log(`[QUESTIONS] Applying solved status filter: ${is_solved}`);
      where.is_solved = is_solved === 'true';
    }

    if (tag) {
      console.log(`[QUESTIONS] Applying tag filter: ${tag}`);
      where.tags = { [Op.contains]: [tag] };
    }

    const order = {
      newest: [['createdAt', 'DESC']],
      oldest: [['createdAt', 'ASC']],
      mostVoted: [['votes', 'DESC']],
    }[sort] || [['createdAt', 'DESC']];

    console.log(`[QUESTIONS] Sorting by: ${sort}`);

    // Build attributes - add userVote as a subquery if userId provided
    const attributes = {
      include: [
        [
          literal(`(
            SELECT COUNT(*) FROM "Answers" AS a
            WHERE a."questionId" = "Question"."id"
          )`),
          'answerCount',
        ],
      ],
    };

    // Add userVote subquery if userId is provided
    if (userId) {
      attributes.include.push([
        literal(`(
          SELECT vote_type FROM "Votes" AS v
          WHERE v.item_id = "Question"."id" 
          AND v.item_type = 'question'
          AND v."authorId" = '${userId.replace(/'/g, "''")}'
          LIMIT 1
        )`),
        'userVote',
      ]);
    }

    const { rows: questions, count: total } = await Question.findAndCountAll({
      where,
      order,
      limit,
      offset,
      attributes,
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'name'],
        },
      ],
    });

    // Transform questions to proper JSON
    const transformedQuestions = questions.map(q => {
      const question = q.toJSON();
      // userVote is already included from the subquery
      return question;
    });

    const duration = Date.now() - startTime;
    console.log(`[QUESTIONS] Successfully fetched ${questions.length} questions out of ${total} total in ${duration}ms`);
    
    if (duration > 1000) {
      console.warn(`[PERFORMANCE] Slow query detected in getQuestions - Duration: ${duration}ms`);
    }

    res.status(200).json({
      questions: transformedQuestions,
      pagination: {
        total,
        page: parseInt(page),
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`[QUESTIONS] Get Questions Error after ${duration}ms:`, {
      message: err.message,
      stack: err.stack,
      query: { search, tag, difficulty, is_solved, sort, page, userId }
    });
    res.status(500).json({ error: err.toString() });
  }
};




// GET /api/questions/by-user-skills/:userId?page=1&limit=10&search=&tag=&difficulty=&is_solved=&sort=newest
exports.getQuestionsByUserSkills = async (req, res) => {
  const startTime = Date.now();
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

  console.log(`[QUESTIONS] GET /api/questions/by-user-skills/${userId} - Filters:`, { search, tag, difficulty, is_solved, sort, page, limit });

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const offset = (pageNum - 1) * limitNum;

  try {
    // 1. Get user's skill names
    console.log(`[QUESTIONS] Fetching skills for user: ${userId}`);
    const userSkills = await UserSkill.findAll({
      where: { authorId: userId },
      attributes: ["skill_name"],
    });

    if (!userSkills || userSkills.length === 0) {
      console.warn(`[QUESTIONS] No skills found for user: ${userId}`);
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
    console.log(`[QUESTIONS] Found ${skillNames.length} skills for user ${userId}:`, skillNames);

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

    console.log(`[QUESTIONS] Filtering by status: published and skills overlap`);

    if (search) {
      console.log(`[QUESTIONS] Applying search filter: "${search}"`);
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { content: { [Op.iLike]: `%${search}%` } },
      ];
    }

    if (difficulty) {
      console.log(`[QUESTIONS] Applying difficulty filter: ${difficulty}`);
      where.difficulty = difficulty;
    }

    if (is_solved !== undefined && is_solved !== "all") {
      console.log(`[QUESTIONS] Applying solved status filter: ${is_solved}`);
      where.is_solved = is_solved === "true";
    }

    if (tag) {
      console.log(`[QUESTIONS] Applying specific tag filter: ${tag}`);
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

    console.log(`[QUESTIONS] Sorting by: ${sort}`);

    // 3. Count total
    const totalCount = await Question.count({ where });
    console.log(`[QUESTIONS] Total matching questions: ${totalCount}`);

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

    const duration = Date.now() - startTime;
    console.log(`[QUESTIONS] Successfully fetched ${questions.length} personalized questions for user ${userId} in ${duration}ms`);
    
    if (duration > 1500) {
      console.warn(`[PERFORMANCE] Slow query in getQuestionsByUserSkills - Duration: ${duration}ms, User: ${userId}`);
    }

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
    const duration = Date.now() - startTime;
    console.error(`[QUESTIONS] Error fetching questions by user skills after ${duration}ms:`, {
      message: err.message,
      stack: err.stack,
      userId,
      filters: { search, tag, difficulty, is_solved, sort, page, limit }
    });
    res.status(500).json({ error: "Failed to fetch personalized questions" });
  }
};


// POST /api/questions
exports.createQuestion = async (req, res) => {
  const startTime = Date.now();
  const { title, content, tags, difficulty, skill_points, author_id, status } = req.body;
  
  console.log(`[QUESTIONS] POST /api/questions - Creating question:`, {
    author_id,
    status,
    difficulty,
    tags,
    hasTitle: !!title,
    hasContent: !!content,
    contentLength: content?.length
  });

  try {
     if (status === "published") {
      if (!title || !content || !tags || !difficulty || !author_id) {
        console.warn(`[QUESTIONS] Validation failed for published question:`, {
          hasTitle: !!title,
          hasContent: !!content,
          hasTags: !!tags,
          hasDifficulty: !!difficulty,
          hasAuthorId: !!author_id
        });
        return res.status(400).json({ error: "Missing required fields" });
      }
    } else {
      if (!author_id) {
        console.warn(`[QUESTIONS] Missing author_id for draft question`);
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

    console.log(`[QUESTIONS] Question created successfully - ID: ${question.id}, Status: ${status}`);

     if (status === "published") {
      console.log(`[POINTS] Awarding 5 points to user ${author_id} for publishing question ${question.id}`);
      await User.increment("points", { by: 5, where: { id: author_id } });
      console.log(`[POINTS] Points awarded successfully to user ${author_id}`);
    }

    const duration = Date.now() - startTime;
    console.log(`[QUESTIONS] Question creation completed in ${duration}ms - Question ID: ${question.id}`);

    res.status(201).json({success:true,question:question});
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`[QUESTIONS] Create Question Error after ${duration}ms:`, {
      message: err.message,
      stack: err.stack,
      author_id,
      status,
      difficulty,
      tags
    });
    res.status(500).json({ error: 'Failed to create question' });
  }
};

// GET /api/questions/drafts/:userId
exports.getDraftQuestionsByUser = async (req, res) => {
  const startTime = Date.now();
  const { userId } = req.params;
  const {
    search,
    tag,
    difficulty,
    sort = 'newest',
    page = 1,
  } = req.query;

  console.log(`[QUESTIONS] GET /api/questions/drafts/${userId} - Filters:`, { search, tag, difficulty, sort, page });

  const limit = 10;
  const offset = (page - 1) * limit;

  try {
    const where = {
      authorId: userId,
      status: 'draft',
    };

    console.log(`[QUESTIONS] Fetching draft questions for user: ${userId}`);

    // Search by title or content
    if (search) {
      console.log(`[QUESTIONS] Applying search filter: "${search}"`);
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { content: { [Op.iLike]: `%${search}%` } },
      ];
    }

    if (difficulty) {
      console.log(`[QUESTIONS] Applying difficulty filter: ${difficulty}`);
      where.difficulty = difficulty;
    }

    if (tag) {
      console.log(`[QUESTIONS] Applying tag filter: ${tag}`);
      where.tags = { [Op.contains]: [tag] };
    }

    const order = {
      newest: [['createdAt', 'DESC']],
      oldest: [['createdAt', 'ASC']],
      mostVoted: [['votes', 'DESC']],
    }[sort] || [['createdAt', 'DESC']];

    console.log(`[QUESTIONS] Sorting by: ${sort}`);

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

    const duration = Date.now() - startTime;
    console.log(`[QUESTIONS] Found ${questions.length} draft questions out of ${total} total for user ${userId} in ${duration}ms`);

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
    const duration = Date.now() - startTime;
    console.error(`[QUESTIONS] Error fetching draft questions after ${duration}ms:`, {
      message: err.message,
      stack: err.stack,
      userId,
      filters: { search, tag, difficulty, sort, page }
    });
    res.status(500).json({ error: 'Failed to fetch draft questions' });
  }
};

// GET /api/questions/published/:userId
exports.getPublishedQuestionsByUser = async (req, res) => {
  const startTime = Date.now();
  const { userId } = req.params;
  const {
    search,
    tag,
    difficulty,
    sort = 'newest',
    page = 1,
  } = req.query;

  console.log(`[QUESTIONS] GET /api/questions/published/${userId} - Filters:`, { search, tag, difficulty, sort, page });

  const limit = 10;
  const offset = (page - 1) * limit;

  try {
    const where = {
      authorId: userId,
      status: 'published',
    };

    console.log(`[QUESTIONS] Fetching published questions for user: ${userId}`);

    // Search by title or content
    if (search) {
      console.log(`[QUESTIONS] Applying search filter: "${search}"`);
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { content: { [Op.iLike]: `%${search}%` } },
      ];
    }

    if (difficulty) {
      console.log(`[QUESTIONS] Applying difficulty filter: ${difficulty}`);
      where.difficulty = difficulty;
    }

    if (tag) {
      console.log(`[QUESTIONS] Applying tag filter: ${tag}`);
      where.tags = { [Op.contains]: [tag] };
    }

    const order = {
      newest: [['createdAt', 'DESC']],
      oldest: [['createdAt', 'ASC']],
      mostVoted: [['votes', 'DESC']],
    }[sort] || [['createdAt', 'DESC']];

    console.log(`[QUESTIONS] Sorting by: ${sort}`);

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

    const duration = Date.now() - startTime;
    console.log(`[QUESTIONS] Found ${questions.length} published questions out of ${total} total for user ${userId} in ${duration}ms`);

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
    const duration = Date.now() - startTime;
    console.error(`[QUESTIONS] Error fetching published questions after ${duration}ms:`, {
      message: err.message,
      stack: err.stack,
      userId,
      filters: { search, tag, difficulty, sort, page }
    });
    res.status(500).json({ error: 'Failed to fetch published questions' });
  }
};


// GET /api/questions/:id
exports.getQuestionById = async (req, res) => {
  const startTime = Date.now();
  const id = req.params.id;
  const userId = req.query.userId; // FIXED: correctly read userId from query

  console.log(`[QUESTIONS] GET /api/questions/${id} - Fetching question by ID`);

  try {
    // Build attributes dynamically
    const attributes = { include: [] };

    if (userId) {
      attributes.include.push([
        literal(`(
          SELECT vote_type
          FROM "Votes" v
          WHERE v.item_id = "Question"."id"
          AND v.item_type = 'question'
          AND v."authorId" = '${userId.replace(/'/g, "''")}'
          LIMIT 1
        )`),
        "userVote",
      ]);
    }

    const question = await Question.findByPk(id, {
      attributes,
      include: [
        {
          model: User,
          as: "author",
          attributes: ["id", "name"],
        },
        // If you want answers, uncomment this:
        // {
        //   model: Answer,
        //   include: [{ model: User, as: "author", attributes: ["id", "name"] }],
        // },
      ],
    });

    if (!question) {
      console.warn(`[QUESTIONS] Question not found - ID: ${id}`);
      return res.status(404).json({ error: "Question not found" });
    }

    const duration = Date.now() - startTime;
    console.log(
      `[QUESTIONS] Question fetched successfully in ${duration}ms - ID: ${id}, Title: "${question.title}"`
    );

    res.json(question);
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`[QUESTIONS] Get Question Error after ${duration}ms:`, {
      message: err.message,
      stack: err.stack,
      questionId: id,
    });

    res.status(500).json({ error: "Failed to get question" });
  }
};

// DELETE /api/questions/:id
exports.deleteQuestion = async (req, res) => {
  const startTime = Date.now();
  const id = req.params.id;
  
  console.log(`[QUESTIONS] DELETE /api/questions/${id} - Attempting to delete question`);

  try {
    const question = await Question.findByPk(id);

    if (!question) {
      console.warn(`[QUESTIONS] Delete failed - Question not found: ${id}`);
      return res.status(404).json({ error: 'Question not found' });
    }

    console.log(`[QUESTIONS] Deleting question - ID: ${id}, Title: "${question.title}", Author: ${question.authorId}`);

    await question.destroy();
    
    const duration = Date.now() - startTime;
    console.log(`[QUESTIONS] Question deleted successfully in ${duration}ms - ID: ${id}`);

    res.json({ message: 'Question deleted' });
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`[QUESTIONS] Delete Question Error after ${duration}ms:`, {
      message: err.message,
      stack: err.stack,
      questionId: id
    });
    res.status(500).json({ error: 'Failed to delete question' });
  }
};


// PUT /api/questions/:id
exports.updateQuestion = async (req, res) => {
  const startTime = Date.now();
  const { id } = req.params;
  const { title, content, tags, difficulty, userId, status } = req.body;

  console.log(`[QUESTIONS] PUT /api/questions/${id} - Update request:`, {
    userId,
    hasTitle: !!title,
    hasContent: !!content,
    hasTags: !!tags,
    difficulty,
    status
  });

  if (!userId) {
    console.warn(`[QUESTIONS] Update failed - Missing userId for question ${id}`);
    return res.status(400).json({ error: 'userId is required for authentication' });
  }

  try {
    const question = await Question.findByPk(id);

    if (!question) {
      console.warn(`[QUESTIONS] Update failed - Question not found: ${id}`);
      return res.status(404).json({ error: 'Question not found' });
    }

    console.log(`[QUESTIONS] Found question - ID: ${id}, Current Author: ${question.authorId}, Requesting User: ${userId}, Current Status: ${question.status}`);

    // Check if the user is the author
    if (question.authorId !== userId) {
      console.warn(`[QUESTIONS] Authorization failed - User ${userId} attempted to edit question ${id} owned by ${question.authorId}`);
      return res.status(403).json({ error: 'You are not authorized to edit this question' });
    }

    // Only validate if the question is NOT a draft (or if changing from draft to published)
    const isDraft = question.status === 'draft' && (!status || status === 'draft');
    
    if (!isDraft) {
      console.log(`[QUESTIONS] Running validation - Question is being published or is already published`);
      
      // Validate fields
      const plain = content?.replace(/<[^>]+>/g, '').trim();
      if (plain?.length < 50 || plain?.length > 5000) {
        console.warn(`[QUESTIONS] Validation failed - Content length: ${plain?.length} (must be 50-5000)`);
        return res.status(400).json({ error: 'Content must be between 50 and 5000 characters' });
      }
      if (title?.length < 10 || title?.length > 150) {
        console.warn(`[QUESTIONS] Validation failed - Title length: ${title?.length} (must be 10-150)`);
        return res.status(400).json({ error: 'Title must be between 10 and 150 characters' });
      }
      if (tags && (!Array.isArray(tags) || tags.length < 1 || tags.length > 5)) {
        console.warn(`[QUESTIONS] Validation failed - Tags count: ${tags?.length} (must be 1-5)`);
        return res.status(400).json({ error: 'Tags must be an array of 1–5 items' });
      }
      if (difficulty && !['Junior', 'Mid', 'Senior'].includes(difficulty)) {
        console.warn(`[QUESTIONS] Validation failed - Invalid difficulty: ${difficulty}`);
        return res.status(400).json({ error: 'Invalid difficulty value' });
      }
      
      console.log(`[QUESTIONS] Validation passed - Updating question ${id}`);
    } else {
      console.log(`[QUESTIONS] Skipping validation - Question is a draft`);
    }

    // Perform update
    await question.update({
      title: title || question.title,
      content: content || question.content,
      tags: tags || question.tags,
      difficulty: difficulty || question.difficulty,
      status: status || question.status
    });

    const duration = Date.now() - startTime;
    console.log(`[QUESTIONS] Question updated successfully in ${duration}ms - ID: ${id}, New Status: ${question.status}`);

    res.json({ message: 'Question updated successfully', question });
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`[QUESTIONS] Update Question Error after ${duration}ms:`, {
      message: err.message,
      stack: err.stack,
      questionId: id,
      userId,
      updateData: { hasTitle: !!title, hasContent: !!content, hasTags: !!tags, difficulty, status }
    });
    res.status(500).json({ error: 'Failed to update question' });
  }
};
