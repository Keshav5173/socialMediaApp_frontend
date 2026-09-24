import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom';
import { Login, Signup } from '../src/pages/authPage.jsx';
import Dashboard from './pages/dashboard.jsx';
import ProtectedRoute from './pages/procetectedRoute.jsx';
import CreatePost from './pages/createPost.jsx';


function App() {
  

  return (
    <>
      <Routes>
        <Route path='/login' element={<Login />} />
        <Route path='/' element={<Signup />} />
        
        
        <Route element={<ProtectedRoute />}>
          <Route path='/dashboard' element={<Dashboard />} />
          <Route path='/createpost' element={<CreatePost />} />
        </Route>
      </Routes>
    </>
  )
}

export default App
