const express = require('express')
const mysql = require('mysql2')
const bcrypt = require('bcrypt')
const bodyParser = require('body-parser')
const cors = require("cors")
const path = require("path")
const fs = require("fs")

const app = express()
app.use(cors())
app.use(express.json())
app.use(bodyParser.json())
app.use("/images", express.static(path.join(__dirname, "public/images")))

// MySQL connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', 
    database: 'subtrack'
})

db.connect(err => {
    if(err) throw err
    console.log('MySQL Connected')
})

// ===================== SIGNUP =====================
app.post('/signup', async (req, res) => {
    const { name, email, password, confirmPassword, phnumber } = req.body

    if(!name || !email || !password || !confirmPassword || !phnumber) {
        return res.status(400).send({ message: "All fields are required" })
    }

    if(password !== confirmPassword) {
        return res.status(400).send({ message: "Passwords do not match" })
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10)
        const profilePic = 'profile.png'

        const sql = 'INSERT INTO users (name, phnumber, email, password, profile_pic, role) VALUES (?, ?, ?, ?, ?, ?)'
db.query(sql, [name, phnumber, email, hashedPassword, profilePic, 'user'], (err, result) => {
            if(err){
                console.error("Database Error:", err)
                return res.status(500).send({ error: err.sqlMessage })
            }
            res.send({ message: 'User registered successfully' })
        })
    } catch (err) {
        console.error("Server Error:", err)
        res.status(500).send({ error: 'Something went wrong' })
    }
})

// ===================== LOGIN =====================
app.post('/login', async (req, res) => {
    const { email, password } = req.body

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" })
    }

    const adminEmail = "admin@gmail.com"
const adminPassword = "admin123"

if (email === adminEmail && password === adminPassword) {
    return res.json({
        message: "Admin login successful",
        user: {
            id: 0,
            name: "Admin",
            email: adminEmail,
            phnumber: "N/A",
            profile_pic: "http://localhost:3000/images/admin.jpeg",
            role: "admin"
        }
    })

    }

    // ✅ If not admin, continue with user login from DB
    const sql = 'SELECT * FROM users WHERE email = ?'
    db.query(sql, [email], async (err, results) => {
        if (err) return res.status(500).json({ error: err.sqlMessage })
        if (results.length === 0) return res.status(400).json({ message: 'User not found' })

        const user = results[0]
        const match = await bcrypt.compare(password, user.password)
        if (!match) return res.status(400).json({ message: 'Incorrect password' })

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phnumber: user.phnumber,
                profile_pic: `http://localhost:3000/images/${user.profile_pic}`,
                created_at: user.created_at,
                role: "user"
            }
        })
    })
})


// ===================== CHANGE PASSWORD =====================
app.post("/api/change-password", (req, res) => {
    const { id, currentPassword, newPassword } = req.body
    if (!id || !currentPassword || !newPassword) return res.json({ success: false, error: "Missing fields" })

    db.query("SELECT password FROM users WHERE id = ?", [id], async (err, result) => {
        if (err) return res.json({ success: false, error: "Database error" })
        if (result.length === 0) return res.json({ success: false, error: "User not found" })

        const hashedPassword = result[0].password
        const isMatch = await bcrypt.compare(currentPassword, hashedPassword)
        if (!isMatch) return res.json({ success: false, error: "Current password is incorrect" })

        const newHashedPassword = await bcrypt.hash(newPassword, 10)
        db.query("UPDATE users SET password = ? WHERE id = ?", [newHashedPassword, id], (err2) => {
            if (err2) return res.json({ success: false, error: "Failed to update password" })
            return res.json({ success: true, message: "Password updated successfully" })
        })
    })
})

// ===================== UPDATE PROFILE =====================
app.post("/api/update-profile", (req, res) => {
    const { id, name, email, phnumber } = req.body
    if (!id || !name || !email || !phnumber) return res.json({ success: false, error: "All fields are required" })

    const sql = "UPDATE users SET name=?, email=?, phnumber=? WHERE id=?"
    db.query(sql, [name, email, phnumber, id], (err) => {
        if (err) return res.json({ success: false, error: err.message })

        db.query("SELECT * FROM users WHERE id=?", [id], (err2, results) => {
            if (err2) return res.json({ success: false, error: err2.message })
            if (results.length === 0) return res.json({ success: false, error: "User not found" })

            const user = results[0]
            res.json({
                success: true,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    phnumber: user.phnumber,
                    profile_pic: `http://localhost:3000/images/${user.profile_pic}`,
                    created_at: user.created_at
                }
            })
        })
    })
})

