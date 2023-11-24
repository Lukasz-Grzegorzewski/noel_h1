require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const multer = require('multer');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5004;

app.use(cors());
app.use(express.json());


const pool = mysql.createPool({
  host: process.env.HOST_URL,
  user: process.env.USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  // waitForConnections: true,
  // connectionLimit: 10,
  // queueLimit: 0,
});

app.post('/api/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const connection = await pool.getConnection();
    await connection.execute('INSERT INTO users (email, password, name) VALUES (?, ?, ?)', [email, password, name]);
    connection.release();
    res.json({ success: true, message: 'Registration successful' });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const connection = await pool.getConnection();
    const [results] = await connection.execute('SELECT * FROM users WHERE email = ? AND password = ?', [email, password]);
    connection.release();

    if (results.length > 0) {
      res.json({ success: true, message: 'Login successful', userId: results[0].id, name: results[0].name });
    } else {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});


// Set up multer storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.post('/api/saveRecording/:userId', upload.single('audioBlob'), async (req, res) => {
  const { userId } = req.params;
  const audioBlob = req.file.buffer;

  try {
    // Save the recording file
    const filename = userId + "_" + Date.now()
    const filePath = `/recordings/${filename}.wav`;
    await fs.writeFile("." + filePath, audioBlob);

    // Save the recording information to the database
    const connection = await pool.getConnection();
    const [result] = await connection.execute('INSERT INTO recordings (user_id, file_path, filename) VALUES (?, ?, ?)', [userId, filePath, filename]);
    connection.release();

    res.json({ success: true, recordingId: result.insertId });
  } catch (error) {
    console.error('Error saving recording:', error);
    // If there's an error, delete the file
    if (req.file) {
      await fs.unlink(req.file.path);
    }
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});


app.get('/api/getUserRecordings', async (req, res) => {
  try {


    const fileName = "." + req.headers.pathfile;
    const filePath = path.join(__dirname, fileName);
    res.sendFile(filePath);


  } catch (error) {
    console.error('Error getting user recordings:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

app.get('/api/getUserRecordingsUrls/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const connection = await pool.getConnection();
    const [results] = await connection.execute('SELECT * FROM recordings WHERE user_id = ?', [userId]);
    connection.release();
    res.json({ recordings: results });
  } catch (error) {
    console.error('Error getting user recordings:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

app.delete('/api/deleteRecording/recordings/:filename', async (req, res) => {
  try {
    const filename = req.params.filename.split(".")[0];
    const connection = await pool.getConnection();

    // Delete recording from the database
    const [deleteResult] = await connection.execute('DELETE FROM recordings WHERE filename = ?', [filename]);
    connection.release();

    if (deleteResult.affectedRows > 0) {
      // Delete the associated file
      try {
        await fs.unlink("./recordings/" + filename + ".wav");
        res.json({ success: true, message: 'Recording deleted successfully' });
      } catch (fileError) {
        console.error('Error deleting file:', fileError);
        res.status(500).json({ success: false, error: 'Error deleting file' });
      }
    } else {
      res.status(404).json({ success: false, error: 'Recording not found' });
    }
  } catch (error) {
    console.error('Error deleting recording:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});