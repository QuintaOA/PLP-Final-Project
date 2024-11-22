const express = require('express');
const db = require('./database');

// password hashing
const bcrypt = require('bcryptjs');

const session = require('express-session');

const app = express();
const port = 6500;

// Middleware for parsing JSON
app.use(express.json());

// Middleware for session handling
app.use(session({
    secret: '12345678',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } 
}));

// Middleware to check if an admin is logged in
function authenticateAdmin(req, res, next) {
    if (req.session && req.session.adminId) {
        next(); 
    } else {
        res.status(401).send('Unauthorized: Admin access only. Please log in as an admin.');
    }
}

// Middleware to check if a patient is logged in
function authenticatePatient(req, res, next) {
    if (req.session.patientId) {
        next();
    } else {
        res.status(401).send('Unauthorized: Please log in to access this resource');
    }
}


// Create tables
app.get('/createtables', (req, res) => {
    // Create Patients tables
    const createPatientsTable = `
        CREATE TABLE IF NOT EXISTS Patients (
            patient_id INT AUTO_INCREMENT PRIMARY KEY,
            first_name VARCHAR(100),
            last_name VARCHAR(100),
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255),
            phone VARCHAR(15),
            date_of_birth DATE,
            gender ENUM('Male', 'Female', 'Other'),
            address VARCHAR(255)
        );
    `;

    // Create Doctors tables
    const createDoctorsTable = `
        CREATE TABLE IF NOT EXISTS Doctors (
            doctor_id INT AUTO_INCREMENT PRIMARY KEY,
            first_name VARCHAR(100),
            last_name VARCHAR(100),
            specialization VARCHAR(100),
            email VARCHAR(255) UNIQUE NOT NULL,
            phone VARCHAR(15),
            schedule JSON
        );
    `;

    // Create Appointments tables
    const createAppointmentsTable = `
        CREATE TABLE IF NOT EXISTS Appointments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            patient_id INT,
            doctor_id INT,
            appointment_date DATE,
            appointment_time TIME,
            status ENUM('scheduled', 'completed', 'canceled'),
            FOREIGN KEY (patient_id) REFERENCES Patients(patient_id),
            FOREIGN KEY (doctor_id) REFERENCES Doctors(doctor_id)
        );
    `;

    // Create Admin tables
    const createAdminTable = `
        CREATE TABLE IF NOT EXISTS Admin (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(100) UNIQUE,
            password_hash VARCHAR(255),
            role ENUM('admin', 'moderator')
        );
    `;

    // sequentially Create tables 
    db.query(createPatientsTable, (err) => {
        if (err) return res.status(500).send('Error creating Patients table');
        
        db.query(createDoctorsTable, (err) => {
            if (err) return res.status(500).send('Error creating Doctors table');
            
            db.query(createAppointmentsTable, (err) => {
                if (err) return res.status(500).send('Error creating Appointments table');
                
                db.query(createAdminTable, (err) => {
                    if (err) return res.status(500).send('Error creating Admin table');
                    
                    res.send('All tables created successfully');
                });
            });
        });
    });
});

// Home route
app.get('/', (req, res) => {
    res.send('Welcome to telemedicine Database');
});

// Start server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});



            // ADMIN
// Register - Creating Admin Account
app.post('/admin/register', async (req, res) => {
    try {
        // Destructure fields from the request body
        const { username, password, role } = req.body;

        // Check if any required field is missing
        if (!username || !password || !role) {
            return res.status(400).send('All fields are required');
        }

        // Validate the role field
        const validRoles = ['admin', 'moderator'];
        if (!validRoles.includes(role)) {
            return res.status(400).send('Invalid role. Role must be either admin or moderator');
        }

        // Check if the username is already registered
        db.query('SELECT * FROM Admin WHERE username = ?', [username], async (err, results) => {
            if (err) {
                console.error('Database Error:', err);
                return res.status(500).send('Error checking username availability');
            }
            if (results.length > 0) {
                return res.status(400).send('Username is already taken');
            }

            // Hash the password before storing it
            const passwordHash = await bcrypt.hash(password, 10);

            // Insert the new admin data into the database
            db.query(
                'INSERT INTO Admin (username, password_hash, role) VALUES (?, ?, ?)',
                [username, passwordHash, role],
                (err) => {
                    if (err) {
                        console.error('Database Error:', err);
                        return res.status(500).send('Error registering admin');
                    }
                    res.send('Admin registered successfully');
                }
            );
        });
    } catch (error) {
        console.error('Detailed Error:', error);
        res.status(500).send('Server error');
    }
});

