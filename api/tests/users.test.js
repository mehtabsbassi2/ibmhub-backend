/**
 * Unit tests for /api/users endpoints
 * Using:
 *  - Jest: test runner
 *  - Supertest: simulate HTTP requests
 *  - Sequelize models: fully mocked so we NEVER hit Supabase
 */

const request = require("supertest");
const app = require("../app");

// Mock all Sequelize models used by the controller
jest.mock("../models", () => {
  return {
    User: {
      findOne: jest.fn(),
      findAll: jest.fn(),
      findByPk: jest.fn(),
      create: jest.fn(),
    },

    UserTargetRole: {
      create: jest.fn(),
    },

    UserSkill: {},

    Question: {
      findAll: jest.fn(),
    },

    Answer: {
      findAll: jest.fn(),
    },
  };
});

// Import mocked models
const {
  User,
  UserTargetRole,
  Question,
  Answer,
} = require("../models");


// -----------------------------------------------------
// GET /api/users  — Get all users
// -----------------------------------------------------
describe("GET /api/users", () => {
  it("should return a list of users", async () => {
    // Mock findAll result
    User.findAll.mockResolvedValue([
      { id: 1, name: "John Doe" },
      { id: 2, name: "Jane Doe" },
    ]);

    const res = await request(app).get("/api/users");

    // Ensure API responds correctly
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);

    // Ensure mock worked
    expect(User.findAll).toHaveBeenCalled();
  });
});


// -----------------------------------------------------
// POST /api/users/login — Login user
// -----------------------------------------------------
describe("POST /api/users/login", () => {
  it("should return user if email exists", async () => {
    User.findOne.mockResolvedValue({ id: 1, email: "test@mail.com" });

    const res = await request(app)
      .post("/api/users/login")
      .send({ email: "test@mail.com" });

    expect(res.status).toBe(200);
    expect(res.body.email).toBe("test@mail.com");
  });

  it("should return message when user not found", async () => {
    User.findOne.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/users/login")
      .send({ email: "missing@mail.com" });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("user not found");
  });
});


// -----------------------------------------------------
// POST /api/users — Create new user
// -----------------------------------------------------
describe("POST /api/users", () => {
  it("should create user successfully", async () => {
    User.findOne.mockResolvedValue(null); // No existing user
    User.create.mockResolvedValue({ id: "123", email: "new@mail.com" });

    const res = await request(app).post("/api/users").send({
      id: "123",
      email: "new@mail.com",
      name: "New User",
      job_title: "Developer",
      band_level: "J1",
      department: "IT",
    });

    expect(res.status).toBe(201);
    expect(res.body.email).toBe("new@mail.com");
  });

  it("should fail if required fields missing", async () => {
    const res = await request(app).post("/api/users").send({
      email: "x@mail.com",
    });

    expect(res.status).toBe(400);
  });

  it("should prevent duplicate email", async () => {
    User.findOne.mockResolvedValue({ id: "existing" });

    const res = await request(app).post("/api/users").send({
      id: "123",
      email: "dup@mail.com",
      name: "Dup",
      job_title: "Dev",
      band_level: "J1",
    });

    expect(res.status).toBe(409);
  });
});


// -----------------------------------------------------
// GET /api/users/:id — Get User by ID
// -----------------------------------------------------
describe("GET /api/users/:id", () => {
  it("should return user data", async () => {
    User.findByPk.mockResolvedValue({
      id: "1",
      name: "John",
      targetRoles: [],
    });

    const res = await request(app).get("/api/users/1");

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("John");
  });

  it("should return 404 if user does not exist", async () => {
    User.findByPk.mockResolvedValue(null);

    const res = await request(app).get("/api/users/999");

    expect(res.status).toBe(404);
  });
});


// -----------------------------------------------------
// PUT /api/users/profile/:email — Update Profile
// -----------------------------------------------------
describe("PUT /api/users/profile/:email", () => {
  it("should update user profile", async () => {
    const mockUser = {
      email: "user@mail.com",
      save: jest.fn(),
      name: "Old",
    };

    User.findOne.mockResolvedValue(mockUser);

    const res = await request(app)
      .put("/api/users/profile/test@mail.com")
      .send({
        email: "test@mail.com",
        name: "New Name",
      });

    expect(res.status).toBe(200);
    expect(mockUser.save).toHaveBeenCalled();
  });

  it("should return 404 if user not found", async () => {
    User.findOne.mockResolvedValue(null);

    const res = await request(app)
      .put("/api/users/profile/x@mail.com")
      .send({ email: "x@mail.com" });

    expect(res.status).toBe(404);
  });
});


// -----------------------------------------------------
// PUT /api/users/toggle-admin/:id — toggle admin role
// -----------------------------------------------------
describe("PUT /api/users/toggle-admin/:id", () => {
  it("should toggle USER → ADMIN", async () => {
    const mockUser = {
      id: "1",
      accountType: "USER",
      save: jest.fn(),
    };

    User.findByPk.mockResolvedValue(mockUser);

    const res = await request(app).put("/api/users/toggle-admin/1");

    expect(res.status).toBe(200);
    expect(mockUser.accountType).toBe("ADMIN");
  });

  it("should return 404 if user not found", async () => {
    User.findByPk.mockResolvedValue(null);

    const res = await request(app).put("/api/users/toggle-admin/999");

    expect(res.status).toBe(404);
  });
});


// -----------------------------------------------------
// PUT /api/users/:id/points — Update user points
// -----------------------------------------------------
describe("PUT /api/users/1/points", () => {
  it("should update user points", async () => {
    const mockUser = {
      id: "1",
      points: 0,
      save: jest.fn(),
    };

    User.findByPk.mockResolvedValue(mockUser);

    const res = await request(app)
      .put("/api/users/1/points")
      .send({ newPoints: 50 });

    expect(res.status).toBe(200);
    expect(mockUser.points).toBe(50);
    expect(mockUser.save).toHaveBeenCalled();
  });
});


// -----------------------------------------------------
// GET /api/users/dashboard/:id — Dashboard Data
// -----------------------------------------------------
describe("GET /api/users/dashboard/:id", () => {

  it("should return dashboard data structure", async () => {
    // Mock user with empty roles
    User.findByPk.mockResolvedValue({
      id: "1",
      name: "John",
      points: 20,
      job_title: "Developer",
      targetRoles: [],
      toJSON: function () { return this; }
    });

    const res = await request(app).get("/api/users/dashboard/1");

    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe("John");
    expect(Array.isArray(res.body.roles)).toBe(true);
  });

  it("should return 404 when user missing", async () => {
    User.findByPk.mockResolvedValue(null);

    const res = await request(app).get("/api/users/dashboard/999");

    expect(res.status).toBe(404);
  });
});

