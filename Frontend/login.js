// ======================================
// Voice CRM Login
// ======================================

const loginForm = document.getElementById("loginForm");

const username = document.getElementById("username");
const password = document.getElementById("password");

const errorMessage = document.getElementById("errorMessage");


// ======================================
// Login
// ======================================

loginForm.addEventListener("submit", function(event){

    event.preventDefault();

    const user = username.value.trim().toLowerCase();
    const pass = password.value.trim();

    // Employee Login
    if(user === "employee" && pass === "1234"){

        window.location.href = "employee.html";

    }

    // Manager Login
    else if(user === "manager" && pass === "1234"){

        window.location.href = "dashboard.html";

    }

    // Invalid Credentials
    else{

        errorMessage.textContent = "Invalid Username or Password.";

    }

});