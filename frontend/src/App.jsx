import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom"
import Home from "./pages/Home/Home"
import Login from "./pages/Login/Login"
import SignUp from "./pages/SignUp/SignUp"
import Navbar from "./components/Navbar/Navbar"
import { useEffect, useState } from "react"
import axiosInstance from "./utils/axiosInstance"

const routes = (
  <Router>
    <Routes>
      <Route path='/' exact element={<Home />} />
      <Route path='/dashboard' exact element={<Home />} />
      <Route path='/login' exact element={<Login />} />
      <Route path='/signup' exact element={<SignUp />} />
    </Routes>
  </Router>
)

function App() {
  return <>{routes}</>
}

export default App
