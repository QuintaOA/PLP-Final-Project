//import
const db = require('../config/db');
const bcrypt = require('bcryptjs');

// PATIENT
// Patient registration function
exports.registerUser = async (request, response) => {
    // Fetch data from request body
    const { 
        first_name, 
        last_name, 
        email, 
        password, 
        phone, 
        date_of_birth, 
        country, 
        gender, 
        address 
    } = request.body;

    try {
        // Check if user already exists
        const [rows] = await db.execute('SELECT * FROM patients WHERE email = ?', [email]);
        if (rows.length > 0) {
            return response.status(400).json({ message: 'User already exists!' });
        }

        // Hash the password
        const password_hash = await bcrypt.hash(password, 10);

        // Insert record into the database
        await db.execute(
            `INSERT INTO patients (
                first_name, last_name, email, password_hash, phone, date_of_birth, country, gender, address
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                first_name, 
                last_name, 
                email, 
                password_hash, 
                phone, 
                date_of_birth, 
                country, 
                gender,
                address
            ]
        );

        // Respond with success
        response.status(201).json({ message: 'User registered successfully!' });
    } catch (error) {
        // Handle errors
        response.status(500).json({ message: 'An error occurred!', error });
    }
};


// patient login function
exports.loginUser = async (req, res) => {
        const { email, password } = req.body;
    
        // Validate input
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }
        console.log(email)
    
        try {
            // Query the database for the patient
            const [results] = await db.execute('SELECT * FROM patients WHERE email = ?', [email]);
    
            // Check if patient exists and validate the password
            if (results.length === 0) {
                return res.status(404).json({ message: 'Patient not found! Please register.' });
            }
    
            const patient = results[0];
            const isMatch = await bcrypt.compare(password, patient.password_hash);
    
            if (!isMatch) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }
    
            // Create session upon successful login
            req.session.patientId = patient.patient_id;
            console.log('login succesful')
    
            return res.status(200).json({
                message: 'Login successful!',
                patient: {
                    id: patient.patient_id,
                    name: patient.name,
                    email: patient.email,
                },
            });
        } catch (error) {
            console.error('Error during login:', error);
            return res.status(500).json({ message: 'Internal server error', error });
        }
    };

// delete patinet profile
exports.deleteUser
//-----STILL PENDING TO BE COMPLETED BY DECEMBER 2024

























































