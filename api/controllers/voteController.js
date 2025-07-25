const { Vote,Question, Answer,UserSkill } = require('../models');
const { Op } = require('sequelize');

// POST /api/votes
exports.castVote = async (req, res) => {
  const { authorId, item_id, item_type, vote_type } = req.body;

  if (!authorId || !item_id || !item_type || !vote_type) {
    return res.status(400).json({ error: 'Missing vote fields' });
  }

  if (!['question', 'answer'].includes(item_type) || !['upvote', 'downvote'].includes(vote_type)) {
    return res.status(400).json({ error: 'Invalid vote type or item type' });
  }

  try {
    const vote = await Vote.create({ authorId, item_id, item_type, vote_type });

    const isUpvote = vote_type === 'upvote' ? 1 : -1;
    const Model = item_type === 'question' ? Question : Answer;

    const item = await Model.findByPk(item_id);
    if (!item) {
      return res.status(404).json({ error: `${item_type} not found` });
    }

    // Update vote count on question or answer
    item.votes += isUpvote;
    await item.save();

    // 🧠 Extra logic for answer: update UserSkill.votes_received based on related question tags
    if (item_type === 'answer' && vote_type === 'upvote') {
      const answerAuthorId = item.authorId;
        //SAVE POINTS
       await User.increment('points', { by: 2, where: { id: item.authorId } });
      // Find the related question
      const question = await Question.findByPk(item.questionId);
      if (question && Array.isArray(question.tags)) {
        for (const tag of question.tags) {
          const [skill] = await UserSkill.findOrCreate({
            where: {
              authorId: answerAuthorId,
              skill_name: tag
            },
            defaults: {
              level: 1,
              questions_answered: 0,
              votes_recieved: 1
            }
          });

          skill.votes_recieved += 1;
          await skill.save();
        }
      }
    }

    return res.status(201).json({
      message: 'Vote recorded',
      vote,
      newVoteCount: item.votes
    });
  } catch (err) {
    console.error('Cast Vote Error:', err);
    return res.status(500).json({ error: 'Failed to cast vote' });
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
