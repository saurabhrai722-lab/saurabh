const express = require("express");
const bodyParser = require("body-parser");
const multer = require("multer");
const path = require("path");

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public")); // For CSS/JS/HTML
app.use("/uploads", express.static(path.join(__dirname, "uploads"))); // Serve uploaded images

// Storage for images (user + admin proof)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // save in uploads/
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + path.extname(file.originalname);
    console.log("📂 Saving file:", uniqueName); // Debug log
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// In-memory database
let complaints = [];
let users = [];
const adminUser = { username: "admin", password: "1234" };

// ================= ROUTES =================

// Homepage
app.get("/", (req, res) => {
  res.send(`
    <h2>Welcome to Civic Complaint Portal</h2>
    <a href="/complaint">Submit Complaint</a><br>
    <a href="/status">Check Complaint Status</a><br>
    <a href="/admin-login">Admin Login</a>
  `);
});

// Complaint form
app.get("/complaint", (req, res) => {
  res.send(`
    <h2>Submit Complaint</h2>
    <form action="/submit-complaint" method="POST" enctype="multipart/form-data">
      Name: <input type="text" name="username" required><br>
      Address: <input type="text" name="address" required><br>
      Phone: <input type="text" name="phone" required><br>
      Category: 
      <select name="category" required>
        <option value="Pothole">Pothole</option>
        <option value="Street Light">Street Light</option>
        <option value="Garbage">Garbage</option>
      </select><br>
      Description: <input type="text" name="description" required><br>
      Upload Image: <input type="file" name="image"><br>
      <button type="submit">Submit</button>
    </form>
  `);
});

// Submit complaint
app.post("/submit-complaint", upload.single("image"), (req, res) => {
  const { username, address, phone, category, description } = req.body;
  if (!username || !address || !phone || !category || !description) {
    return res.send("⚠️ All fields required.");
  }

  const complaint = {
    id: complaints.length + 1,
    username,
    address,
    phone,
    category,
    description,
    status: "Pending",
    image: req.file ? `/uploads/${req.file.filename}` : null,
    proof: null
  };

  complaints.push(complaint);
  users.push({ username, phone });
  console.log("✅ New Complaint Added:", complaint);

  res.send(`
    <h3>Complaint Submitted Successfully!</h3>
    <p>Your complaint ID is: ${complaint.id}</p>
    <a href="/status">Check Status</a>
  `);
});

// Status page
app.get("/status", (req, res) => {
  let html = "<h2>Complaint Status</h2>";
  complaints.forEach(c => {
    html += `
      <div style="border:1px solid black; margin:10px; padding:10px;">
        <p><b>ID:</b> ${c.id}</p>
        <p><b>User:</b> ${c.username}</p>
        <p><b>Category:</b> ${c.category}</p>
        <p><b>Description:</b> ${c.description}</p>
        <p><b>Status:</b> ${c.status}</p>
        ${c.image ? `<p>User Image:<br><img src="${c.image}" width="200"></p>` : ""}
        ${c.proof ? `<p>Admin Proof:<br><img src="${c.proof}" width="200"></p>` : ""}
      </div>
    `;
  });
  res.send(html + `<a href="/">Home</a>`);
});

// Admin login page
app.get("/admin-login", (req, res) => {
  res.send(`
    <h2>Admin Login</h2>
    <form action="/admin" method="POST">
      Username: <input type="text" name="username" required><br>
      Password: <input type="password" name="password" required><br>
      <button type="submit">Login</button>
    </form>
  `);
});

// Admin login handling
app.post("/admin", (req, res) => {
  const { username, password } = req.body;
  if (username === adminUser.username && password === adminUser.password) {
    let html = "<h2>Admin Dashboard</h2>";
    complaints.forEach(c => {
      html += `
        <div style="border:1px solid black; margin:10px; padding:10px;">
          <p><b>ID:</b> ${c.id}</p>
          <p><b>User:</b> ${c.username}</p>
          <p><b>Complaint:</b> ${c.description}</p>
          <p><b>Status:</b> ${c.status}</p>
          ${c.image ? `<p>User Image:<br><img src="${c.image}" width="200"></p>` : ""}
          ${c.proof ? `<p>Admin Proof:<br><img src="${c.proof}" width="200"></p>` : ""}
          <form action="/update-status/${c.id}" method="POST" enctype="multipart/form-data">
            Update Status: 
            <select name="status">
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select><br>
            Upload Proof: <input type="file" name="proof"><br>
            <button type="submit">Update</button>
          </form>
        </div>
      `;
    });
    res.send(html + `<a href="/">Logout</a>`);
  } else {
    res.send("❌ Invalid admin credentials. <a href='/admin-login'>Try Again</a>");
  }
});

// Admin update status with proof
app.post("/update-status/:id", upload.single("proof"), (req, res) => {
  const complaint = complaints.find(c => c.id == req.params.id);
  if (complaint) {
    complaint.status = req.body.status;
    if (req.file) {
      complaint.proof = `/uploads/${req.file.filename}`;
      console.log("📷 Admin uploaded proof:", complaint.proof);
    }
    res.redirect("/admin-login");
  } else {
    res.send("⚠️ Complaint not found.");
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