// Admin Login - Authenticate admin user
app.post('/admin/login', async (req, res) => {
    const { username, password } = req.body;

    // Validate input fields
    if (!username || !password) {
        return res.status(400).send('Username and password are required');
    }

    // Check if the admin exists in the database
    db.query('SELECT * FROM Admin WHERE username = ?', [username], async (err, results) => {
        if (err) {
            console.error('Database Error:', err);
            return res.status(500).send('Error retrieving admin data');
        }

        if (results.length === 0) {
            return res.status(401).send('Invalid Username');
        }

        const admin = results[0];

        // Compare password with the stored hash
        const isValidPassword = await bcrypt.compare(password, admin.password_hash);
        if (!isValidPassword) {
            return res.status(401).send('Invalid password');
        }

        // Store the admin session
        req.session.adminId = admin.id;
        req.session.role = admin.role;

        res.send('Admin logged in successfully');
    });
});

// Admin Logout Route
app.post('/admin/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Error logging out');
        }
        res.send('Admin logged out successfully');
    });
});

// Route to display a list of patients (admin only)
app.get('/admin/patients', authenticateAdmin, (req, res) => {
    const { search, gender, minAge, maxAge } = req.query;
    let query = 'SELECT * FROM Patients';
    const conditions = [];
    const values = [];

    // Add search and filter conditions
    if (search) {
        conditions.push('(first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)');
        values.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (gender) {
        conditions.push('gender = ?');
        values.push(gender);
    }

    if (minAge) {
        conditions.push('TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) >= ?');
        values.push(minAge);
    }

    if (maxAge) {
        conditions.push('TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) <= ?');
        values.push(maxAge);
    }

    // Append conditions to query
    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }

    // Execute the query
    db.query(query, values, (err, results) => {
        if (err) {
            console.error('Database Error:', err);
            return res.status(500).send('Error retrieving patients');
        }
        res.json(results);
    });
});


            // PATIENT
// Register - Create Patient Account
app.post('/patients/register', async (req, res) => {
    try {
        // Destructure fields from the request body
        const { first_name, last_name, email, password, phone, date_of_birth, gender, address } = req.body;

        // Check if any required field is missing
        if (!first_name || !last_name || !email || !password || !phone || !date_of_birth || !gender || !address) {
            return res.status(400).send('All fields are required');
        }

        // Check if the email is already registered
        db.query('SELECT * FROM Patients WHERE email = ?', [email], async (err, results) => {
            if (err) {
                console.error('Database Error:', err);
                return res.status(500).send('Error checking email availability');
            }
            if (results.length > 0) {
                return res.status(400).send('Email is already registered');
            }

            // Hash the password before storing it
            const passwordHash = await bcrypt.hash(password, 10);

            // Insert the new patient data into the database
            db.query(
                'INSERT INTO Patients (first_name, last_name, email, password_hash, phone, date_of_birth, gender, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [first_name, last_name, email, passwordHash, phone, date_of_birth, gender, address],
                (err) => {
                    if (err) {
                        console.error('Database Error:', err);
                        return res.status(500).send('Error registering patient');
                    }
                    res.send('Patient registered successfully');
                }
            );
        });
    } catch (error) {
        console.error('Detailed Error:', error);
        res.status(500).send('Server error');
    }
});

// patient Login
app.post('/patients/login', (req, res) => {
    const { email, password } = req.body;

    // Check if email and password are provided
    if (!email || !password) {
        return res.status(400).send('Email and password are required');
    }

    // Query the database for the patient
    db.query('SELECT * FROM Patients WHERE email = ?', [email], async (err, results) => {
        if (err) {
            console.error('Database Error:', err);
            return res.status(500).send('Internal server error');
        }

        // Check if user exists and password matches
        if (results.length === 0 || !(await bcrypt.compare(password, results[0].password_hash))) {
            return res.status(401).send('Invalid credentials');
        }

        // Create session upon successful login
        req.session.patientId = results[0].patient_id;

        res.send('Logged in successfully');
    });
});

