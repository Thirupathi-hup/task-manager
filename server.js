const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();
const cors = require("cors");
app.use(cors());

// Middleware to parse incoming requests
app.use(express.json());

// Path to the SQLite database file
const dbPath = path.join(__dirname, "testdb.db");

let db = null;

// Initialize the database connection
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    // Start the server after the database is connected
    app.listen(5000, () => {
      console.log("Server Running at http://localhost:5000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

// POST endpoint to create a new note
app.post("/notes", async (request, response) => {
  const { title, description, category } = request.body;

  // Validate required fields
  if (!title || !description) {
    return response.status(400).send({ error: "Title and description are required" });
  }

  const createNote = `
    INSERT INTO notes (title, description, category)
    VALUES (?, ?, ?);
  `;

  try {
    // Insert the new note and set the default category if not provided
    const dbResponse = await db.run(createNote, [title, description, category || "Others"]);
    const noteId = dbResponse.lastID;
    response.status(201).send({ noteId });
  } catch (error) {
    response.status(500).send({ error: error.message });
  }
});

// GET endpoint to fetch all notes (with optional filtering)
app.get("/notes", async (request, response) => {
  const { category, search } = request.query;

  let query = "SELECT * FROM notes WHERE 1=1";
  let queryParams = [];

  if (category) {
    query += " AND category = ?";
    queryParams.push(category);
  }

  if (search) {
    query += " AND title LIKE ?";
    queryParams.push(`%${search}%`);
  }

  try {
    const notes = await db.all(query, queryParams);
    response.status(200).send(notes);
  } catch (error) {
    response.status(500).send({ error: error.message });
  }
});

// PUT endpoint to update a specific note by id
app.put("/notes/:id", async (request, response) => {
  const { id } = request.params;
  const { title, description, category } = request.body;

  // Validate required fields
  if (!title || !description) {
    return response.status(400).send({ error: "Title and description are required" });
  }

  const updateNote = `
    UPDATE notes
    SET title = ?, description = ?, category = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?;
  `;

  try {
    const dbResponse = await db.run(updateNote, [title, description, category || "Others", id]);

    // Check if any rows were affected
    if (dbResponse.changes === 0) {
      return response.status(404).send({ error: "Note not found" });
    }

    response.send({ message: "Note updated successfully" });
  } catch (error) {
    response.status(500).send({ error: error.message });
  }
});

// DELETE endpoint to delete a specific note by id
app.delete("/notes/:id", async (request, response) => {
  const { id } = request.params;

  const deleteNote = `
    DELETE FROM notes WHERE id = ?;
  `;

  try {
    const dbResponse = await db.run(deleteNote, [id]);

    // Check if any rows were affected
    if (dbResponse.changes === 0) {
      return response.status(404).send({ error: "Note not found" });
    }

    response.send({ message: "Note deleted successfully" });
  } catch (error) {
    response.status(500).send({ error: error.message });
  }
});

// GET endpoint to fetch all notes (with optional filtering)
app.get("/notes", async (request, response) => {
  const { category, search } = request.query;

  let query = "SELECT * FROM notes WHERE 1=1";
  let queryParams = [];

  // Filter by category if provided
  if (category) {
    query += " AND category = ?";
    queryParams.push(category);
  }

  // Filter by search term in title if provided
  if (search) {
    query += " AND title LIKE ?";
    queryParams.push(`%${search}%`);
  }

  try {
    // Execute the query with optional filters
    const notes = await db.all(query, queryParams);
    response.status(200).send(notes);
  } catch (error) {
    response.status(500).send({ error: error.message });
  }
});