// ===================== UPDATE PROFILE PICTURE (without multer) =====================
app.post("/api/update-profile-pic", (req, res) => {
  const { id, profile_pic_base64 } = req.body

  if (!id || !profile_pic_base64) {
    return res.json({ success: false, error: "Missing id or photo" })
  }

  // Convert Base64 to buffer
  const matches = profile_pic_base64.match(/^data:([A-Za-z-+/]+);base64,(.+)$/)
  if (!matches || matches.length !== 3) {
    return res.json({ success: false, error: "Invalid image format" })
  }

  const ext = matches[1].split("/")[1] // e.g., png or jpeg
  const data = Buffer.from(matches[2], "base64")
  const filename = `${Date.now()}.${ext}`
  const filepath = path.join(__dirname, "public/images", filename)

  // Save file
  fs.writeFile(filepath, data, (err) => {
    if (err) return res.json({ success: false, error: err.message })

    // Update database
    const sql = "UPDATE users SET profile_pic=? WHERE id=?"
    db.query(sql, [filename, id], (err2) => {
      if (err2) return res.json({ success: false, error: err2.message })

      db.query("SELECT * FROM users WHERE id=?", [id], (err3, results) => {
        if (err3) return res.json({ success: false, error: err3.message })
        if (results.length === 0) return res.json({ success: false, error: "User not found" })

        const user = results[0]
        res.json({
          success: true,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phnumber: user.phnumber,
            profile_pic: `http://localhost:3000/images/${user.profile_pic}`,
            created_at: user.created_at
          }
        })
      })
    })
  })
})
// ===================== GET ALL USERS =====================
app.get('/api/users', (req, res) => {
    const sql = 'SELECT id, name, email, phnumber, profile_pic,role FROM users ORDER BY id DESC';
    db.query(sql, (err, results) => {
        if (err) {
            console.error("SQL Error:", err)
            return res.status(500).json({ error: err.sqlMessage });
        }
        console.log("Users fetched:", results.length)
        res.json(results); 
    });
});

// Add a plan

app.post('/api/plans', (req, res) => {
    const { name, price, startDate, expiryDate, description } = req.body
    if (!name || !price || !startDate || !expiryDate)
        return res.status(400).json({ success: false, error: "All fields are required" })

    const sql = 'INSERT INTO plans (name, price, startDate, expiryDate, description) VALUES (?, ?, ?, ?, ?)'
    db.query(sql, [name, price, startDate, expiryDate, description || ''], (err, result) => {
        if (err) return res.status(500).json({ success: false, error: err.sqlMessage })
        res.json({ success: true, message: "Plan added successfully", id: result.insertId })
    })
})


// Edit a plan
app.put('/api/plans/:id', (req, res) => {
    const { id } = req.params;
    const { name, price, startDate, expiryDate, description } = req.body;

    if (!name || !price || !startDate || !expiryDate)
        return res.status(400).json({ success: false, error: "All fields are required" });

    const sql = 'UPDATE plans SET name=?, price=?, startDate=?, expiryDate=?, description=? WHERE Id=?';
    db.query(sql, [name, price, startDate, expiryDate, description || '', id], (err) => {
        if(err) return res.status(500).json({ success: false, error: err.sqlMessage });
        res.json({ success: true, message: "Plan updated successfully" });
    });
});

// Get single plan by Id
app.get('/api/plans/:id', (req, res) => {
    const { id } = req.params
    const sql = 'SELECT * FROM plans WHERE Id=?'
    db.query(sql, [id], (err, results) => {
        if(err) return res.status(500).json({ success: false, error: err.sqlMessage })
        if(results.length === 0) return res.status(404).json({ success: false, error: "Plan not found" })
        res.json(results[0])
    })
})




// Delete a plan
app.delete('/api/plans/:id', (req, res) => {
    const { id } = req.params
    const sql = 'DELETE FROM plans WHERE Id=?'
    db.query(sql, [id], (err) => {
        if (err) return res.status(500).json({ success: false, error: err.sqlMessage })
        res.json({ success: true, message: "Plan deleted successfully" })
    })
})

// Get all plans
app.get('/api/plans', (req, res) => {
    const sql = 'SELECT * FROM plans ORDER BY id DESC'
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ success: false, error: err.sqlMessage })
        res.json(results)
    })
})

