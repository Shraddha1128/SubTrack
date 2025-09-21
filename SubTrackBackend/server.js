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
    password: '', // replace with your MySQL password
    database: 'subtrack'
})

function getStatus(expiryDate) {
    const today = new Date()
    const exp = new Date(expiryDate)
    const diffDays = Math.ceil((exp - today) / (1000*60*60*24))
    return diffDays <= 7 ? "Expiring Soon" : "Active"
}


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

        const sql = 'INSERT INTO users (name, phnumber, email, password, profile_pic) VALUES (?, ?, ?, ?, ?)'
        db.query(sql, [name, phnumber, email, hashedPassword, profilePic], (err, result) => {
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
                created_at : user.created_at
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

// ===================== SUBSCRIPTIONS =====================

// GET all subscriptions for a user
app.get('/api/subscriptions', (req,res)=>{
    const email = req.query.email
    if (!email) return res.status(400).json({ error: 'Email required' })

    db.query('SELECT * FROM subscriptions WHERE userEmail = ?', [email], (err, results)=>{
        if(err) return res.status(500).json({ message: err.message })
        res.json(results)
    })
})

// POST add subscription
app.post('/subscriptions',(req,res)=>{
    const {userEmail,name,price,expiryDate} = req.body
    const status = getStatus(expiryDate)
    db.query('INSERT INTO subscriptions (userEmail,name,price,expiryDate,status) VALUES (?,?,?,?,?)',
    [userEmail,name,price,expiryDate,status], (err,result)=>{
        if(err) return res.status(500).json({message:err.message})
        db.query('SELECT * FROM subscriptions WHERE id=?',[result.insertId],(err2,row)=>{
            if(err2) return res.status(500).json({message:err2.message})
            res.status(201).json(row[0])
        })
    })
})

// PUT update subscription
app.put('/subscriptions/:id',(req,res)=>{
    const id = req.params.id
    const {name,price,expiryDate,status} = req.body
    const updateFields = []
    const values = []

    if(name){ updateFields.push('name=?'); values.push(name) }
    if(price){ updateFields.push('price=?'); values.push(price) }
    if(expiryDate){ updateFields.push('expiryDate=?'); values.push(expiryDate) }
    if(status){ updateFields.push('status=?'); values.push(status) }

    values.push(id)
    db.query(`UPDATE subscriptions SET ${updateFields.join(',')} WHERE id=?`, values, err=>{
        if(err) return res.status(500).json({message:err.message})
        db.query('SELECT * FROM subscriptions WHERE id=?',[id],(err2,row)=>{
            if(err2) return res.status(500).json({message:err2.message})
            res.json(row[0])
        })
    })
})

// DELETE subscription
app.delete('/subscriptions/:id',(req,res)=>{
    const id = req.params.id
    db.query('DELETE FROM subscriptions WHERE id=?',[id], err=>{
        if(err) return res.status(500).json({message:err.message})
        res.json({message:'Deleted successfully'})
    })
})




// ===================== START SERVER =====================
app.listen(3000, () => console.log('Server running on http://localhost:3000'))
