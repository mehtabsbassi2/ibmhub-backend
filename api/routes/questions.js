const express = require('express');
const router = express.Router();
const questionController = require('../controllers/questionsController');

// GET /api/questions - list questions with filters
router.get('/', questionController.getQuestions);
router.get('/user-skills/:userId',questionController.getQuestionsByUserSkills)

// POST /api/questions - ask a new question
router.post('/', questionController.createQuestion);

// GET /api/questions/:id - get question + answers
router.get('/:id', questionController.getQuestionById);

// DELETE /api/questions/:id - delete question
router.delete('/:id', questionController.deleteQuestion);

// PUT /api/questions/:id - edit a question (optional)
router.put('/:id', questionController.updateQuestion);
//get draft user questions
router.get('/drafts/:userId',questionController.getDraftQuestionsByUser)
//get published user questions
router.get('/published/:userId',questionController.getPublishedQuestionsByUser)

module.exports = router;