// Route to view profile information
app.get('/patients/profile', authenticatePatient, (req, res) => {
    const patientId = req.session.patientId;

    db.query('SELECT first_name, last_name, phone, date_of_birth, gender, address FROM Patients WHERE patient_id = ?', [patientId], (err, results) => {
        if (err) {
            console.error('Database Error:', err);
            return res.status(500).send('Internal server error');
        }

        if (results.length === 0) {
            return res.status(404).send('Profile not found');
        }

        res.json(results[0]);
    });
});

// Route to update profile information
app.put('/patients/profile', authenticatePatient, (req, res) => {
    const patientId = req.session.patientId;
    const { first_name, last_name, phone, date_of_birth, gender, address } = req.body;

    db.query(
        'UPDATE Patients SET first_name = ?, last_name = ?, phone = ?, date_of_birth = ?, gender = ?, address = ? WHERE patient_id = ?',
        [first_name, last_name, phone, date_of_birth, gender, address, patientId],
        (err, results) => {
            if (err) {
                console.error('Database Error:', err);
                return res.status(500).send('Internal server error');
            }

            if (results.affectedRows === 0) {
                return res.status(404).send('Profile not found');
            }

            res.send('Profile updated successfully');
        }
    );
});

// patient Logout Route
app.post('/patients/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Error logging out');
        }

        res.send('Logged out successfully');
    });
});

// Route to view appointment history (requires login)
app.get('/appointments/history', authenticatePatient, (req, res) => {
    const patientId = req.session.patientId;

    db.query(
        'SELECT * FROM Appointments WHERE patient_id = ?',
        [patientId],
        (err, results) => {
            if (err) {
                console.error('Database Error:', err);
                return res.status(500).send('Internal server error');
            }

            res.json(results); 
        }
    );
});

// Route for patients to delete their account
app.delete('/patients/delete', (req, res) => {
    if (!req.session || !req.session.patientId) {
        return res.status(401).send('Unauthorized: Please log in to delete your account');
    }

    const patientId = req.session.patientId;

    db.query('DELETE FROM Patients WHERE patient_id = ?', [patientId], (err, results) => {
        if (err) {
            console.error('Database Error:', err);
            return res.status(500).send('Error deleting patient account');
        }

        // Destroy session after account deletion
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).send('Error logging out after account deletion');
            }
            res.send('Account deleted successfully');
        });
    });
});



            // DOCTORS
// Route for admin to add new doctors including their schedules
app.post('/admin/doctors', authenticateAdmin, (req, res) => {
    const { first_name, last_name, email, phone, specialization, schedule } = req.body;

    // Validate input
    if (!first_name || !last_name || !email || !phone || !specialization || !schedule) {
        return res.status(400).send('All fields are required');
    }

    // Insert the doctor into the database
    db.query(
        'INSERT INTO Doctors (first_name, last_name, email, specialization, phone, schedule) VALUES (?, ?, ?, ?, ?, ?)',
        [first_name, last_name, email, specialization, phone, JSON.stringify(schedule)],
        (err, result) => {
            if (err) {
                console.error('Database Error:', err);
                return res.status(500).send('Error adding doctor');
            }
    
            res.send('Doctor and schedule added successfully');
        }
    );
});

// Route to display a list of doctors with their specialization and availability
app.get('/doctors', (req, res) => {
    const query = 'SELECT doctor_id, first_name, last_name, specialization, schedule FROM Doctors';

    db.query(query, (err, results) => {
        if (err) {
            console.error('Database Error:', err);
            return res.status(500).send('Error retrieving doctors');
        }

        // Format results to handle the schedule safely
        const formattedResults = results.map(doctor => {
            let schedule = doctor.schedule;
            // Check if the schedule is a string that needs to be parsed
            if (typeof schedule === 'string') {
                try {
                    schedule = JSON.parse(schedule);
                } catch (parseError) {
                    console.error('Error parsing schedule JSON:', parseError);
                    schedule = {}; // Fallback to an empty object if parsing fails
                }
            }

            return {
                doctor_id: doctor.doctor_id,
                name: `${doctor.first_name} ${doctor.last_name}`,
                specialization: doctor.specialization,
                availability: schedule
            };
        });

        res.json(formattedResults);
    });
});

