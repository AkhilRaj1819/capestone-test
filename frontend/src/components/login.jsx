import React from 'react'
import { useState } from 'react'
import axios from 'axios'

const login = () => {
  const [formData,setFormData]= useState({
    email:'',
    password:''
})

  const handelchange = (e)=>{
    const {name ,value} = e.target;
    setFormData({...formData,[name]:value})
  }
const handelSubmit= async (e)=>{
  e.preventDefault();
  try {
    const res = await axios.post('http://localhost:5000/route/login',formData);
    alert(res.data.msg)
  } catch (error) {
    console.log(error);
    alert('An error occurred. Please try again.');
  }
}
  return (
    <div>
      <h1>Login</h1>
      <form onSubmit={handelSubmit}>
        <label htmlFor="email">
          <input type="text" name='email' placeholder='email'value={formData.email} onChange={handelchange} required />
        </label>
        <label htmlFor="password">
          <input type="text" name='password' placeholder='password' value={formData.password} onChange={handelchange} required />
        </label>
        <input type="submit" />
      </form>
    </div>
  )
}

export default login
