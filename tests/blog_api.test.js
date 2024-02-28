const { test, after, beforeEach } = require("node:test");
const assert = require("node:assert");
const supertest = require("supertest");
const mongoose = require("mongoose");
const helper = require("./test_helper");
const app = require("../app");
const api = supertest(app);

const Blog = require("../models/blog");

beforeEach(async () => {
  await Blog.deleteMany({}, { maxTimeMS: 20000 });
  let blogObject = new Blog(helper.initialBlogs[0]);
  await blogObject.save();
  blogObject = new Blog(helper.initialBlogs[1]);
  await blogObject.save();
});

test("blogs are returned as json", async () => {
  await api
    .get("/api/blogs")
    .expect(200)
    .expect("Content-Type", /application\/json/);
});

test("blogs identifier property is named id and not _id", async () => {
  await api
    .get("/api/blogs")
    .expect(200)
    .expect(response => {
      const blogs = response.body;
      blogs.forEach(blog => {
        console.log(blog);
        if (!("id" in blog)) throw new Error("id property not found");
      });
    });
});

test("A valid blog can be added to the database", async () => {
  const newBlog = {
    _id: "5a422aa71b54a676234d17f2",
    title: "17 Advanced SEO Techniques",
    author: "Brian Dean",
    url: "https://backlinko.com/advanced-seo",
    likes: 1934,
    __v: 0,
  };

  await api
    .post("/api/blogs")
    .send(newBlog)
    .expect(201)
    .expect("Content-Type", /application\/json/);

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
    .send(newBlog)
    .expect(201)
    .expect("Content-Type", /application\/json/);

  const blogsAtEnd = await helper.blogsInDb();
  const contents = blogsAtEnd.map(r => r.likes);

  assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length + 1);
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
    .send(newBlog)
    .expect(400)
    .expect("Content-Type", /application\/json/);
});

after(async () => {
  await mongoose.connection.close();
});
