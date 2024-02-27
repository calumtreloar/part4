const _ = require("lodash");

const dummy = blogs => {
  return 1;
};

const totalLikes = blogs => {
  return blogs.reduce((acc, blog) => acc + blog.likes, 0);
};

const favouriteBlog = blogs => {
  const maxLikes = Math.max(...blogs.map(blog => blog.likes));
  const favouriteBlog = blogs.find(blog => blog.likes === maxLikes);

  return {
    title: favouriteBlog.title,
    author: favouriteBlog.author,
    likes: favouriteBlog.likes,
  };
};

const mostBlogs = blogs => {
  const groupedByAuthor = _.groupBy(blogs, blog => blog.author);
  const authorWithMostBlogs = _.maxBy(
    _.keys(groupedByAuthor),
    author => groupedByAuthor[author].length
  );

  return {
    author: authorWithMostBlogs,
    blogs: groupedByAuthor[authorWithMostBlogs].length,
  };
};

const mostLikes = blogs => {
  const groupedByAuthor = _.groupBy(blogs, blog => blog.author);

  const authorWithMostLikes = _.maxBy(_.keys(groupedByAuthor), author =>
    _.sumBy(groupedByAuthor[author], "likes")
  );

  return {
    author: authorWithMostLikes,
    likes: _.sumBy(groupedByAuthor[authorWithMostLikes], "likes"),
  };
};

module.exports = {
  dummy,
  totalLikes,
  favouriteBlog,
  mostBlogs,
  mostLikes,
};
