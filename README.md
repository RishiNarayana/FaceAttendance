# Face Recognition Based Attendance System

A modern, web-based application designed to streamline the traditional attendance process using AI-powered facial recognition, Role-Based Access Control (RBAC), and time-restricted attendance windows.

---

## 🚀 How to Start the Project

To run this project locally, you need to start both the **Backend** (Node.js/Express) and the **Frontend** (React) servers.

### Prerequisites
Make sure you have Node.js installed on your computer.

### 1. Start the Backend Server
The backend handles authentication, database connections (MongoDB), and email notifications.

1. Open a new terminal.
2. Navigate to the backend folder:
   ```bash
   cd backend
   ```
3. Install the required dependencies:
   ```bash
   npm install
   ```
4. Start the backend server:
   ```bash
   npm start
   ```
   *You should see "Server running" and "DB Connected" in the terminal. The backend runs on `http://localhost:5000`.*

### 2. Start the Frontend Server
The frontend is the React web application where users (Teachers and Students) interact with the system.

1. Open a **second, new terminal** window.
2. Navigate to the frontend folder:
   ```bash
   cd frontend
   ```
3. Install the required dependencies:
   ```bash
   npm install
   ```
4. Start the frontend development server:
   ```bash
   npm start
   ```
   *This will automatically launch the website in your browser at `http://localhost:3000`.*

---

## 🧪 Testing the Application Flows

Once both servers are running, you can test the system using these URLs:

* **Student Registration:** `http://localhost:3000/register`
* **First-Time Teacher Registration:** `http://localhost:3000/teacher-register`
* **Login Portal:** `http://localhost:3000/login`

### Member 1: Core System & Logic Flow
1. **Teacher Setup:** Register a new Teacher account. You will be asked to log in using an OTP sent to your email.
2. **Student Setup:** Register a new Student account. Log in using the OTP sent to your email.
3. **Class Management:** As a Teacher, go to the Dashboard, create a new Subject (e.g., "Math 101"), and add the Student's email to it.
4. **Attendance Window:** As a Teacher, set an active attendance window (Start and End times). This simulates a class period.
5. **Student View:** Log in as the Student. You will see the subject. The "Mark Attendance" button will only be **green and clickable** if the current time is within the window you set as the teacher!

*(Note: The actual face recognition step triggered by the "Mark Attendance" button is managed by Members 2 & 3.)*