// Add subscription for a user (when user buys a plan)
// app.post('/api/subscriptions', (req, res) => {
//     const { user_id, plan_id } = req.body
//     if (!user_id || !plan_id)
//         return res.status(400).json({ success: false, error: "All fields are required" })

//     // Get plan details
//     db.query('SELECT * FROM plans WHERE id=?', [plan_Id], (err, plans) => {
//         if (err) return res.status(500).json({ success: false, error: err.sqlMessage })
//         if (plans.length === 0) return res.status(400).json({ success: false, error: "Plan not found" })

//         const plan = plans[0]
//         const sql = 'INSERT INTO subscriptions (user_id, plan_id, name, price, status, expiryDate) VALUES (?, ?, ?, ?, ?, ?)'
//         db.query(sql, [user_id, plan_id, plan.name, plan.price, plan.status, plan.expiryDate], (err, result) => {
//             if (err) return res.status(500).json({ success: false, error: err.sqlMessage })
//             res.json({ success: true, message: "Subscription purchased", id: result.insertId })
//         })
//     })
// })

// app.get('/api/subscriptions', (req, res) => {
//     const { user_id } = req.query
//     let sql = 'SELECT * FROM subscriptions'
//     const params = []

//     if (user_id) {
//         sql += ' WHERE user_id=?'
//         params.push(user_id)
//     }

//     sql += ' ORDER BY expiryDate DESC'
//     db.query(sql, params, (err, results) => {
//         if (err) return res.status(500).json({ success: false, error: err.sqlMessage })
//         res.json(results)
//     })
// })
// // ===================== GET ALL SUBSCRIPTIONS =====================
// app.get('/api/subscriptions', (req, res) => {
//     const sql = 'SELECT id, userEmail, name, price, status, expiryDate FROM subscriptions ORDER BY expiryDate DESC';
    
//     db.query(sql, (err, results) => {
//         if (err) {
//             console.error("SQL Error:", err);
//             return res.status(500).json({ error: err.sqlMessage });
//         }
//         res.json(results);
//     });
// });

app.post('/api/subscribe', async (req, res) => {
    const { planId, userEmail, status, purchasedAt } = req.body;

    const query = `INSERT INTO subscriptions (planId, userEmail, status, purchasedAt, activity)
                   VALUES (?, ?, ?, ?, ?)`;

    db.query(query, [planId, userEmail, status, purchasedAt, 'Active'], (err, result) => {
        if (err) {
            console.error('Subscription insert error:', err);
            return res.json({ success: false, error: err.sqlMessage });
        }
        res.json({ success: true, message: 'Subscription added successfully' });
    });
});

// server.js or subscriptions.js route file

// GET subscriptions by user
app.get('/api/subscriptions', (req, res) => {
    const email = req.query.email;
    const sql = `
        SELECT s.id AS id, s.userEmail, s.activity, s.status,
               p.id AS planId, p.name, p.description, p.price, p.startDate, p.expiryDate
        FROM subscriptions s
        JOIN plans p ON s.planId = p.id
        WHERE s.userEmail = ?
    `;
    db.query(sql, [email], (err, results) => {
        if(err) return res.status(500).json({error: err.message});
        res.json(results);
    });
});

// PUT update subscription activity/status (Pause/Resume/Renew)
app.put('/api/subscriptions/:id', (req, res) => {
    const subId = req.params.id;
    const { activity, status } = req.body;
    const sql = `UPDATE subscriptions SET activity = ?, status = ? WHERE id = ?`;
    db.query(sql, [activity || null, status || null, subId], (err, results) => {
        if(err) return res.status(500).json({error: err.message});
        res.json({success: true});
    });
});

app.get('/api/subscriptions-with-plans', (req, res) => {
    const query = `
        SELECT 
            s.id,
            s.userEmail,
            s.activity,
            p.name,
            p.description,
            p.price,
            p.startDate,
            p.expiryDate
        FROM subscriptions s
        JOIN plans p ON s.planId = p.id
        ORDER BY s.id DESC
    `;
    db.query(query, (err, results) => {
        if(err) {
            console.error(err);
            return res.status(500).json({ error: 'Database query error' });
        }
        res.json(results);
    });
});






// ===================== START SERVER =====================
app.listen(3000, () => console.log('Server running on http://localhost:3000'))