// Route to update doctor profile or schedule (admin)
app.put('/doctors/update/:doctorId', authenticateAdmin, (req, res) => {
    const { doctorId } = req.params;
    const { first_name, last_name, email, specialization, phone, schedule } = req.body;

    // Check if the doctor exists
    db.query('SELECT * FROM Doctors WHERE doctor_id = ?', [doctorId], (err, results) => {
        if (err) {
            console.error('Database Error:', err);
            return res.status(500).send('Error checking doctor');
        }

        if (results.length === 0) {
            return res.status(404).send('Doctor not found');
        }

        // Update doctor profile with schedule
        const updateQuery = `
            UPDATE Doctors
            SET first_name = ?, last_name = ?, email = ?, specialization = ?, phone = ?, schedule = ?
            WHERE doctor_id = ?
        `;
        db.query(updateQuery, [first_name, last_name, email, specialization, phone, JSON.stringify(schedule), doctorId], (err) => {
            if (err) {
                console.error('Database Error:', err);
                return res.status(500).send('Error updating doctor profile');
            }
            res.send('Doctor profile and schedule updated successfully');
        });
    });
});

// Deactivate or delete a doctor profile (admin)
app.delete('/doctors/delete/:doctorId', authenticateAdmin, (req, res) => {
    const { doctorId } = req.params;

    // Check if the doctor exists
    db.query('SELECT * FROM Doctors WHERE doctor_id = ?', [doctorId], (err, results) => {
        if (err) {
            console.error('Database Error:', err);
            return res.status(500).send('Error checking doctor');
        }

        if (results.length === 0) {
            return res.status(404).send('Doctor not found');
        }

        // delete doctor profile
        const deleteQuery = `
            DELETE FROM Doctors WHERE doctor_id = ?
        `;
        db.query(deleteQuery, [doctorId], (err) => {
            if (err) {
                console.error('Database Error:', err);
                return res.status(500).send('Error deletingdoctor profile');
            }
            res.send('Doctor profile deleted successfully');
        });
    });
});

        // APPOINTMENT
// Appointment Booking Route 
app.post('/bookappointment', authenticatePatient, (req, res) => {
    const { doctor_id, appointment_date, appointment_time } = req.body;

    // Get the patient ID from the session
    const patient_id = req.session.patientId;

    // Check if all required fields are provided
    if (!doctor_id || !appointment_date || !appointment_time) {
        return res.status(400).send('All fields are required: doctor_id, appointment_date, and appointment_time');
    }

    // Ensure that the doctor exists
    const checkDoctorExistence = `SELECT * FROM Doctors WHERE doctor_id = ?`;

    db.query(checkDoctorExistence, [doctor_id], (err, results) => {
        if (err) {
            console.log('Error checking doctor existence:', err);
            return res.status(500).send('Error checking doctor existence');
        }

        if (results.length === 0) {
            return res.status(404).send('Doctor not found');
        }

        // Ensure that the patient exists 
        const checkPatientExistence = `SELECT * FROM Patients WHERE patient_id = ?`;

        db.query(checkPatientExistence, [patient_id], (err, results) => {
            if (err) {
                console.log('Error checking patient existence:', err);
                return res.status(500).send('Error checking patient existence');
            }

            if (results.length === 0) {
                return res.status(404).send('Patient not found');
            }

            // Check if the doctor is available at the requested time
            const checkDoctorAvailability = `SELECT * FROM Appointments WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ?`;

            db.query(checkDoctorAvailability, [doctor_id, appointment_date, appointment_time], (err, results) => {
                if (err) {
                    console.log('Error checking doctor availability:', err);
                    return res.status(500).send('Error checking doctor availability');
                }

                if (results.length > 0) {
                    return res.status(409).send('This time slot is already booked');
                }

                // Book the appointment if all checks pass
                const bookAppointmentQuery = `
                    INSERT INTO Appointments (patient_id, doctor_id, appointment_date, appointment_time, status)
                    VALUES (?, ?, ?, ?, 'scheduled')
                `;

                db.query(bookAppointmentQuery, [patient_id, doctor_id, appointment_date, appointment_time], (err) => {
                    if (err) {
                        console.log('Error booking appointment:', err);
                        return res.status(500).send('Error booking appointment');
                    }

                    res.send('Appointment booked successfully');
                });
            });
        });
    });
});

