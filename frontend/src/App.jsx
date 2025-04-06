import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Signup from './components/signup'
import Login from './components/login'
import ForgotPassword from './components/forgotPassword'
import PdfViewerWithSummary from './components/pdfViewer';
function App() {

  return (
    <>
      <BrowserRouter>
      <Routes>
        <Route path='/signup' element={<Signup />} />
        <Route path='/login' element={<Login />} />
        <Route path='/forgotpassword' element={<ForgotPassword />} />
        <Route path='/pdfviewer' element={<PdfViewerWithSummary/>}/>
      </Routes>
      </BrowserRouter>
    </>
  )
}

export default App
