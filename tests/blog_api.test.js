const { test, after, beforeEach, describe } = require("node:test");
const assert = require("node:assert");
const supertest = require("supertest");
const mongoose = require("mongoose");
const helper = require("./test_helper");
const app = require("../app");
const api = supertest(app);

const Blog = require("../models/blog");

describe("When there is initially some blogs saved", () => {
  beforeEach(async () => {
    await Blog.deleteMany();
    const blogObjects = helper.initialBlogs.map(blog => new Blog(blog));
    const promiseArray = blogObjects.map(blog => blog.save());
    await Promise.all(promiseArray);
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
        .send(newBlog)
        .expect(400)
        .expect("Content-Type", /application\/json/);
    });
  });

  describe("Deletion of a blog", () => {
    test("succeeds with status code 204 if id is valid", async () => {
      const blogsAtStart = await helper.blogsInDb();
      const blogToDelete = blogsAtStart[0];

      await api.delete(`/api/blogs/${blogToDelete.id}`).expect(204);

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
      await api.put(`/api/blogs/${blogToUpdate.id}`).send({ likes: updatedLikes }).expect(200);

      const blogsAtEnd = await helper.blogsInDb();
      const contents = blogsAtEnd.map(r => r.likes);
      assert(contents.includes(updatedLikes));
    });
  });
});

after(async () => {
  await mongoose.connection.close();
});
