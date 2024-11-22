//Week 5
// Get all input fields
const formFields = [
    'name',
    'email',
    'password',
    'confirmPassword',
    'age',
    'gender',
    'country',
    'terms'
];

// Add event listeners for real-time updates
formFields.forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (field) {
        field.addEventListener('input', updateSummary);
    }
});

// Registration form validation
document.getElementById("registrationForm").addEventListener("submit", function(e) {
    e.preventDefault();
    
    // Clear previous error messages
    document.querySelectorAll(".error").forEach(el => el.innerText = '');
    
    let valid = true;
    let errors = [];

    // Validate name
    let name = document.getElementById('name').value;
    if (name === "") {
        document.getElementById('nameError').innerText = 'Error! Name is required.';
        valid = false;
    }

    // Validate email
    let email = document.getElementById('email').value;
    const emailPattern = /^[^ ]+@[^ ]+\.[a-z]{2,3}$/;
    if (!email.match(emailPattern)) {
        document.getElementById('emailError').innerText = 'Invalid email format';
        valid = false;
    }

    // Validate password
    let password = document.getElementById('password').value;
    if (password === "") {
        document.getElementById('passwordError').innerText = 'Error! Password is required.';
        valid = false;
    } else if (password.length < 8) {
        document.getElementById('passwordError').innerText = 'Error! Password must be at least 8 characters long.';
        valid = false;
    }

    // Validate confirm password
    let confirmPassword = document.getElementById('confirmPassword').value;
    if (confirmPassword !== password) {
        document.getElementById('confirmPasswordError').innerText = 'Passwords do not match.';
        valid = false;
    }

    // Validate age
    let age = document.getElementById('age').value;
    if (age === "") {
        document.getElementById('ageError').innerText = 'Error! Age is required.';
        valid = false;
    } else if (isNaN(age) || age < 18 || age > 100) {
        document.getElementById('ageError').innerText = 'Error! Age must be a number between 18 and 100.';
        valid = false;
    }

    // Validate gender
    let gender = document.querySelector('input[name="gender"]:checked');
    if (!gender) {
        document.getElementById('genderError').innerText = 'Please select a gender.';
        valid = false;
    }

    // Validate terms and conditions
    const terms = document.getElementById('terms').checked;
    if (!terms) {
        document.getElementById('termsError').innerText = 'You must agree to the terms and conditions.';
        valid = false;
    }

    // If validation fails, show an error message
    if (!valid) {
        alert("Please fix the errors before submitting.");
        return false;
    }

    // Show success message and display form data
    alert("Signup successful");
    const formData = captureFormData();
    displayFormData(formData);

    // Reset the form fields after submission
    document.getElementById("registrationForm").reset();

});

    // Capture form data in an object
function captureFormData() {
    return {
        name: document.getElementById("name").value,
        email: document.getElementById("email").value,
        password: document.getElementById("password").value,  
        confirmPassword: document.getElementById("confirmPassword").value,  
        age: document.getElementById("age").value,
        gender: document.querySelector('input[name="gender"]:checked') ? document.querySelector('input[name="gender"]:checked').value : '',
        country: document.getElementById("country").value,
        termsAccepted: document.getElementById("terms").checked
    };
}

// Display form data in a table
function displayFormData(data) {
    const summaryContent = document.getElementById("summaryContent");
    summaryContent.innerHTML = `
        <table>
            <tr>
                <th>FIELD</th>
                <th>VALUE</th>
            </tr>
            <tr>
                <td><strong>Full Name:</strong></td>
                <td>${data.name}</td>
            </tr>
            <tr>
                <td><strong>Email:</strong></td>
                <td>${data.email}</td>
            </tr>
            <tr>
                <td><strong>Password:</strong></td>
                <td>${data.password}</td> <!-- For security reasons, you may want to exclude this -->
            </tr>
            <tr>
                <td><strong>Confirm Password:</strong></td>
                <td>${data.confirmPassword}</td> <!-- For security reasons, you may want to exclude this -->
            </tr>
            <tr>
                <td><strong>Age:</strong></td>
                <td>${data.age}</td>
            </tr>
            <tr>
                <td><strong>Gender:</strong></td>
                <td>${data.gender}</td>
            </tr>
            <tr>
                <td><strong>Country:</strong></td>
                <td>${data.country}</td>
            </tr>
            <tr>
                <td><strong>Terms Accepted:</strong></td>
                <td>${data.termsAccepted ? "Yes" : "No"}</td>
            </tr>
        </table>
    `;
}

// Update the summary when form inputs change
function updateSummary() {
    const formData = captureFormData();
    displayFormData(formData);
}




    //week 4

// Login form validation
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault()
    let valid = true;
    

    //clear error messages
    document.getElementById('loginEmailError').innerHTML =''
    document.getElementById('loginPasswordError').innerHTML =''
                       
    
    //validate email
    let email = document.getElementById('loginEmail').value;
    const emailPattern = /^[^ ]+@[^ ]+\.[a-z]{2,3}$/;
    if (!email.match(emailPattern)) {
        document.getElementById('loginEmailError').innerText = 'Invalid email format';
        errors.push('Invalid email format');
    
    }

    //validate password
    let password = document.getElementById('loginPassword').value;
    if(password === ""){
        document.getElementById('loginPasswordError').innerHTML = 'Error! Password is required.'
        valid = false;
    
    } else if(password.length < 8){
        document.getElementById('loginPasswordError').innerHTML = 'Error! Password must be atleast 8 characters long.'
        valid = false;
    }

    if (isValid) {
        alert('Log in Succesful');
    }

                

    //if all validations pass,form should be submitted.
    return valid;
    
});