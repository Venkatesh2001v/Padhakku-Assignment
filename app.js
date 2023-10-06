/* eslint-disable consistent-return */
/* eslint-disable no-const-assign */
/* eslint-disable import/no-unresolved */
const express = require('express')

const app = express()
const sqlite3 = require('sqlite3')
const {open} = require('sqlite')
const bcrypt = require('bcrypt')
const path = require('path')

const dbPath = path.join(__dirname, 'userData.db')
app.use(express.json())
let db = null

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })

    // Create the 'user' table
    await db.exec(`
      CREATE TABLE user (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
      );
    `)

    // Create the 'post' table
    await db.exec(`
      CREATE TABLE post (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        content TEXT,
        FOREIGN KEY (userId) REFERENCES user (id)
      );
    `)

    app.listen(3000, () => {
      console.log('Server Is Running')
    })
  } catch (e) {
    console.log(`error ${e.message}`)
    process.exit(1)
  }
}

initializeDBAndServer()

app.post('/api/signup', async (req, res) => {
  try {
    const {name, email, password} = req.body

    // Validate email format using regular expression
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({error: 'Invalid email format'})
    }

    // Validate password complexity (e.g., minimum length)
    if (password.length < 8) {
      return res
        .status(400)
        .json({error: 'Password must be at least 8 characters long'})
    }

    // Check if the email is already in use (query the database)
    const existingUser = await db.get('SELECT * FROM user WHERE email = ?', [
      email,
    ])

    if (existingUser) {
      return res.status(400).json({error: 'Email is already in use'})
    }

    // Hash the user's password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Insert the user into the "user" table
    const result = await db.run(
      'INSERT INTO user (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashedPassword],
    )

    // Send a successful response
    res.status(200).json({message: 'Successful user sign-up'})
  } catch (error) {
    console.error('Error during user sign-up:', error.message)

    // Handle specific database errors, validation errors, or other errors as needed
    if (error.code === 'SQLITE_CONSTRAINT') {
      return res.status(400).json({error: 'Database constraint violation'})
    }

    res.status(500).json({error: 'Failed to sign up user'})
  }
})

app.post('/api/posts', async (req, res) => {
  try {
    // Extract post data from the request body
    const {userId, content} = req.body

    // Validate that both userId and content are provided
    if (!userId || !content) {
      return res
        .status(400)
        .json({error: 'Both userId and content are required'})
    }

    // Validate that userId exists in the database (query the user table)
    const userExists = await db.get('SELECT * FROM user WHERE id = ?', [userId])

    if (!userExists) {
      return res.status(404).json({error: 'User not found'})
    }

    // Perform post creation logic (e.g., save to database)
    // For simplicity, we'll assume success here, but you should handle errors appropriately

    // Insert the post data into the "post" table
    const result = await db.run(
      'INSERT INTO post (userId, content) VALUES (?, ?)',
      [userId, content],
    )

    // Send a successful response
    res.status(200).json({message: 'Successfully created post'})
  } catch (error) {
    console.error('Error creating post:', error.message)

    // Handle specific database errors, validation errors, or other errors as needed
    if (error.code === 'SQLITE_CONSTRAINT') {
      return res.status(400).json({error: 'Database constraint violation'})
    }

    res.status(500).json({error: 'Failed to create post'})
  }
})

app.delete('/api/deletepost/:postId', async (req, res) => {
  try {
    // Extract postId from request params
    const {postId} = req.params

    // Validate that postId is provided
    if (!postId) {
      return res.status(400).json({error: 'postId is required'})
    }

    // Perform post deletion logic (e.g., delete from the database)
    // For simplicity, we'll assume success here, but you should handle errors appropriately

    // Execute an SQL DELETE query to delete the post by postId
    const result = await db.run('DELETE FROM post WHERE id = ?', [postId])

    // Check if the deletion was successful (you should handle errors appropriately)
    if (result.changes > 0) {
      // The deletion was successful
      res.status(200).json({message: 'Successfully deleted post'})
    } else {
      // Handle the case where the deletion failed (e.g., postId not found)
      res.status(404).json({error: 'Post not found'})
    }
  } catch (error) {
    console.error('Error deleting post:', error.message)

    // Handle specific database errors or other errors as needed
    res.status(500).json({error: 'Failed to delete post'})
  }
})

app.get('/api/posts/:userId', async (req, res) => {
  try {
    // Extract userId from request params
    const {userId} = req.params

    // Validate that userId is provided
    if (!userId) {
      return res.status(400).json({error: 'userId is required'})
    }

    // Check if userId exists in the database (query the user table)
    const userExists = await db.get('SELECT * FROM user WHERE id = ?', [userId])

    if (!userExists) {
      return res.status(404).json({error: 'User not found'})
    }

    // Retrieve all posts for the specified userId from the database
    const posts = await db.all('SELECT * FROM post WHERE userId = ?', [userId])

    // Send the retrieved posts as the response
    res.status(200).json(posts)
  } catch (error) {
    console.error('Error fetching user posts:', error.message)

    // Handle specific database errors, validation errors, or other errors as needed
    if (error.code === 'SQLITE_CONSTRAINT') {
      return res.status(400).json({error: 'Database constraint violation'})
    }

    res.status(500).json({error: 'Failed to fetch user posts'})
  }
})

module.exports = app
