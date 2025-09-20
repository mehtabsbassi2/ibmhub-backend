const { Answer, User, Question,UserSkill } = require('../models');

// POST /api/answers
// exports.createAnswer = async (req, res) => {
//   const { content, authorId, questionId } = req.body;

//   if (!content || !authorId || !questionId) {
//     return res.status(400).json({ error: 'Content, authorId, and questionId are required' });
//   }

//   try {
//     // 1. Create the answer
//     const answer = await Answer.create({ content, authorId, questionId });

//     // 2. Fetch the question to award points based on difficulty
//     const question = await Question.findByPk(questionId);

//     if (question?.difficulty) {
//       let points = 10;
//       if (question.difficulty === 'Junior') points = 10;
//       else if (question.difficulty === 'Mid') points = 20;
//       else if (question.difficulty === 'Senior') points = 30;

//       await User.increment('points', { by: points, where: { id: authorId } });
//     }

//     res.status(201).json(answer);
//   } catch (err) {
//     console.error('Create Answer Error:', err);
//     res.status(500).json({ error: 'Failed to create answer' });
//   }
// };

exports.createAnswer = async (req, res) => {
  const { content, authorId, questionId, targetRoleId } = req.body;

  if (!content || !authorId || !questionId || !targetRoleId) {
    return res.status(400).json({
      error: "Content, authorId, questionId, and targetRoleId are required",
    });
  }

  try {
    // 1. Create the answer
    const answer = await Answer.create({ content, authorId, questionId });

    // 2. Fetch the question to access difficulty & tags
    const question = await Question.findByPk(questionId);

    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    // 3. Award points to user
    let points = 10;
    if (question.difficulty === "Mid") points = 20;
    else if (question.difficulty === "Senior") points = 30;

    await User.increment("points", { by: points, where: { id: authorId } });

    // 4. Update/Create skills for this role
    if (Array.isArray(question.tags)) {
      for (const tag of question.tags) {
        const [skill, created] = await UserSkill.findOrCreate({
          where: { authorId, skill_name: tag, targetRoleId },
          defaults: {
            level: 1,
            questions_answered: 1,
            votes_recieved: 0,
          },
        });

        if (!created) {
          skill.questions_answered += 1;
          skill.level += 1; // 🔁 tweak logic later (e.g. exp-based leveling)
          await skill.save();
        }
      }
    }

    res.status(201).json(answer);
  } catch (err) {
    console.error("Create Answer Error:", err);
    res.status(500).json({ error: "Failed to create answer" });
  }
};



// PUT /api/answers/:id
exports.updateAnswer = async (req, res) => {
  const { id } = req.params;
  const { content, userId } = req.body;

  if (!content || !userId) {
    return res.status(400).json({ message: 'Content and userId are required' });
  }

  try {
    const answer = await Answer.findByPk(id);

    if (!answer) {
      return res.status(404).json({ message: 'Answer not found' });
    }

    if (answer.authorId !== userId) {
      return res.status(403).json({ message: 'You are not allowed to edit this answer' });
    }

    const createdAt = new Date(answer.createdAt);
    const now = new Date();
    const hoursDiff = Math.abs(now - createdAt) / (1000 * 60 * 60); // convert ms to hours

    if (hoursDiff > 24) {
      return res.status(403).json({ message: 'Editing time window has expired (24 hours)' });
    }

    const plain = content.replace(/<[^>]+>/g, '').trim();
    if (plain.length < 10 || plain.length > 3000) {
      return res.status(400).json({ message: 'Answer must be between 10 and 3000 characters' });
    }

    answer.content = content;
    await answer.save();

    res.status(200).json({ message: 'Answer updated successfully', answer });
  } catch (err) {
    console.error('Update Answer Error:', err);
    res.status(500).json({ error: 'Failed to update answer' });
  }
};


// GET /api/answers
exports.getAllAnswers = async (req, res) => {
  try {
    const answers = await Answer.findAll(
    //     {
    //   include: [
    //     { model: User, as: 'author', attributes: ['id', 'name'] },
    //     { model: Question, as: 'question', attributes: ['id', 'title'] },
    //   ],
    //   order: [['createdAt', 'DESC']],
    // }
);

    res.json(answers);
  } catch (err) {
    console.error('Fetch All Answers Error:', err);
    res.status(500).json({ error: 'Failed to fetch answers' });
  }
};


// GET /api/answers/:questionId
exports.getAnswersByQuestionId = async (req, res) => {
  const { questionId } = req.params;

  try {
    const answers = await Answer.findAll({
      where: { questionId },
      include: [
        { model: User, as: 'author', attributes: ['id', 'name'] },
      ],
      order: [['createdAt', 'ASC']],
    });

    res.json(answers);
  } catch (err) {
    console.error('Fetch Answers Error:', err);
    res.status(500).json({ error: 'Failed to fetch answers' });
  }
};


exports.acceptAnswer = async (req, res) => {
  const { answerId } = req.params;
  try {
    const answer = await Answer.findByPk(answerId);
    if (!answer) return res.status(404).json({ error: 'Answer not found' });

    await Answer.update({ is_accepted: false }, {
      where: { questionId: answer.questionId }
    });

    answer.is_accepted = true;
    await answer.save();

    // 🔥 Bonus points
await User.increment('points', { by: 25, where: { id: answer.authorId } });

    await Question.update({ is_solved: true }, {
      where: { id: answer.questionId }
    });

    res.json({ message: 'Answer accepted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to accept answer' });
  }
};

