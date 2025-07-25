const express = require('express')
const router = express.Router()
const answerController = require("../controllers/answerController")

router.post("/",answerController.createAnswer)
router.get("/",answerController.getAllAnswers)
router.get("/:questionId",answerController.getAnswersByQuestionId)
router.post('/:answerId/accept', answerController.acceptAnswer);
router.put('/:id',answerController.updateAnswer)


module.exports = router