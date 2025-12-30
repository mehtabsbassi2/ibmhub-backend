// questions.test.js
const request = require("supertest");
const express = require("express");

// Setup express app with routes
const app = express();
app.use(express.json());
const questionRoutes = require("../routes/questions");
app.use("/api/questions", questionRoutes);

// Mock Sequelize models
jest.mock("../models", () => ({
  Question: {
    findAndCountAll: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
  },
  User: {
    findByPk: jest.fn(),
    increment: jest.fn(),
  },
  UserSkill: {
    findAll: jest.fn(),
  },
  Answer: {},
  Tag: {},
  Op: {
    or: "or",
    iLike: "iLike",
    contains: "contains",
    overlap: "overlap",
    and: "and",
  },
  fn: jest.fn(),
  col: jest.fn(),
  literal: jest.fn((x) => x),
}));

const { Question, User, UserSkill } = require("../models");

describe("Questions API", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // -------------------
  // GET /api/questions
  // -------------------
  it("should return questions with pagination", async () => {
    Question.findAndCountAll.mockResolvedValue({
      rows: [{ id: 1, title: "Test Question" }],
      count: 1,
    });

    const res = await request(app).get("/api/questions");

    expect(res.status).toBe(200);
    expect(res.body.questions.length).toBe(1);
    expect(res.body.pagination.total).toBe(1);
  });

  // -------------------
  // GET /api/questions/user-skills/:userId
  // -------------------
  it("should return questions matching user skills", async () => {
    UserSkill.findAll.mockResolvedValue([
      { skill_name: "JavaScript" },
      { skill_name: "React" },
    ]);

    Question.count.mockResolvedValue(2);
    Question.findAll.mockResolvedValue([
      { id: 1, title: "JS Question" },
      { id: 2, title: "React Question" },
    ]);

    const res = await request(app).get("/api/questions/user-skills/1");

    expect(res.status).toBe(200);
    expect(res.body.questions.length).toBe(2);
    expect(Question.findAll).toHaveBeenCalled();
  });

  it("should return empty array if user has no skills", async () => {
    UserSkill.findAll.mockResolvedValue([]);

    const res = await request(app).get("/api/questions/user-skills/999");

    expect(res.status).toBe(200);
    expect(res.body.questions.length).toBe(0);
    expect(res.body.message).toBe("No skills found for user");
  });

  // -------------------
  // POST /api/questions
  // -------------------
  it("should create a new published question", async () => {
    Question.create.mockResolvedValue({ id: 1, title: "New Question" });
    User.increment.mockResolvedValue();

    const res = await request(app).post("/api/questions").send({
      title: "New Question",
      content: "Some valid content",
      tags: ["JavaScript"],
      difficulty: "Junior",
      author_id: 1,
      status: "published",
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(Question.create).toHaveBeenCalled();
  });

  it("should fail to create a question without author_id", async () => {
    const res = await request(app).post("/api/questions").send({
      title: "Test",
      content: "Content",
      status: "draft",
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Author ID required");
  });

  // -------------------
  // GET /api/questions/drafts/:userId
  // -------------------
  it("should return draft questions by user", async () => {
    Question.findAndCountAll.mockResolvedValue({
      rows: [{ id: 1, title: "Draft 1" }],
      count: 1,
    });

    const res = await request(app).get("/api/questions/drafts/1");

    expect(res.status).toBe(200);
    expect(res.body.questions.length).toBe(1);
  });

  // -------------------
  // GET /api/questions/published/:userId
  // -------------------
  it("should return published questions by user", async () => {
    Question.findAndCountAll.mockResolvedValue({
      rows: [{ id: 2, title: "Published 1" }],
      count: 1,
    });

    const res = await request(app).get("/api/questions/published/1");

    expect(res.status).toBe(200);
    expect(res.body.questions.length).toBe(1);
  });

  // -------------------
  // GET /api/questions/:id
  // -------------------
  it("should return a question by id", async () => {
    Question.findByPk.mockResolvedValue({ id: 1, title: "Test Question" });

    const res = await request(app).get("/api/questions/1");

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1);
  });

  it("should return 404 if question not found", async () => {
    Question.findByPk.mockResolvedValue(null);

    const res = await request(app).get("/api/questions/999");

    expect(res.status).toBe(404);
  });

  // -------------------
  // DELETE /api/questions/:id
  // -------------------
  it("should delete a question", async () => {
    const destroy = jest.fn();
    Question.findByPk.mockResolvedValue({ destroy });

    const res = await request(app).delete("/api/questions/1");

    expect(res.status).toBe(200);
    expect(destroy).toHaveBeenCalled();
  });

  it("should return 404 if deleting non-existent question", async () => {
    Question.findByPk.mockResolvedValue(null);

    const res = await request(app).delete("/api/questions/999");

    expect(res.status).toBe(404);
  });

  // -------------------
  // PUT /api/questions/:id
  // -------------------
  it("should update a question", async () => {
    const update = jest.fn();
    Question.findByPk.mockResolvedValue({ id: 1, authorId: 1, update });

    const res = await request(app).put("/api/questions/1").send({
      title: "Updated Title",
      content: "<p>Updated content with more than 50 characters to pass validation.</p>",
      userId: 1,
    });

    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalled();
  });

  it("should return 403 if user is not author", async () => {
    Question.findByPk.mockResolvedValue({ id: 1, authorId: 2 });

    const res = await request(app).put("/api/questions/1").send({
      title: "Updated Title",
      content: "Valid content that is long enough to pass validation.",
      userId: 1,
    });

    expect(res.status).toBe(403);
  });

  it("should return 404 if question not found on update", async () => {
    Question.findByPk.mockResolvedValue(null);

    const res = await request(app).put("/api/questions/999").send({
      title: "Updated Title",
      content: "Valid content that is long enough to pass validation.",
      userId: 1,
    });

    expect(res.status).toBe(404);
  });
});
