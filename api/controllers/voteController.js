const { Vote,Question, Answer,UserSkill } = require('../models');
const { Op } = require('sequelize');

// POST /api/votes
exports.castVote = async (req, res) => {
  const { authorId, item_id, item_type, vote_type } = req.body;

  if (!authorId || !item_id || !item_type || !vote_type) {
    return res.status(400).json({ error: "Missing vote fields" });
  }

  if (
    !["question", "answer"].includes(item_type) ||
    !["upvote", "downvote"].includes(vote_type)
  ) {
    return res
      .status(400)
      .json({ error: "Invalid vote type or item type" });
  }

  try {
    const Model = item_type === "question" ? Question : Answer;

    const item = await Model.findByPk(item_id);
    if (!item) {
      return res
        .status(404)
        .json({ error: `${item_type} not found` });
    }

    // Check if user already voted
    const existingVote = await Vote.findOne({
      where: { authorId, item_id, item_type },
    });

    if (existingVote) {
      if (existingVote.vote_type === vote_type) {
        // Same vote → REMOVE IT (toggle behavior)
        const effect = existingVote.vote_type === "upvote" ? -1 : 1;
        
        await existingVote.destroy();
        
        item.votes += effect;
        await item.save();

        return res.json({
          message: "Vote removed",
          userVote: null,
          newVoteCount: item.votes,
        });
      }

      // Opposite vote → switch vote
      const oldEffect = existingVote.vote_type === "upvote" ? 1 : -1;
      const newEffect = vote_type === "upvote" ? 1 : -1;

      existingVote.vote_type = vote_type;
      await existingVote.save();

      item.votes = item.votes - oldEffect + newEffect;
      await item.save();

      return res.json({
        message: "Vote updated",
        userVote: vote_type,
        newVoteCount: item.votes,
      });
    }

    // New vote
    await Vote.create({ authorId, item_id, item_type, vote_type });

    const effect = vote_type === "upvote" ? 1 : -1;
    item.votes += effect;
    await item.save();

    // 🧠 Extra logic for answer upvotes
    if (item_type === "answer" && vote_type === "upvote") {
      const answerAuthorId = item.authorId;
      await User.increment("points", { by: 2, where: { id: answerAuthorId } });

      const question = await Question.findByPk(item.questionId);
      if (question && Array.isArray(question.tags)) {
        for (const tag of question.tags) {
          const [skill] = await UserSkill.findOrCreate({
            where: { authorId: answerAuthorId, skill_name: tag },
            defaults: {
              level: 1,
              questions_answered: 0,
              votes_recieved: 1,
            },
          });

          skill.votes_recieved += 1;
          await skill.save();
        }
      }
    }

    return res.status(201).json({
      message: "Vote recorded",
      userVote: vote_type,
      newVoteCount: item.votes,
    });
  } catch (err) {
    console.error("Cast Vote Error:", err);
    return res.status(500).json({ error: "Failed to cast vote" });
  }
};



// GET /api/votes/count?item_id=1&item_type=question
exports.getVoteCount = async (req, res) => {
  const { item_id, item_type } = req.query;

  if (!item_id || !item_type) {
    return res.status(400).json({ error: 'Missing item_id or item_type' });
  }

  try {
    const upvotes = await Vote.count({
      where: { item_id, item_type, vote_type: 'upvote' }
    });

    const downvotes = await Vote.count({
      where: { item_id, item_type, vote_type: 'downvote' }
    });

    res.json({ upvotes, downvotes, total: upvotes - downvotes });
  } catch (error) {
    console.error('Vote count error:', error);
    res.status(500).json({ error: 'Failed to fetch vote count' });
  }
};
