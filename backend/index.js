require("dotenv").config()

const config = require("./config.json")
const mongoose = require("mongoose")
const connectionString = process.env.MONGODB_URI

mongoose
  .connect(connectionString)
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error("Failed to connect to MongoDB", err))

const User = require("./models/user.model")
const Note = require("./models/note.model")

const express = require("express")
const cors = require("cors")
const app = express()
const path = require("path")

const jwt = require("jsonwebtoken")
const { authenticateToken } = require("./utilities")

app.use(express.json())

// Arahkan folder statis dari /frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Tangani semua rute dengan mengembalikan index.html dari /frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

app.use(
  cors({
    origin: "*",
  })
)

// Testing
app.get("/test", (req, res) => {
  res.send("API is working!")
})


app.get("/", (req, res) => {
  res.json({ data: "hello" })
})

// Create Account
app.post("/create-account", async (req, res) => {
  const { fullName, email, password } = req.body

  if (!fullName) {
    return res.status(400).json({ error: true, message: "Full Name is Required" })
  }

  if (!email) {
    return res.status(400).json({ error: true, mesaage: "Email is required" })
  }

  if (!password) {
    return res.status(400).json({ error: true, mesaage: "Password is required" })
  }

  const isUser = await User.findOne({ email: email })

  if (isUser) {
    return res.json({
      error: true,
      message: "User already exist",
    })
  }

  const user = new User({
    fullName,
    email,
    password,
  })

  await user.save()

  const accessToken = jwt.sign({ user }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "30m",
  })

  return res.json({
    error: false,
    user,
    accessToken,
    message: "Registration Successfully",
  })
})

// Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body

  if (!email) {
    return res.status(400).json({ message: "Email is required" })
  }

  if (!password) {
    return res.status(400).json({ message: "Password is required" })
  }

  const userInfo = await User.findOne({ email: email })

  if (!userInfo) {
    return res.status(400).json({ message: "User not found" })
  }

  if (userInfo.email == email && userInfo.password == password) {
    const user = { user: userInfo }

    const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: "30m",
    })

    return res.json({
      error: false,
      message: "Login Succesful",
      email,
      accessToken,
    })
  } else {
    return res.status(400).json({
      error: true,
      message: "Invalid Credentials",
    })
  }
})

// Get User
app.get("/get-user", authenticateToken, async (req, res) => {
  const { user } = req.user

  const isUser = await User.findOne({ _id: user._id })

  if (!isUser) {
    return res.sendStatus(401)
  }

  return res.json({
    user: { fullName: isUser.fullName, email: isUser.email, _id: isUser._id, createdOn: isUser.createdOn },
    message: "",
  })
})

// Add Note
app.post("/add-note", authenticateToken, async (req, res) => {
  const { title, content, tags } = req.body
  const { user } = req.user

  if (!title) {
    return res.status(400).json({ message: "Title is required" })
  }

  if (!content) {
    return res.status(400).json({ message: "Content is required" })
  }

  try {
    const note = new Note({
      title,
      content,
      tags: tags || [],
      userId: user._id,
    })

    await note.save()

    return res.json({
      error: false,
      note,
      message: "Note added successsfully",
    })
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: "Internal Server Error",
    })
  }
})

// Edit Note
app.put("/edit-note/:noteId", authenticateToken, async (req, res) => {
  const noteId = req.params.noteId
  const { title, content, tags, isPinned } = req.body
  const { user } = req.user

  if (!title && !content && !tags) {
    return res.status(400).json({ error: true, message: "No changes" })
  }

  try {
    const note = await Note.findOne({ _id: noteId, userId: user._id })

    if (!note) {
      return res.status(404).json({ error: true, message: "Note not found" })
    }

    if (title) note.title = title
    if (content) note.content = content
    if (tags) note.tags = tags
    if (isPinned) note.isPinned = isPinned

    await note.save()

    return res.json({
      error: false,
      note,
      message: "Note updated successfully",
    })
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: "Internal server error",
    })
  }
})

// Get All Notes
app.get("/get-all-notes", authenticateToken, async (req, res) => {
  const { user } = req.user

  try {
    const notes = await Note.find({ userId: user._id }).sort({ isPinned: -1 })

    return res.json({
      error: false,
      notes,
      message: "All notes retrieved successfully",
    })
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: "Internal Server Error",
    })
  }
})

// Delete Note
app.delete("/delete-note/:noteId", authenticateToken, async (req, res) => {
  const noteId = req.params.noteId
  const { user } = req.user

  try {
    const note = await Note.findOne({ _id: noteId, userId: user._id })

    if (!note) {
      return res.status(400).json({ error: true, message: "Note not found" })
    }

    await Note.deleteOne({ _id: noteId, userId: user._id })

    return res.json({
      error: false,
      message: "Note deleted successfully",
    })
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: "Internal Server Error",
    })
  }
})

// Update isPinned
app.put("/update-note-pinned/:noteId", authenticateToken, async (req, res) => {
  const noteId = req.params.noteId
  const { isPinned } = req.body
  const { user } = req.user

  try {
    const note = await Note.findOne({ _id: noteId, userId: user._id })

    if (!note) {
      return res.status(404).json({ error: true, message: "Note not found" })
    }

    note.isPinned = isPinned

    await note.save()

    return res.json({
      error: false,
      note,
      message: "Note updated successfully",
    })
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: "Internal server error",
    })
  }
})

// Search Note
app.get("/search-notes", authenticateToken, async (req, res) => {
  const { user } = req.user
  const { query } = req.query

  if (!query) {
    return res.status(400).json({ error: true, message: "Search query is required" })
  }

  try {
    const matchingNotes = await Note.find({
      userId: user._id,
      $or: [{ title: { $regex: new RegExp(query, "i") } }, { content: { $regex: new RegExp(query, "i") } }],
    })

    return res.json({
      error: false,
      notes: matchingNotes,
      message: "Notes matching the search query retrieved successfully",
    })
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: "Internal server error",
    })
  }
})

app.listen(8000)

module.exports = app
