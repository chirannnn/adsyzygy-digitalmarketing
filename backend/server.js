const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:5173"];

console.log("Allowed Origins (from env):", allowedOrigins);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.error("CORS Error: Origin " + origin + " is not allowed.");
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.options("*", cors());

app.use(express.json());

// MySQL connection 
const pool = mysql.createPool({ 
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 3,
});

// Keep-alive route 
app.get('/keepalive', (req, res) => res.send('OK'));

// Helper function for database queries 
function executeQuery(sql, values, res) {
  const maxRetries = 3;
  let retryCount = 0;

  function attemptQuery() {
    pool.query(sql, values, (err, result) => {
      if (err) {
        console.error("Database query error:", err);
        if (err.code === 'ECONNRESET' && retryCount < maxRetries) {
          retryCount++;
          const backoff = Math.pow(2, retryCount) * 1000;
          console.log(`Retrying query (attempt ${retryCount}) in ${backoff / 1000} seconds...`);
          setTimeout(attemptQuery, backoff);
        } else {
          res.status(500).json({ message: "Database error", error: err.message });
        }
      } else {
        res.status(200).json({ message: "Success!" });
      }
    });
  }
  attemptQuery(); 
}



app.post("/save-buttons", (req, res) => {
  const { ClientNeed } = req.body;
  if (!ClientNeed) {
    return res.status(400).json({ message: "ClientNeed is required." });
  }
  const sql = "INSERT INTO form1_client_need (client_need) VALUES (?)";
  const values = [ClientNeed];
  executeQuery(sql, values, res);
});

app.post("/save-goals", (req, res) => {
  const { ClientGoal } = req.body;
  if (!ClientGoal) {
    return res.status(400).json({ message: "ClientGoal is required." });
  }
  const sql = "INSERT INTO form2_client_goal (client_goal) VALUES (?)";
  const values = [ClientGoal];
  executeQuery(sql, values, res);
});

app.post("/save-budget", (req, res) => {
  const { ClientBudget } = req.body;
  if (!ClientBudget) {
    return res.status(400).json({ message: "ClientBudget is required." });
  }
  const sql = "INSERT INTO form3_client_budget (client_budget) VALUES (?)";
  const values = [ClientBudget];
  executeQuery(sql, values, res);
});

app.post("/save-website-url", (req, res) => {
  const { client_site_url } = req.body;
  if (!client_site_url) {
    return res.status(400).json({ message: "Website URL is required." });
  }
  const sql = "INSERT INTO form4_client_site (client_site_url) VALUES (?)";
  const values = [client_site_url];
  executeQuery(sql, values, res);
});

app.post("/save-personal-info", (req, res) => {
  const { name, email, phone } = req.body;
  if (!name || !email || !phone) {
    return res.status(400).send({ error: "All fields are required." });
  }
  const query = "INSERT INTO form5_client_personal_info (name, email, phone) VALUES (?, ?, ?)";
  executeQuery(query, [name, email, phone], res);
});


app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