// Route to display upcoming appointments for a logged-in patient
app.get('/patients/appointments', authenticatePatient, (req, res) => {
    const patient_id = req.session.patientId;

    // Query to get appointments for the logged-in patient where status is not 'cancelled' and the appointment date is in the future
    const query = `
        SELECT a.id AS appointment_id, a.appointment_date, a.appointment_time, d.first_name AS doctor_first_name, 
               d.last_name AS doctor_last_name, a.status 
        FROM Appointments a
        JOIN Doctors d ON a.doctor_id = d.doctor_id
        WHERE a.patient_id = ? AND a.appointment_date > CURDATE()
        ORDER BY a.appointment_date, a.appointment_time
    `;

    db.query(query, [patient_id], (err, results) => {
        if (err) {
            console.log('Error fetching patient appointments:', err);
            return res.status(500).send('Error fetching appointments');
        }

        if (results.length === 0) {
            return res.send('No upcoming appointments');
        }

        res.json(results);
    });
});

// Route to display upcoming appointments for a doctor
app.get('/doctors/appointments/:doctorId', (req, res) => {
    const { doctorId } = req.params;  // changed from doctor_id to doctorId

    // Query to get appointments for the doctor where status is not 'cancelled' and the appointment date is in the future
    const query = `
        SELECT a.id AS appointment_id, a.appointment_date, a.appointment_time, p.first_name AS patient_first_name, 
               p.last_name AS patient_last_name, a.status 
        FROM Appointments a
        JOIN Patients p ON a.patient_id = p.patient_id
        WHERE a.doctor_id = ? AND a.appointment_date > CURDATE()
        ORDER BY a.appointment_date, a.appointment_time;
    `;

    db.query(query, [doctorId], (err, results) => {  
        if (err) {
            console.log('Error fetching doctor appointments:', err);
            return res.status(500).send('Error fetching appointments');
        }

        if (results.length === 0) {
            return res.send('No upcoming appointments');
        }

        res.json(results);
    });
});

// Route to reschedule an appointment (patient)
app.put('/patients/appointments/:appointmentId/reschedule', authenticatePatient, (req, res) => {
    const { appointmentId } = req.params;
    const { newDate, newTime } = req.body;

    // Validate input
    if (!newDate || !newTime) {
        return res.status(400).send('New date and time are required');
    }

    // Query to update the appointment date and time
    const query = `
        UPDATE Appointments
        SET appointment_date = ?, appointment_time = ?, status = 'scheduled'
        WHERE id = ? AND status != 'cancelled';
    `;

    db.query(query, [newDate, newTime, appointmentId], (err, results) => {
        if (err) {
            console.log('Error rescheduling appointment:', err);
            return res.status(500).send('Error rescheduling appointment');
        }

        if (results.affectedRows === 0) {
            return res.status(404).send('Appointment not found or cannot be rescheduled');
        }

        res.send('Appointment rescheduled successfully');
    });
});

// Route to cancel an appointment (patient)
app.put('/patients/appointments/:appointmentId/cancel', authenticatePatient, (req, res) => {
    const { appointmentId } = req.params;

    // Query to update the status of the appointment to 'canceled'
    const query = `
        UPDATE Appointments
        SET status = 'canceled'
        WHERE id = ? AND status != 'canceled';
    `;

    db.query(query, [appointmentId], (err, results) => {
        if (err) {
            console.log('Error cancelling appointment:', err);
            return res.status(500).send('Error cancelling appointment');
        }

        if (results.affectedRows === 0) {
            return res.status(404).send('Appointment not found or already cancelled');
        }

        res.send('Appointment cancelled successfully');
    });
});
