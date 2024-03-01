const { test, after, beforeEach, describe } = require("node:test");
const assert = require("node:assert");
const supertest = require("supertest");
const mongoose = require("mongoose");
const helper = require("./test_helper");
const app = require("../app");
const api = supertest(app);
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const Blog = require("../models/blog");
const User = require("../models/user");

describe("When there is initially some blogs saved", () => {
  let token;

  beforeEach(async () => {
    await User.deleteMany({});
    const passwordHash = await bcrypt.hash("sekret", 10);
    const user = new User({ username: "root", passwordHash });
    await user.save();

    token = jwt.sign({ username: user.username, id: user._id }, process.env.SECRET, { expiresIn: 60 * 60 });

    await Blog.deleteMany({});
    // Assign the created user as the owner of each blog
    const blogObjects = helper.initialBlogs.map(blog => new Blog({ ...blog, user: user._id }));
    const promiseArray = blogObjects.map(blog => blog.save());
    await Promise.all(promiseArray);
  });

  test("blogs are returned as json", async () => {
    await api
      .get("/api/blogs")
      .set("Authorization", `Bearer ${token}`)
      .expect(200)
      .expect("Content-Type", /application\/json/);
  });

  test("blogs identifier property is named id and not _id", async () => {
    await api
      .get("/api/blogs")
      .set("Authorization", `Bearer ${token}`)
      .expect(200)
      .expect(response => {
        const blogs = response.body;
        blogs.forEach(blog => {
          if (!("id" in blog)) throw new Error("id property not found");
        });
      });
  });

  describe("addition of a new blog", () => {
    test("A valid blog can be added to the database", async () => {
      const newBlog = {
        _id: "5a422aa71b54a676234d17f2",
        title: "17 Advanced SEO Techniques",
        author: "Brian Dean",
        url: "https://backlinko.com/advanced-seo",
        likes: 1934,
        __v: 0,
      };

      const response = await api
        .post("/api/blogs")
        .set("Authorization", `Bearer ${token}`)
        .send(newBlog)
        .expect(201)
        .expect("Content-Type", /application\/json/);

      const addedBlog = response.body; // Use the response body instead of blogsAtEnd
      const blogsAtEnd = await helper.blogsInDb();
      const contents = blogsAtEnd.map(r => r.title);

      assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length + 1);
      assert(contents.includes("17 Advanced SEO Techniques"));
    });

    test("If blog is missing the likes property, it defaults to 0", async () => {
      const newBlog = {
        _id: "5a422aa71b54a676234d17f2",
        title: "17 Advanced SEO Techniques",
        author: "Brian Dean",
        url: "https://backlinko.com/advanced-seo",
        __v: 0,
      };

      await api
        .post("/api/blogs")
        .set("Authorization", `Bearer ${token}`)
        .send(newBlog)
        .expect(201)
        .expect("Content-Type", /application\/json/);

      const blogsAtEnd = await helper.blogsInDb();
      const contents = blogsAtEnd.map(r => r.likes);

      assert(contents.includes(0));
    });

    test("If blog has no title or url properties, backend returns 400 bad request", async () => {
      const newBlog = {
        _id: "5a422aa71b54a676234d17f2",
        author: "Brian Dean",
        likes: 1934,
        __v: 0,
      };

      await api
        .post("/api/blogs")
        .set("Authorization", `Bearer ${token}`)
        .send(newBlog)
        .expect(400)
        .expect("Content-Type", /application\/json/);
    });
  });

  describe("Deletion of a blog", () => {
    test("succeeds with status code 204 if id is valid", async () => {
      const blogsAtStart = await helper.blogsInDb();
      console.log(blogsAtStart);
      const blogToDelete = blogsAtStart[0];

      console.log(blogToDelete);

      await api.delete(`/api/blogs/${blogToDelete.id}`).set("Authorization", `Bearer ${token}`).expect(204);

      const blogsAtEnd = await helper.blogsInDb();

      assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length - 1);

      const contents = blogsAtEnd.map(r => r.title);
      assert(!contents.includes(blogToDelete.title));
    });
  });

  describe("Updating a blog", () => {
    test("succeeds with status code 200 if id is valid", async () => {
      const blogsAtStart = await helper.blogsInDb();
      const blogToUpdate = blogsAtStart[0];

      const updatedLikes = blogToUpdate.likes + 100;
      await api
        .put(`/api/blogs/${blogToUpdate.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ likes: updatedLikes })
        .expect(200);

      const blogsAtEnd = await helper.blogsInDb();
      const contents = blogsAtEnd.map(r => r.likes);
      assert(contents.includes(updatedLikes));
    });
  });
});

describe("when there is initially one user in db", () => {
  beforeEach(async () => {
    await User.deleteMany({});
    const passwordHash = await bcrypt.hash("sekret", 10);
    const user = new User({ username: "root", passwordHash });
    await user.save();

    token = jwt.sign({ username: user.username, id: user._id }, process.env.SECRET, { expiresIn: 60 * 60 });

    await Blog.deleteMany({});
    // Assign the created user as the owner of each blog
    const blogObjects = helper.initialBlogs.map(blog => new Blog({ ...blog, user: user._id }));
    const promiseArray = blogObjects.map(blog => blog.save());
    await Promise.all(promiseArray);
  });

  test("creation succeeds with a fresh username", async () => {
    const usersAtStart = await helper.usersInDb();

    const newUser = {
      username: "mluukkai",
      name: "Matti Luukkainen",
      password: "salainen",
    };

    await api
      .post("/api/users")
      .send(newUser)
      .expect(201)
      .expect("Content-Type", /application\/json/);

    const usersAtEnd = await helper.usersInDb();
    assert.strictEqual(usersAtEnd.length, usersAtStart.length + 1);

    const usernames = usersAtEnd.map(u => u.username);
    assert(usernames.includes(newUser.username));
  });

  test("creation fails with proper statuscode and message if username already taken", async () => {
    const usersAtStart = await helper.usersInDb();

    const newUser = {
      username: "root",
      name: "Superuser",
      password: "salainen",
    };

    const result = await api
      .post("/api/users")
      .send(newUser)
      .expect(400)
      .expect("Content-Type", /application\/json/);

    const usersAtEnd = await helper.usersInDb();
    assert(result.body.error.includes("expected `username` to be unique"));

    assert.strictEqual(usersAtEnd.length, usersAtStart.length);
  });
});

after(async () => {
  await User.deleteMany({});
  await mongoose.connection.close();
});
