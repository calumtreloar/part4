const blogsRouter = require("express").Router();
const jwt = require("jsonwebtoken");

const Blog = require("../models/blog");
const User = require("../models/user");
const { tokenExtractor, userExtractor } = require("../utils/middleware");

blogsRouter.get("/", async (request, response) => {
  const blogs = await Blog.find({}).populate("user", { username: 1, name: 1 });
  response.json(blogs);
});

blogsRouter.post("/", tokenExtractor, userExtractor, async (request, response) => {
  const { title, author, url } = request.body;

  if (!request.user) {
    return response.status(401).json({ error: "token missing or invalid" });
  }

  const blog = new Blog({
    title,
    author,
    url,
    likes: request.body.likes !== undefined ? request.body.likes : 0,
    user: request.user.id,
  });

  const savedBlog = await blog.save();
  request.user.blogs = request.user.blogs.concat(savedBlog._id);
  await request.user.save();

  response.status(201).json(savedBlog);
});

blogsRouter.delete("/:id", tokenExtractor, userExtractor, async (request, response, next) => {
  // Use request.user directly instead of decoding the token again
  if (!request.user) {
    return response.status(401).json({ error: "token missing or invalid" });
  }

  const blog = await Blog.findById(request.params.id);

  if (!blog) {
    return response.status(404).json({ error: "blog not found" });
  }

  // Use request.user.id, which is now directly available
  if (blog.user.toString() !== request.user.id.toString()) {
    return response.status(403).json({ error: "only the creator can delete a blog" });
  }

  await Blog.findByIdAndDelete(request.params.id);
  response.status(204).end();
});

blogsRouter.put("/:id", async (request, response, next) => {
  const { title, author, url, likes } = request.body;

  const blog = {
    title,
    author,
    url,
    likes,
  };

  const updatedBlog = await Blog.findByIdAndUpdate(request.params.id, blog, {
    new: true,
    runValidators: true,
    context: "query",
  });
  response.status(200).json(updatedBlog);
});

module.exports = blogsRouter;
