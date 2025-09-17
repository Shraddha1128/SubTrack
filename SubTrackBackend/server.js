const express = require('express')
const mysql = require('mysql2')
const bcrypt = require('bcrypt')
const bodyParser = require('body-parser')
const cors = require('cors')
const path = require('path')


const app = express()
app.use(express.json())

app.use(cors())
app.use('/images', express.static(path.join(__dirname, 'images'))) // serve profile pics

// MySQL connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', // replace with your MySQL password
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

        const sql = 'INSERT INTO users (name, phnumber, email, password, profile_pic) VALUES (?, ?, ?, ?, ?)'
        db.query(sql, [name, phnumber, email, hashedPassword, profilePic], (err, result) => {
            if(err){
                console.error("Database Error:", err)  // <-- this will print the exact MySQL error
                return res.status(500).send({ error: err.sqlMessage })
            }
            res.send({ message: 'User registered successfully' })
        })
    } catch (err) {
        console.error("Server Error:", err)  // <-- prints unexpected server errors
        res.status(500).send({ error: 'Something went wrong' })
    }
})


// ===================== LOGIN =====================
// app.post('/login', (req, res) => {
//     const { email, password } = req.body

//     const sql = 'SELECT * FROM users WHERE email = ?'
//     db.query(sql, [email], async (err, results) => {
//         if(err) return res.status(500).send({ error: err.sqlMessage })
//         if(results.length === 0) return res.status(400).send({ message: 'User not found' })

//         const user = results[0]
//         const match = await bcrypt.compare(password, user.password)
//         if(!match) return res.status(400).send({ message: 'Incorrect password' })

//         res.send({
//             message: 'Login successful',
//             user: {
//                 id: user.id,
//                 name: user.name,
//                 email: user.email,
//                 profile_pic: `http://localhost:3000/uploads/${user.profile_pic}`
//             }
//         })
//     })
// })
// ===================== LOGIN =====================
app.post('/login', async (req, res) => {
    const { email, password } = req.body

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" })
    }

    const sql = 'SELECT * FROM users WHERE email = ?'
    db.query(sql, [email], async (err, results) => {
        if (err) {
            console.error("Database Error:", err)
            return res.status(500).json({ error: err.sqlMessage })
        }

        if (results.length === 0) {
            return res.status(400).json({ message: 'User not found' })
        }

        const user = results[0]
        const match = await bcrypt.compare(password, user.password)
        if (!match) {
            return res.status(400).json({ message: 'Incorrect password' })
        }

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


// ===================== START SERVER =====================
app.listen(3000, () => console.log('Server running on http://localhost:3000'))
